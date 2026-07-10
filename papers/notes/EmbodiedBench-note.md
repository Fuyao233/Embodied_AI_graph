---
type: paper-note
paper_id: EmbodiedBench
created: 2026-07-08
---

# EMBODIEDBENCH: Comprehensive Benchmarking Multi-modal Large Language Models for Vision-Driven Embodied Agents Note

## Navigation
- Paper card: [EMBODIEDBENCH: Comprehensive Benchmarking Multi-modal Large Language Models for Vision-Driven Embodied Agents card](../cards/EmbodiedBench.md)

## Reading Notes



![image-20260708142937033](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/EmbodiedBench-note.assets/image-20260708142937033.png)

EmbodiedBench 包含 **1,128 个测试任务、4 个环境**，覆盖从 high-level semantic tasks 到 low-level navigation/manipulation；同时构造 **6 个能力子集**，评估 common sense、complex instruction、spatial awareness、visual perception、long-term planning 等能力

左边主要在讲 **benchmark 覆盖什么样的 embodied tasks**：

```
EB-ALFRED        高层家居任务
EB-Habitat       高层物体重排
EB-Navigation    低层视觉导航
EB-Manipulation  低层机械臂操作
```

能力：

| Subset                  | 测试点            | 样例                                                         |
| ----------------------- | ----------------- | ------------------------------------------------------------ |
| **Base**                | 基础任务解决      | “把洗过的生菜放进冰箱。”                                     |
| **Common Sense**        | 常识推理          | “把洗过的绿叶蔬菜放进一个能让它保鲜好几天的容器。”这里要推理出冰箱。 |
| **Complex Instruction** | 复杂/冗余指令理解 | “为了保持新鲜，把洗过的生菜放进冰箱。这样之后做菜会更方便……”模型要从长文本中抓核心任务。 |
| **Spatial Awareness**   | 空间关系理解      | “把左边的物体放进前面的容器。”                               |
| **Visual Appearance**   | 视觉外观识别      | “找到一个矩形、黄色、表面柔软光滑的物体。”                   |
| **Long Horizon**        | 长程规划          | “拿起刀，切苹果，把刀放进碗里，把苹果片用微波炉加热，再把苹果片放到桌上。” |



评测流程：

![image-20260708143118958](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/EmbodiedBench-note.assets/image-20260708143118958.png)

是一个循环：环境给观察和反馈 → 模型生成计划 → 环境执行 → 返回新观察、反馈和历史 → 模型继续规划

| 输入模块                                 | 含义                                   |
| ---------------------------------------- | -------------------------------------- |
| General Information                      | 当前视觉观察、用户任务指令             |
| Task-Specific Information                | 技能集合、动作格式、物体位置、检测框等 |
| In-context Demonstrations with Reasoning | 带推理过程的 few-shot 示例             |
| Environment Feedback                     | 上一步动作是否成功、碰撞、非法动作等   |
| Interaction History                      | 历史交互信息                           |
| Output Action History                    | 已经输出过的动作序列                   |





测试结论：

**第一，MLLM 在高层任务上明显更强。**
 比如 EB-ALFRED 和 EB-Habitat 这种 household planning / rearrangement 任务，模型只需要选择高层技能，例如 find、pick、open、place。Claude-3.5-Sonnet 在 EB-ALFRED 达到 **64.0%**，在 EB-Habitat 达到 **68.0%**，是闭源模型里高层任务平均表现最好的。

**第二，MLLM 在低层任务上仍然很弱，尤其是机械臂操作。**
 EB-Navigation 还相对可做，GPT-4o 达到 **57.7%**；但 EB-Manipulation 中，即使最好的 GPT-4o 平均成功率也只有 **28.9%**。论文把这点作为最主要发现之一：当前 MLLM “excel at high-level tasks but struggle with low-level tasks, especially EB-Manipulation”。

**第三，长程规划是当前模型的共性瓶颈。**
 例如 EB-Habitat 中，Claude-3.5-Sonnet 的 Base 子集是 **96%**，但 Long-Horizon 降到 **58%**；GPT-4o 也从 Base 的 **86%** 降到 Long-Horizon 的 **64%**。论文明确说 long-horizon planning 是最难的 subset。

**第四，视觉输入在低层任务中很关键，但在高层任务中的作用没有想象中大。**
 去掉视觉后，GPT-4o 在 EB-Navigation 从 **57.7%** 掉到 **17.4%**，Long-Horizon 导航直接掉到 **0%**；但在 EB-ALFRED / EB-Habitat 这类高层任务中，语言版 GPT-4o 有时与视觉版相当甚至更好，说明这些高层任务可能更多依赖文本信息、action set 和环境反馈。

