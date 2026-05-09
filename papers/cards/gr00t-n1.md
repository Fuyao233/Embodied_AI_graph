---
type: paper-card
paper_id: gr00t-n1
title: "GR00T N1: An Open Foundation Model for Generalist Humanoid Robots"
status: seed
year:
alphaxiv: https://www.alphaxiv.org/abs/2503.14734
pdf:
code:
created: 2026-05-09
---

# GR00T-N1

## Navigation
- Paper note: [GR00T-N1 note](../notes/gr00t-n1-note.md)

## Core Insight

### 双系统架构

- **System 2（推理模块）：** 采用预训练的 **Vision-Language Model (VLM)**，以 10Hz 频率运行，负责处理环境理解和任务意图。
- **System 1（动作模块）：** 采用 **Diffusion Transformer (DiT)**，以 120Hz 频率运行，通过交叉注意力（Cross-Attention）实时查询 System 2 的特征，生成流体动力学动作。



### 数据金字塔

- **底层（规模最大）：** 互联网规模的文本、图像和人类第一视角视频（如 Ego4D），提供通用的物理常识和行为先验。
- **中层（合成增强）：** 通过物理模拟器（DexMimicGen）和 **视频生成模型** 产生的合成数据，用于扩展任务的多样性。
- **顶层（真实精准）：** 少量高质量的真实机器人示教数据（如 GR-1 遥操作数据），用于保证运动的接地性（Grounding）。



### Cross-embodiment

用embodiment-specific action tokenizer（MLP）把输入映射到相同纬度，同样会有一个detokenizer处理输出





## References

- AlphaXiv: https://www.alphaxiv.org/abs/2503.14734
- PDF: 
- Code: 
