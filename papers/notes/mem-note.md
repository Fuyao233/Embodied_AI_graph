---
type: paper-note
paper_id: mem
created: 2026-05-12
---

# MEM Note

## Navigation
- Paper card: [MEM card](../cards/mem.md)



## Reading Notes



观察：机器人可能需要记住最近的观察结果来应对遮挡情况，也可能需要记住在烹饪食物时已经添加过某种食材。但这些记忆本质上是不同的：前者可能只需要在短时间内存储少量图像，而后者可能需要长期记忆，但只需要少量信息。



**短期视频记忆** 

其核心解决的是机器人**物理操作的连贯性**和**实时反馈**：

- **解决遮挡问题 ：** 当机器人的机械臂或物体自身遮挡住视觉目标时，短期记忆能让模型“记住”物体的位置和状态。
- **上下文策略调整 ：** 能够识别最近的失败尝试并调整策略。例如在抓取筷子失败后，机器人能根据前几秒的记忆调整抓取高度或力度。
- **物理动态理解：** 帮助机器人理解自身运动和环境变化的细微动态，防止在精细操作（如擦拭桌面、洗盘子）中出现动作停滞。



**长期语言记忆** 

长期记忆通过自然语言摘要的形式，捕捉跨度达 15 分钟的语义信息。其核心解决的是**任务逻辑的连贯性**：

- **多阶段任务进度跟踪：** 在烹饪或整理房间等长程任务中，机器人需要记住哪些步骤已完成，哪些尚未开始。
- **处理部分可观测性：** 记住不在当前视野内的环境状态。例如，记住刚才人把东西放进了哪个抽屉，或者记住 grocery bag 里还有多少东西没拿出来。
- **状态保持：** 记住在任务结束前需要恢复的环境状态，例如在完成厨房清洁后，记得关上之前打开的所有橱柜门或冰箱门。





### Related Work

之前处理记忆的方法：

- **循环记忆模块**
   早期方法使用 recurrent memory，但扩展能力有限。
- **输入完整历史观测**
   一些 transformer 方法直接把过去的观测历史输入模型，但这种方式计算量大、延迟高，难以支持长时程任务。
- **潜变量记忆**
   有些工作使用 latent memory，但通常只在短时程任务上验证。（MemoryVLA）
- **启发式压缩记忆**
   包括只保留 proprioception、本体感知信息、2D 点轨迹、关键帧或自然语言描述等。但这些单一模态都会损失某些关键能力：
- - 本体感知、点轨迹或语言描述会丢失精确空间信息，例如抓取角度、高度；
  - 关键帧虽然节省计算，但过度稀疏会损失对环境和机器人动态的估计能力。





**MEM 与前作的关键区别**

-  记忆载体的本质不同：

  - MemoryVLA/ReMem-VLA：它们的长短期记忆本质上都是向量（Embeddings/Queries）。向量记忆的缺点是“不可解释”且容易在长时间尺度下产生漂移（Drift）或被噪声淹没。

  -  PI 的 MEM：它将长期记忆直接推到了语言空间。语言是高度压缩且具有符号性的。一句“我已经洗完了锅”比一串 1024 维的向量更能抵抗时间带来的“记忆模糊”。 

- 处理任务的时间尺度：

  - 在 MEM 之前，大多数 VLA 所谓的“长程”其实只有几分钟（如 1-3 分钟）。
     PI 的 MEM 证明了通过文本总结作为接合面，可以将记忆维持到 15 分钟以上。在这个尺度下，传统的向量循环（Recurrence）几乎必然会崩溃，而文本总结却能像人类的“备忘录”一样稳定。 

- “接合面”的显式化

  - MemoryVLA 的结合是隐式的（库检索）。 

  -  MEM 的结合是显式的（Prompt 注入）。它将记忆变成了一种“任务指令的动态补完”。





### Method

![image-20260514140859904](D:\Embodied_AI_graph\papers\notes\mem-note.assets\image-20260514140859904.png)
$$
\pi(a_{t:t+H}, l_{t+1}, m_{t+1}\mid o_{t-T:t}, m_t, g)
\approx
\pi_{\mathrm{LL}}(a_{t:t+H}\mid o_{t-K:t}, l_{t+1}, g)
\pi_{\mathrm{HL}}(l_{t+1}, m_{t+1}\mid o_t, m_t, g),
$$

也即$\pi_{HL}$，high-level的policy，根据goal（g），当前状态和记忆输出low-level的指令。然后$\pi_{LL}$，low-level的policy，根据goal，low-level的指令和最近的历史状态输出action chunk



从形式上来看，感觉就是在pi05 subtask规划上更进一步



#### Language Memory for Long-Term Memory

$$
\begin{aligned}m_t: \text{I placed a plate in the }& \text{ cabinet and moved to the counter.}
\\
&\Downarrow
\\
m_{t+1}: \text{I placed a plate in the cabinet,} &\text{ moved to the counter, and picked up a bowl.}

\end{aligned}
$$

训练数据的获取：用现成的LLM，输入子任务标注以及是否失败的标注然后要求总结所有与未来任务相关的信息

> we pass the subtask instructions together with an indicator whether the subtask execution failed or succeeded to an offthe-shelf pre-trained language model (LLM) and ask it to summarize all information from the previous subtasks that is still relevant for future task execution

生成的时候注意要压缩：

- 保持简洁，减少推理时间
- 减少训练-推理偏移





#### Video Encoder for Dense Short-Term Visual Memory

根据之前的研究（如RTC），推理一个action chunk的时间最好不要超过300ms，否则机器人会出现严重的滞后

![image-20260513104148747](D:\Embodied_AI_graph\papers\notes\mem-note.assets\image-20260513104148747.png)

引入temporal attention，每隔四层在同 patch 不同时刻进行时序注意力计算，最后取当前时刻帧



这个temporal attention直接在已经嵌入的QKV空间中做，直接加因果掩码然后计算注意力分数加权（不得不再次感叹注意力机制的强大）



伪代码

```
# conceptual only
x = patchify(video_frames)      # [B, T, N, D]

for layer_id, layer in enumerate(vit_layers):
    x = spatial_attention(x)    # per frame: [B, T, N, D]

    if layer_id % 4 == 0:
        x = temporal_attention(x)  # per patch across time
```





一般选取T=6，包括当前帧和过去5个observation。后训练时可以扩展到18帧，54s

