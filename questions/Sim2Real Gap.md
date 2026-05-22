---
type: open-question
status: open
created: 2026-04-29
---

# Sim2Real Gap

## Why This Matters

Sim2Real 是机器人学习能否低成本迭代的关键瓶颈。仿真里可以快速生成大量交互数据，但控制延迟、接触误差、视觉噪声和动力学偏差会在真实部署时集中暴露。若这个 gap 无法有效压缩，仿真训练的边际价值就会被大幅削弱。

## Problem Statement

需要明确 Sim2Real gap 到底主要来自感知、动力学、任务建模，还是训练目标本身。不同方法如 domain randomization、system identification、residual learning 和 real-world finetuning 各自解决的是不同子问题。更难的是建立一种可诊断的框架，判断失败究竟是“仿真不够真”还是“策略本身不可迁移”。

## Evaluation Criteria
- 仿真中成功的策略迁移到真实机器人后，成功率、稳定性与安全性下降幅度是否可接受。
- 方法是否能指出主要误差来源，并给出可操作的修正路径，而不只是报告最终分数。
- 迁移成本是否足够低，包括额外真实数据量、调参时间与硬件依赖。

## Related Papers
- 




## Next Checks
- 
