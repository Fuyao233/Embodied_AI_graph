---
type: open-question
status: open
created: 2026-04-29
---

# Generalization

## Why This Matters

Generalization 决定机器人是否能从“会做训练集任务”走向“在开放世界中稳定完成新任务”。Embodied AI 的真实价值不在单点演示，而在面对新物体、新场景、新指令时仍保持可预期行为。没有足够的泛化能力，系统只能停留在高成本定制阶段。

## Problem Statement

需要区分不同层面的泛化：对象泛化、场景泛化、动作组合泛化、语言泛化与 embodiment 泛化。很多结果只是在相近分布上做插值，而不是面对真正的 out-of-distribution 挑战。问题在于如何构造训练机制与评测协议，证明模型学到的是可迁移结构，而不是数据集偏置。

## Evaluation Criteria
- 在未见过的物体、布局、指令表达和任务组合上，性能是否保持稳定。
- 评测设置是否能区分插值式泛化与真正的 distribution shift 下泛化。
- 泛化提升是否伴随可解释的机制，例如表示学习、世界建模或动作分解能力增强。

## Related Papers
- [GR00T_N1](../papers/cards/gr00t-n1.md)：用embodiment-specific action tokenizer能够使得不同本体共用同一backbone

## Next Checks
- 
