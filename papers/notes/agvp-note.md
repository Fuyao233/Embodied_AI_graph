---
type: paper-note
paper_id: agvp
created: 2026-05-13
---

# AGVP Note

## Navigation
- Paper card: [AGVP card](../cards/agvp.md)

## Reading Notes



本文关注到浅层VLA对图像中的任务相关位置关注度而高层VLA则趋向模糊，所以提出用AGVP（Action-Guided Visual Prunin）模块作为路由，对从DINO v3中提取的特征进行选择，然后通过share attention的结构让高层VLA看到并做决策





## ROI 实验

浅层 VLA 中 **action tokens 到 visual tokens 的 attention** 来识别 ROI visual tokens。发现底层VLA对于任务相关的物体关注度高，但是高层VLA则因为要生成动作更偏向整合后的任务语义和动作意图，suo'yi'dui关注度不够

![image-20260513160137906](D:\Embodied_AI_graph\papers\notes\agvp-note.assets\image-20260513160137906.png)



## 模型架构

![image-20260513155957965](D:\Embodied_AI_graph\papers\notes\agvp-note.assets\image-20260513155957965.png)











## Experimental Insights

消融实验表明选取DINO v3的最后 16 层效果最好，因为浅层特征更多是低级的纹理信息，无法为复杂的机器人动作生成提供足够的语义支持



| 特征选择策略   | 成功率 (Success Rate) |
| :------------- | :-------------------- |
| **最后 16 层** | **88.0%** (最佳)      |
| 均匀采样 16 层 | 85.0%                 |
| 前 16 层       | 61.5%                 |
