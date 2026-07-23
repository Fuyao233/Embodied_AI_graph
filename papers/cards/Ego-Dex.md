---
type: paper-card
paper_id: Ego-Dex
title: "EGODEX: LEARNING DEXTEROUS MANIPULATION FROM LARGE-SCALE EGOCENTRIC VIDEO"
status: seed
year: 
alphaxiv: https://arxiv.org/pdf/2505.11709
pdf: 
code: 
created: 2026-07-22
---

# EGODEX: LEARNING DEXTEROUS MANIPULATION FROM LARGE-SCALE EGOCENTRIC VIDEO

## Navigation
- Paper note: [EGODEX: LEARNING DEXTEROUS MANIPULATION FROM LARGE-SCALE EGOCENTRIC VIDEO note](../notes/Ego-Dex-note.md)

## Core Insight

EgoDex由Apple研究团队提出，并发表于ICLR相关研究渠道。它使用 **Apple Vision Pro和ARKit** 采集，核心目标是解决“人类第一视角视频缺少高质量三维手指运动标注”的问题。

### 数据规模

EgoDex包含：

- **829小时**第一视角视频；
- **338,000个操作episode**；
- **194类桌面操作任务**；
- **9000万帧**；
- 1080p、30 Hz；
- 论文所述完整磁盘规模约 **2 TB**。

任务包括系鞋带、折衣服、拧瓶盖、插拔USB、拼装积木、洗碗、整理棋盘、装配家具等。它几乎全部是主动手物交互，而不是普通生活记录。

### 标注内容

每帧主要提供：

- RGB第一视角视频；
- 相机内参和随时间变化的外参；
- 头部、肩、手臂等上半身关节；
- 每只手25个关节的三维位置和方向；
- 每个关节的ARKit置信度；
- 操作任务的自然语言描述。

文本并非全部直接人工精写：采集者先填写任务、对象和环境信息，再由GPT-4整合成详细自然语言描述。这一点在训练语言条件策略时需要注意潜在的模板化和模型生成偏差。

数据按任务文件夹组织，每个视频对应一个HDF5文件。所有关节都是SE(3)变换，并表达在每次采集开始时建立的ARKit世界坐标系中；不同episode的世界坐标原点不保证一致。

### 



## References
- AlphaXiv: https://arxiv.org/pdf/2505.11709
- PDF: 
- Code: 
