---
type: paper-card
paper_id: Xperience-10M
title: "Xperience-10M"
status: seed
year: 
alphaxiv: https://huggingface.co/datasets/ropedia-ai/xperience-10m
pdf: 
code: 
created: 2026-07-22
---

# Xperience-10M

## Navigation
- Paper note: [Xperience-10M note](../notes/Xperience-10M-note.md)

## Core Insight

Xperience-10M由具身智能数据公司 **Ropedia** 于2026年3月发布。官方称其包含 **1000万段人类交互、10000小时同步第一视角记录**，总规模约 **1 PB**。数据并非只有视频，而是尝试把视觉、空间结构、人体动作和语言组织成统一的时间序列。

### 数据模态

每个 episode 最多包含：

- 4路鱼眼视频；
- 2路校正后的双目视频；
- 同步音频；
- 双目深度及置信度；
- SLAM相机轨迹和点云；
- 双手三维动作捕捉，包括MANO参数；
- 全身动作捕捉和接触状态；
- IMU加速度计、陀螺仪数据；
- task → subtask → action → interaction → object 分层英文文本标注。

官方公布的总体统计包括：

| 指标            | 官方数据  |
| --------------- | --------- |
| 人类交互片段    | 1000万    |
| 视频时长        | 10000小时 |
| RGB帧           | 28.8亿    |
| 深度帧          | 7.2亿     |
| 相机位姿/动捕帧 | 各5.76亿  |
| IMU采样         | 72亿      |
| 文本句子        | 1600万    |
| 涉及对象        | 约35万    |
| 完整数据规模    | 约1 PB    |



## References
- AlphaXiv: https://huggingface.co/datasets/ropedia-ai/xperience-10m
- PDF: 
- Code: 
