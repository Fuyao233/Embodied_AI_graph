---
type: paper-card
paper_id: DexCap
title: "DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation"
status: seed
year: 
alphaxiv: https://arxiv.org/pdf/2403.07788
pdf: 
code: 
created: 2026-07-31
---

# DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation

## Navigation
- Paper note: [DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation note](../notes/DexCap-note.md)

## Core Insight

1. **问题**：机器人要学习人类级别的灵巧操作，需要大量高质量示范；现有动作捕捉系统通常不便携、容易受遮挡影响，而人手动作也难以直接转换成机器人控制指令。
2. **DexCap**：作者提出一套便携式动作捕捉系统，同时采集手腕位姿、手指运动和三维环境信息，使人类可以在真实环境中自然完成任务并生成示范数据。
3. **DexIL**：通过逆运动学将人手动作重定向到机器人手，再利用点云观测和模仿学习训练机器人策略。执行失败时，还可以加入人类在线纠正数据进行微调。
4. **结果**：该系统在六种灵巧操作任务上取得较好效果，说明机器人可以利用在不同真实环境中采集的人类动作数据学习复杂操作。



硬件已经过时，现在有很多直接在数采的时候就限制手的动作合法，而不是 retarget 过程，比如 [DexUMI](https://arxiv.org/pdf/2505.21864) 和 [DEXOP](https://arxiv.org/pdf/2509.04441)

主要看一下人类介入的思路：

- 小幅度修正用残差
- 大幅度修正直接控制



## References
- AlphaXiv: https://arxiv.org/pdf/2403.07788
- PDF: 
- Code: 
