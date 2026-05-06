---
type: open-question
status: open
created: 2026-04-29
---

# Continual learning

## Why This Matters

真实机器人不可能只训练一次然后永远不变，Continual learning 是长期部署的基础能力。机器人需要在引入新任务、新环境和新工具时继续学习，同时保留旧技能。若每次更新都造成灾难性遗忘，系统维护成本会迅速失控。

## Problem Statement

核心难点是如何在不断吸收新经验时避免 catastrophic forgetting，并控制数据回放、模型扩展和在线微调的成本。机器人场景还比标准 continual benchmarks 更复杂，因为采样昂贵、反馈稀疏、错误代价高。另一个问题是如何判断模型变好的是局部能力，还是整体能力谱真正扩展。

## Evaluation Criteria
- 学到新任务后，旧任务性能下降是否可控，并能在多轮更新后保持稳定。
- 方法是否适合真实机器人约束，包括有限存储、有限回放预算与安全更新要求。
- 评测是否覆盖 forward transfer、backward transfer 与长期部署稳定性。

## Related Papers
- [PI0.6 card](../papers/cards/pi06.md): 利用部署经验训练value model进而改进策略，持续提升策略表现（Recap）

## Next Checks
- 
