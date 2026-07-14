---
type: paper-card
paper_id: SimFoundry
title: "SimFoundry: Modular and Automated Scene Generation for Policy Learning and Evaluation"
status: seed
year: 
alphaxiv: https://www.alphaxiv.org/abs/2606.28276
pdf: 
code: 
created: 2026-07-10
---

# SimFoundry: Modular and Automated Scene Generation for Policy Learning and Evaluation

## Navigation
- Paper note: [SimFoundry: Modular and Automated Scene Generation for Policy Learning and Evaluation note](../notes/SimFoundry-note.md)

## Core Insight

这篇就是主要看看目前最好的仿真大概是什么水平



### 1. 打通完整的 Real-to-Sim-to-Real 闭环

过去的方法往往只解决其中一段：要么重建场景，要么生成训练数据，要么用仿真评测策略。SimFoundry 将它们统一起来：

> 单段 RGB 视频 → 场景理解与物体分解 → 3D mesh、位姿、关节和物理属性 → 可交互数字孪生 → 合成数据生成 → 策略评测和训练。

系统支持刚体、抽屉和柜门等 articulated objects，以及多步操作、双臂操作等复杂任务。模块化设计允许替换深度估计、分割、2D-to-3D、位姿估计和 VLM 等组件，而不必重构整个系统。

### 2. 从 Digital Twin 扩展到 Digital Cousins

论文最重要的概念不是“数字孪生”，而是 **affordance-preserving digital cousins**：保留任务相关功能，但系统性改变环境。

- **Object cousins**：改变物体形状、纹理、比例、把手结构等，但保留可抓取、可容纳等 affordance。
- **Scene cousins**：改变物体之间的语义空间关系，如 Inside、OnTop、RightOf，而非简单添加随机位置噪声。
- **Task cousins**：根据场景中的物体、机器人约束和允许的状态谓词，自动提出新的可执行任务。

因此，它是一种**语义化、结构化的 domain randomization**，比纯随机纹理或位置扰动更接近真实世界可能出现的变化。

### 3. 证明仿真可以用于真实策略的低成本筛选

在 7 个操作任务和 5 类策略上，SimFoundry 的仿真评测与真实世界结果达到：

- 平均 Pearson correlation：**0.911**
- 平均 MMRV：**0.018**
- Pearson 相比 PolaRiS 高出超过 **0.59**

这表明仿真结果能够较好地保持不同策略在真实世界中的相对排序，因此可用于模型选择、checkpoint 筛选和回归测试。

### 4. 生成的数据确实能训练可迁移的策略

只使用 SimFoundry 生成的数据训练，策略可以 zero-shot 部署到真实机器人；部分相对受控的任务达到很高成功率。加入少量真实数据进行 co-training 后，结果通常进一步改善。

论文报告，加入不同 cousins 后，平均任务成功率提升为：

- Object cousins：**17%**
- Scene cousins：**21%**
- Task cousins：**40%**

多任务 SimFoundry 数据还让通用策略在仿真中最多提升 31%，在真实世界中最多提升 18%，并在完全 held-out 的真实任务上达到 29% 成功率。

### 5. 给出了自动化程度与精度的实际权衡

全自动重建的 F1 约为 **0.81–0.92**；每个物体增加约 3 分钟人工调整后，可提高到 **0.93–0.99**。平均每个物体的自动重建时间约为 5 分钟。

这使它不仅是“完全自动”系统，也可以根据应用需求在**自动化、人工成本和精度**之间调节。





## References

- AlphaXiv: https://www.alphaxiv.org/abs/2606.28276
- PDF: 
- Code: 
