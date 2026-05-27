---
type: open-question
status: open
created: 2026-04-29
---

# Continual learning

## Why This Matters

真实机器人不可能只训练一次然后永远不变，Continual learning 是长期部署的基础能力。机器人需要在引入新任务、新环境和新工具时继续学习，同时保留旧技能。若每次更新都造成灾难性遗忘，系统维护成本会迅速失控。

## SubProblem

**Memory**：
- 机器人如何利用历史经验；
- 如何记住任务进度、失败尝试、物体状态；
- 如何跨时间更新知识；
- 如何避免遗忘；
- 如何从过去 rollout 中改善当前决策；
- 是否能实现 episode 内或跨 episode 的持续适应。

open questions:
- 更长期：cross episode; cross day/week，长期记忆
- 记忆的幻觉纠错
- 记忆压缩，边缘记忆


## Related Papers

- [PI0.6 card](../papers/cards/pi06.md): 利用部署经验训练value model进而改进策略，持续提升策略表现（Recap）
 
 **Memory: 
- [MEM](../papers/cards/pi-MEM.md): 在双尺度记忆的框架下为长短期记忆找到了合适的模态——视频编码承载短程，文本总结承载长程
- [RMBench](../papers/cards/RMBench.md)：用多阶段关键帧储存长期记忆，以最近观测以及当前阶段起始帧作为短期记忆信息，类GR00T-N1的交互方式

