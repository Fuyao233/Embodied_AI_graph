---
type: paper-note
paper_id: EgoPi
created: 2026-08-24
---

# Emergence of Human to Robot Transfer in Vision-Language-Action Models Note

## Navigation
- Paper card: [Emergence of Human to Robot Transfer in Vision-Language-Action Models card](../cards/EgoPi.md)

## Reading Notes

VLA 想获得开放世界泛化能力，需要大量且多样的数据。机器人遥操作数据昂贵，而**人类视频便宜、丰富，覆盖的场景和任务远多于机器人数据**。但难点在于，人和机器人在外观、运动学、动作空间等方面差异很大，过去通常需要人为设计映射或对齐机制。

作者提出一个很简单的思路：**把 human 当成另一个 embodiment（身体/机器人形态），直接和机器人数据一起 co-training**。他们发现一个类似 LLM scaling 的现象：

> 当 VLA 在足够多样的 **scene、task、embodiment** 上进行预训练之后，human → robot transfer 才明显出现。

也就是说，重点不只是“加入更多 human video”，而是**底座 VLA 本身必须先足够 general**。在预训练规模和多样性不足时，人类数据几乎帮不上忙；当多样性达到一定程度，人类数据带来的收益突然明显增大。



**最重要的实验发现：transfer 会随预训练 diversity 出现**

作者在四种泛化 setting 中测试这种能力，覆盖：

- **Scene generalization**：机器人没见过的新 apartment；
- **Object generalization**：机器人数据中没见过的新物体类别；
- **Task generalization**：机器人数据中从未出现过的新任务语义，例如按颜色分类鸡蛋。

随着机器人预训练数据从较窄变得越来越多样，VLA 越来越能利用 human video。特别是在加入不同 robot embodiments 之后，human data 带来的提升进一步增大。

**为什么 diversity 会起作用？——representation alignment**

作者分析模型的 latent representation 后发现：

预训练不足时：

**human representation ↔ robot representation 相互分离。**

随着 scene / task / embodiment diversity 增加：

**human representation ↔ robot representation 越来越重叠、对齐。**

因此作者提出的解释是：

**diverse pretraining → 学到 embodiment-agnostic abstraction → human/robot 表示自然对齐 → human-to-robot transfer 成为可能。** 



也就是 VLA 首先经过大量预训练，然后不再把人和机器人的动作看作完全不同的分布，之后就可以从人类示范中学习知识（比如原子动作的组合、多样化的策略以及场景泛化等）



