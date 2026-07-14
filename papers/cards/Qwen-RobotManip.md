---
type: paper-card
paper_id: Qwen-RobotManip
title: "RoboManipBaselines: A Unified Framework for Imitation Learning in Robotic Manipulation across Real and Simulation Environments"
status: seed
year: 
alphaxiv: https://www.alphaxiv.org/abs/2606.17846
pdf: 
code: 
created: 2026-07-08
---

# RoboManipBaselines: A Unified Framework for Imitation Learning in Robotic Manipulation across Real and Simulation Environments

## Navigation
- Paper note: [RoboManipBaselines: A Unified Framework for Imitation Learning in Robotic Manipulation across Real and Simulation Environments note](../notes/Qwen-RobotManip-note.md)

## Core Insight

**Representation Alignment：表示对齐**

表示它把不同机器人的状态和动作统一到一个 **canonical state/action vector** 里面。

也就是：
 不管是单臂、双臂、夹爪还是灵巧手，都尽量映射到同一个统一向量空间。没有的维度用 mask 或空位处理。

目的：
 **让不同机器人数据可以放进同一个模型训练。**



**Motion Alignment：运动对齐**

这表示它不直接用机器人自身 base frame 下的动作，而是尽量把末端执行器运动表示到**相机坐标系**里。

原因是：
 不同机器人 base frame 不同，但如果相机看到的操作类似，那么在相机坐标系下，动作模式会更一致。

例如“向杯子靠近”：

- 在机器人 A 的 base frame 里可能是 $+x$
- 在机器人 B 的 base frame 里可能是 $-y$
- 但在相机视角下，视觉运动关系更容易对齐

目的：
 **减少不同机器人坐标系带来的动作冲突。**



**Behavior Alignment：行为对齐**

图中输入 token 被分成三段：

| 输入段        | 含义                                     |
| ------------- | ---------------------------------------- |
| Vision        | 当前图像/视频观测                        |
| System Prompt | 告诉模型当前机器人类型、任务、控制方式等 |
| State Context | 最近的状态-动作历史                      |



这表示模型不仅看当前图片，还会看：

- 当前是什么机器人
- 当前任务是什么
- 最近几步机器人是怎么动的
- 这个 embodiment 的行为习惯是什么

目的：
 **让同一个模型能根据上下文适配不同机器人。**



## References
- AlphaXiv: https://www.alphaxiv.org/abs/2606.17846
- PDF: 
- Code: 
