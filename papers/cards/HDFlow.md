---
type: paper-card
paper_id: HDFlow
title: "HDFlow: Hierarchical Diffusion-Flow Planning for Long-horizon Tasks"
status: seed
year:
alphaxiv: https://www.alphaxiv.org/abs/2605.04525
pdf:
code:
created: 2026-07-10
---

# HDFlow: Hierarchical Diffusion-Flow Planning for Long-horizon Tasks

## Navigation
- Paper note: [HDFlow: Hierarchical Diffusion-Flow Planning for Long-horizon Tasks note](HDFlow-note.md)

## Core Insight

### 1. 根据不同时间尺度分配生成模型

论文没有让同一种模型包办全部规划：

- **高层 diffusion**：处理全局路径的多模态性，例如装配顺序、绕障方向和不同可行策略；
- **低层 rectified flow**：子目标确定后，局部轨迹条件更强、分布更窄，使用较直的 ODE transport 快速生成平滑轨迹。

这不是简单的模型拼接，而是根据两个层级面对的**不确定性结构**选择模型。论文实现中，高层 diffusion 使用约 100 个去噪步骤，低层 flow 使用约 20 个 ODE 积分步骤。

### 2. 构造适合规划的结构化潜空间世界模型

世界模型不仅要求重建和预测视觉状态，还加入了：

- 对比学习：让成功轨迹中的中间状态更接近目标、失败状态远离目标；
- inverse dynamics loss：保证潜空间保留与动作有关的信息；
- RSSM 与视觉特征：在潜空间中完成长程预测，避免直接在像素空间规划。

关键贡献不是“学一个压缩表示”，而是让潜空间同时具有**进度语义、成功语义和可控性语义**。

### 3. 将成功引导与可行性约束分开处理

高层 diffusion 使用基于成功和失败示范训练的 EBM，对候选子目标序列进行引导。但单纯沿能量梯度移动，可能得到“预测上更成功、实际上偏离数据分布”的潜状态。

论文因此加入 manifold-aware guidance：

1. 在成功轨迹中寻找当前样本的局部近邻；
2. 用局部 PCA 估计可行轨迹流形的切空间；
3. 将 EBM 的引导方向投影到该切空间中。

这个设计体现了一个重要区别：

> **价值模型回答“往哪里更容易成功”，数据流形回答“哪些方向在物理上和数据上可实现”。**

两者不能由同一个标量能量函数完全代替。

### 4. 用消融验证“混合架构”而非单纯扩大模型

在 FurnitureBench 的 lamp 任务消融中：

- flat diffusion：24% 成功率，197 ms；
- hierarchical flow：24%，53 ms；
- hierarchical diffusion：43%，142 ms；
- diffusion–flow hybrid：68%，88 ms。

这组结果说明：

- 全 flow 很快，但高层探索和多模态表达不足；
- 全 diffusion 较强，但低层反复去噪带来额外延迟；
- 混合模型在成功率与推理成本之间取得了更好的平衡。

论文还在 FurnitureBench 仿真与真机、18 个 RLBench 任务及 249 个变体、以及 OGBench 上进行了评测，表明方法不仅针对单个装配任务。





## References
- AlphaXiv: https://www.alphaxiv.org/abs/2605.04525
- PDF: 
- Code: 
