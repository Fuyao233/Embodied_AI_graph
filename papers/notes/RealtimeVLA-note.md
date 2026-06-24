---
type: paper-note
paper_id: RealtimeVLA
created: 2026-05-29
---

# Running VLAs at Real-time Speed Note

## Navigation
- Paper card: [Running VLAs at Real-time Speed card](../cards/RealtimeVLA.md)

## Reading Notes



### 概览

**问题：**同一个 VLA policy，为什么 PyTorch/JAX 跑起来是 50–100ms，手工推理栈能跑到 20–30ms？

**解决方案**：性能增益来自 inference pipeline 工程，包括 CUDA Graph 去 CPU overhead、计算图变换减少 MAC 或 kernel launch、重排内存和 tensor 操作来提高并行度，最终做到 30 FPS 级实时控制



核心是优化**核函数启动开销**

名词解释：

| 名词             | 你需要知道的意思                                          |
| ---------------- | --------------------------------------------------------- |
| kernel           | GPU 上执行的一个小计算程序                                |
| kernel launch    | CPU 发命令让 GPU 执行一个 kernel                          |
| launch overhead  | 发命令本身的固定开销，操作越碎越明显                      |
| CUDA Graph       | 把一串 GPU 操作录下来，以后直接重放，减少 Python/CPU 调度 |
| static shape     | 输入尺寸固定，方便 CUDA Graph 和 kernel 优化              |
| kernel fusion    | 把多个小操作合成一个 GPU kernel，少读写、少 launch        |
| memory bandwidth | 显存搬运速度；有时瓶颈不是算力而是搬数据                  |
| synchronization  | CPU/GPU 被迫互相等待，实时系统里很讨厌                    |
| preallocation    | 提前分配 buffer，避免每帧动态申请内存                     |
| ring buffer      | 保留最新数据，旧数据覆盖，避免处理过期帧                  |



用起来的话就是直接把他们优化后的forward当一个整体用

```python
infer = Pi0Inference(...)
actions = infer.forward(images, state, noise)
```





不过这种底层优化比较受特定架构和GPU的局限，本文是pi0+RTX 4090，

| 你换了什么                                                  | 是否要重新优化           | 说明                                                         |
| ----------------------------------------------------------- | ------------------------ | ------------------------------------------------------------ |
| 同一个模型结构，只换 finetuned checkpoint                   | **基本不用**             | 计算图、shape、kernel 都一样，只要 checkpoint 权重能转进去   |
| Pi0 → 另一个 Pi0，同样 view/chunk/prompt 长度               | **基本不用**             | 主要做数值一致性测试和 latency benchmark                     |
| Pi0 → Pi05 / DM0                                            | **部分需要**             | Realtime-VLA repo 已经给 Pi0、Pi05、DM0 的加速推理文件，但不同模型仍有不同 forward 接口和转换逻辑；官方 repo 说明它提供的是 Pi0/Pi05 等模型的 accelerated inference kernels。([GitHub](https://github.com/dexmal/realtime-vla?utm_source=chatgpt.com)) |
| Pi0 → 自己改过 hidden size / action dim / chunk size 的模型 | **中等工作量**           | 很多静态 shape、buffer、kernel 参数要重新检查，可能不用改 CUDA，但要重新 benchmark |
| Pi0 → 完全不同 VLA 架构                                     | **大概率要重做优化**     | 计算图变了，QKV fusion、RMSNorm folding、Triton kernel、CUDA Graph 捕获都可能不再适用 |
| Flow/diffusion VLA → autoregressive VLA                     | **基本是另一套优化问题** | bottleneck 从 action expert denoising/flow steps 变成 token-by-token decoding 或 action tokenizer decoding |





### 关键创新 & 工程细节

1. 证明了在 VLM 跑 30Hz 的同时，action expert 能够以 480Hz 高频推理（仅仅只用 4090）（具体实现是保持 prefix 不变、改变 suffix 输入到 AE），表明 action expert 有潜力承担高频 trajectory update。

2. 工程实证：π0-level、多视角、十亿参数级 VLA 并不必然需要云端 GPU 或高端服务器集群才能实时运行。下面是在单张 RTX 4090 的报告：

   | 设置    | Naive PyTorch | OpenPI/JAX | Realtime-VLA |
   | ------- | ------------: | ---------: | -----------: |
   | 1 view  |      105.0 ms |    43.8 ms |  **20.0 ms** |
   | 2 views |      106.5 ms |    53.7 ms |  **27.3 ms** |
   | 3 views |      113.9 ms |    67.6 ms |  **36.8 ms** |

3. 应用验证：用 falling pen 证明低延迟 VLA 能处理高动态真实任务




**工程细节：**

1. CUDA Graph：冻结 Python / CPU 调度开销：把完整 forward 的 CUDA kernel 调用链录制下来，推理时直接 replay，避免 Python 一行行 launch kernel。由于 π₀ 推理中 kernel 数量超过千级，这一步直接砍掉大部分 CPU overhead，带来约 2× 加速。

2. 计算图等价化简：减少冗余计算。包括 RMSNorm affine folding、action-time encoder folding、QKV fusion、RoPE precompute / fusion。核心原则是：不改模型输出，只把计算表达改写成更适合 GPU 的形式。该部分带来约 7–8ms 收益。

3. Operator / Kernel Fusion：减少小算子、少读写显存。把 bias、residual、activation、RMSNorm scalar ops、gated FFN 等尽量融合进 GEMM 或单个 kernel，避免每一步都读写显存和 launch 新 kernel。

4. Triton 特化 kernel：针对 π₀ shape 调 GEMM。用 Triton 针对 π₀ 的矩阵尺寸手动调 tile、融合 gated FFN、处理特殊 GEMM shape。它不是通用加速器，而是固定模型和固定 shape 下的专用优化。

5. 静态 shape 与静态 buffer：让 CUDA Graph 和 kernel 特化成立。固定 num_views、image resolution、prompt length、chunk size、batch size、buffer pointer，避免动态分支。这是实时推理稳定、低 jitter 的基础。

6. 端到端 I/O pipeline 优化：包括图像 resize、pinned memory、static CPU buffer、zero-copy camera frame 等。论文明确指出这些对端到端实时系统很关键。

7. VLM / AE 并发执行：支撑 Full Streaming Inference。利用 VLM compute-bound、AE IO-bound 的互补性，用并发 CUDA streams 让 AE 在 VLM 运行时也工作，从而支持 30Hz VLM + 最高 480Hz AE 的多频结构。

