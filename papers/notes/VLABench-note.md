---
type: paper-note
paper_id: VLABench
created: 2026-06-26
---

# VLABench: A Large-Scale Benchmark for Language-Conditioned Robotics Manipulation with Long-Horizon Reasoning Tasks Note

## Navigation
- Paper card: [VLABench: A Large-Scale Benchmark for Language-Conditioned Robotics Manipulation with Long-Horizon Reasoning Tasks card](../cards/VLABench.md)

## Reading Notes

VLABench 的动机源于认识到当前的机器人基准不足以评估现代基础模型应具备的复杂推理能力。虽然现有的基准（如 RLBench、CALVIN 和 LIBERO）提供了有价值的任务多样性，但它们在评估细致的语义理解和多步骤推理能力方面存在不足，而这些能力对于现实世界的机器人应用至关重要。

![VLABench 概览](https://paper-assets.alphaxiv.org/figures/2412.18194/x1.png)



VLABench 通过专门针对基础模型应该擅长的评估领域来解决这一差距：

- **语义理解**：处理包含隐含人类意图的自然语言指令
- **世界知识整合**：将常识推理应用于机器人任务
- **视觉场景解释**：对多样化视觉环境的鲁棒理解
- **长时程规划**：针对复杂任务序列的多步骤推理



具体例子：

**1. 语义理解 (Semantic Understanding)**

该维度考察机器人从非直接、生活化的对话中提取隐含目标的能力。

- **任务示例：取冷饮 (GetDrink)**
- **具体情景：** 用户说：“哎呀，我刚才在健身房锻炼了一小时，现在渴得要命，真想来一罐冰镇苏打水！”
- **挑战：** 指令中没有明确说“去冰箱拿可乐”，机器人必须理解“冰镇 (ice-cold)”暗示了存放位置是冰箱，而非桌子上的常温饮料。 

**2. 世界知识整合 (Common Sense & World Knowledge)**

考察机器人利用在预训练阶段学到的外部知识（如地理、文化、规则）来辅助决策的能力。

- **任务示例：插花任务 (Insert Flower)**
- **具体情景：** 指令要求：“请将**荷兰的国花**插入花瓶中。”
- **挑战：** 视觉场景中可能摆放着玫瑰、郁金香和向日葵。机器人必须具备“郁金香是荷兰国花”这一常识，才能准确选择目标物体，而这一信息并未包含在当前的视觉环境或直接指令中。 

**3. 视觉场景解释 (Visual Scene Interpretation)**

强调对复杂材质、纹理以及精细空间关系的理解。

- **任务示例：选择书籍 (PullBook)**
- **具体情景：** 指令要求：“拿出书架顶层**右数第二本**书。”
- **挑战：** 机器人需要处理复杂的层级空间关系（顶层）、相对位置（右数）和顺序计数（第二本）。这要求模型不仅能识别“书”这个类别，还要对书架的精细布局有极强的视觉解析能力。 

**4. 长时程规划 (Long-horizon Reasoning)**

考察模型将一个模糊的大目标拆解为多个逻辑关联步骤的能力。

- **任务示例：玩德州扑克 (Play Texas Hold’em)**
- **具体情景：** 场景中有几张盖着的扑克牌，用户要求：“选出桌面上最大的牌组组合。”
- **挑战：** 这是一个极其复杂的推理过程。机器人需要：
  1. 意识到当前信息不全，先去**翻开 (Flip/Twist)** 那些背面朝上的牌；
  2. 识别所有牌面数值；
  3. 利用扑克规则计算并逻辑推理出最大组合；
  4. 按顺序**抓取并放置 (Pick & Place)** 对应的牌





该基准的评估方法包括三种不同的方法：

1. **VLA泛化测试**：评估预训练或微调模型在熟悉和不熟悉的对象类别上的表现
2. **零样本迁移评估**：测试将基础模型与传统机器人组件集成的免训练工作流程
3. **综合VLM评估**：使用特定领域的语言界面和技能库评估VLM



![image-20260626151419743](/home/caiyinghao/.config/Typora/typora-user-images/image-20260626151419743.png)
