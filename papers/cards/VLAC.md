---
type: paper-card
paper_id: VLAC
title: "VLAC: A Vision-Language-Action-Critic Model for Robotic Real-World Reinforcement Learning"
status: seed
year: 
alphaxiv: https://github.com/InternRobotics/VLAC-cut
pdf: 
code: 
created: 2026-08-08
---

# VLAC: A Vision-Language-Action-Critic Model for Robotic Real-World Reinforcement Learning

## Navigation
- Paper note: [VLAC: A Vision-Language-Action-Critic Model for Robotic Real-World Reinforcement Learning note](../notes/VLAC-note.md)

## Core Insight

### 数据规模

官方公布的规模大致是：

| 数据                  | Records | Episodes | Tasks  | 标注关键帧 |
| --------------------- | ------- | -------- | ------ | ---------- |
| 完整标注集            | 35,230  | 26,615   | 15,206 | 464,446    |
| 筛选后的 Train + Eval | 28,167  | 22,978   | 15,206 | 375,172    |

所以规模比较大的地方不是 task 数本身，而是大量机器人轨迹 + 时间维度上的进度标注。

### 每条数据有什么

一条 record 基本可以理解成：

任务文本 + 一段机器人视频/帧序列 + 随时间变化的 progress + 关键语义事件。

官方 JSON 里主要有：

- global_episode_id：轨迹 ID

- metadata
- task instruction
- task description
- 数据来源、episode 信息等
- frame_index：视频帧路径
- dense_kinematic_progress：随时间变化的 dense progress
- semantic_anchors：人工标出的关键事件

其中 semantic_anchors 很有价值。关键帧除了 human_annotated_progress，还会包含类似：

- action_description：机器人当前在做什么

- state_description：当前物体/机械臂状态
- progress_explanation：为什么当前是这个进度
- error/success analysis
- correction plan 等信息

例如官方展示的任务就包括“把药瓶放进电饭锅内胆里”“把辣椒夹起来放进盘子里”之类的 manipulation task。

也就是说，它不是简单的：

video → success / failure

而更接近：

video + instruction → 0 → 20 → 50 → 30 → 60 → 100

这里进度允许下降。这点是 VLAC-Cut 最核心的特征之一。

### 数据怎么切分

官方 Benchmark 有 5 个主要 split：

| Split             | Records | Episodes |
| ----------------- | ------- | -------- |
| Train             | 24,652  | 20,479   |
| Expert seen       | 1,043   | 1,033    |
| Expert unseen     | 1,043   | 1,035    |
| Non-expert seen   | 713     | 706      |
| Non-expert unseen | 716     | 706      |

这里测试集主要沿两个维度拆：

- seen / unseen：测试任务的 semantic task unit 是否在训练中出现过。

- expert / non-expert：用于区分正常执行轨迹和包含更复杂进度变化、尤其是 regression 的轨迹。官方明确把是否存在 regressive progress transition 作为划分轴之一。


另外，同一次真实执行产生的不同视角不会被拆到不同 split，避免 train-test leakage。



## References
- AlphaXiv: https://github.com/InternRobotics/VLAC-cut
- PDF: 
- Code: 
