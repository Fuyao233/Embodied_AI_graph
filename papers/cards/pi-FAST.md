---
type: paper-card
paper_id: pi-FAST
title: "FAST: Efficient Action Tokenization for Vision-Language-Action Models"
status: seed
year: 
alphaxiv: https://www.alphaxiv.org/abs/2501.09747
pdf: 
code: 
created: 2026-06-26
---

# FAST: Efficient Action Tokenization for Vision-Language-Action Models

## Navigation
- Paper note: [FAST: Efficient Action Tokenization for Vision-Language-Action Models note](../notes/pi-FAST-note.md)

## Core Insight
-
在高频控制（如 50Hz）下，相邻时间步之间的动作变化极小，导致动作标记（Tokens）高度相关 由于边际信息量趋于零，自回归模型的“预测下一个标记”任务变得过于简单（模型只需学会简单的“复制”），这会导致训练陷入局部最优，无法捕捉复杂的动作细节

为了解决冗余问题，作者提出 **FAST** (Frequency-space Action Sequence Tokenization)，其核心步骤如下：

- **离散余弦变换 (DCT)：** 将动作信号从时域转换到频域。由于大多数机器人动作是平滑的，信号的能量会集中在少数低频系数中。
- **字节对编码 (BPE)：** 借鉴自然语言处理的方法，将量化后的 DCT 系数（其中包含大量零）进一步压缩为稠密的 Token。
- **优势：** 这种方案能大幅减少动作序列的 Token 长度（例如在 50Hz 任务中压缩率达 13.2x），同时保留关键的动作形状信息。

## References
- AlphaXiv: https://www.alphaxiv.org/abs/2501.09747
- PDF: 
- Code: 
