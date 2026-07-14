---
type: paper-card
paper_id: ASPIRE
title: "ASPIRE: Agentic /Skills Discovery for Robotics"
status: seed
year: 
alphaxiv: https://www.alphaxiv.org/abs/2607.00272
pdf: 
code: 
created: 2026-07-10
---

# ASPIRE: Agentic /Skills Discovery for Robotics

## Navigation
- Paper note: [ASPIRE: Agentic /Skills Discovery for Robotics note](../notes/ASPIRE-note.md)

## Core Insight

### 1. Robot Execution Engine：让机器人程序变得可调试

执行引擎不只返回最终成功或失败，而是记录每一个 primitive 调用的：

- API 名称、输入和输出；
- 返回状态和错误信息；
- RGB 关键帧与视觉 overlay；
- 目标位置、抓取候选；
- 运动轨迹、碰撞及规划结果。

它不会简单地把整段视频塞进上下文，而是保留每次 primitive 调用前后的关键证据，让 Agent 能沿着程序调用链定位真正的失败模块。

例如，论文中的机器人虽然成功检测到了收音机，却始终无法靠近。执行 trace 表明错误来自 `navigate_to_pose`：目标位置落在桌子的碰撞缓冲区内，而不是感知或抓取失败。Agent 随后生成“从多个角度尝试接近目标”的修复代码，并通过重新执行验证修复有效。

### 2. Skill Library：保存“修 bug 的知识”，而不是保存完整任务

ASPIRE 不直接把整个任务程序存入记忆库，而是把经过验证的修复提炼为较抽象的 skill。每个 skill 通常包含：

- failure signature：什么错误现象会触发它；
- applicability condition：什么情况下适用；
- repair strategy：应采取什么修复；
- 可选的代码示例。

例如，上述收音机任务最终存储的不是“如何抓取收音机”，而是：

> 当目标附近的导航点不断触发碰撞规划错误时，围绕目标旋转接近方向，寻找可达的一侧。

因此，skill library 中可以同时包含目标消歧、感知 prompt、抓取约束、导航恢复、运动 primitive、场景理解和调试流程等异质知识。只有在多个 debug configuration 上验证有效、且被 coordinator 判定为可复用的修复才会进入库中。

### 3. Evolutionary Search：避免陷入同一种修复思路

单线程 self-debugging 很容易形成局部循环：Agent 不断微调同一种失败方案。

ASPIRE 因而让 Agent 每轮生成多个候选程序，分别执行并获得 trace；下一轮根据表现较好的程序及其剩余失败模式继续生成新候选。这相当于对**可执行机器人程序本身进行进化搜索**，而不是只修改自然语言计划。

整体上采用 coordinator–actor 架构：不同 actor 可以并行调试不同任务，但它们不交换完整对话和原始轨迹，只通过共享 skill library 交换压缩后的经验，从而减少上下文污染。



### 主要贡献

#### 贡献一：将机器人执行过程变成了类似软件日志的“可诊断系统”

论文最重要的贡献未必是使用了更强的 LLM，而是构造了一个适合 Agent 调试的执行环境。

消融实验非常说明问题：没有 execution engine 和 evolutionary search 时，LIBERO-Pro 平均成功率约为 14%；加入细粒度 execution engine 后提升到 62%；再加入进化搜索后达到 72%。也就是说，**最大的性能增益来自可观测、可归因、可复现的执行反馈，而不是更复杂的搜索算法。**

#### 贡献二：提出 failure-derived skill，而非 success-only memory

很多 Agent memory 系统保存的是成功轨迹、文字反思或完整解决方案。ASPIRE 保存的则是：

> 某种具体现实失败为何发生，以及经过执行验证后应该怎样修复。

这种表示比完整任务程序更加模块化，也更容易跨物体、任务和机器人形态复用。

#### 贡献三：展示了不更新模型权重的持续学习路径

ASPIRE 使用冻结的 LLM，持续学习主要发生在三个外部空间中：

- 可执行程序；
- 调试与搜索过程；
- 不断增长的 skill library。

因此，这项工作展示了一种“系统层面的 continual learning”：不依赖在线微调神经网络，而是通过外部记忆与闭环验证积累能力。这是基于论文设计可以得到的一个重要推论。

#### 贡献四：在多类机器人任务上证明经验可以复利

在论文的实验设置中：

- LIBERO-Pro 扰动任务中，相对最强基线最高提升约 77 个百分点；
- Robosuite 双臂 handover 从 20% 提升至 92%；
- BEHAVIOR-1K 的导航并抓取收音机任务从 56% 提升至 88%。

在 LIBERO-Pro Long 的零样本测试中，系统不进行额外调试或重试，仅利用从 LIBERO-90 累积的 skill library，位置扰动成功率达到 23%，任务语言扰动达到 38%，平均约 31%；而论文报告的既有方法约为 4%。实验还显示，随着 skill library 从 0、25、50 增长到 90 个源任务，零样本性能总体随之提高。

#### 贡献五：提出了更实用的 sim-to-real 转移方式

这里的 sim-to-real **不是把仿真策略直接部署到真实机器人上**，而是把仿真中发现的调试经验作为 in-context guidance，帮助真实机器人 Agent 更快写出适配真实 API 和 embodiment 的程序。

例如：

- 汽水罐抓取的总 token 消耗从 61.94M 降至 6.58M，成功率从 13/20 提升至 19/20；
- 抽屉任务从无 skill 时的 0/20，提升至有 skill 时的 11/20，总 token 从约 334.9M 降至 81.67M。

这说明可迁移的可能不是具体控制代码，而是“如何处理某类物理失败”的结构化先验。

------

### 最值得关注的 insights

#### 1. 机器人 Agent 的瓶颈可能首先是 observability，而不是 reasoning

如果系统只提供最终 reward，即使 LLM 很强，也很难判断应该修改哪一段程序。实验中 execution engine 带来的增益远大于 evolutionary search，说明提高执行过程的可观测性、错误归因能力和验证能力，可能比单纯扩大模型或增加思维链更关键。

#### 2. 失败可能比成功轨迹包含更多可复用知识

成功轨迹只能告诉系统“这样做有效”，而结构化失败能告诉系统：

- 哪些条件会导致某个策略失效；
- 应该检查哪个子系统；
- 哪种替代方案可能有效；
- 修复的适用边界是什么。

ASPIRE 的 skill 本质上更接近机器人领域的 **debugging pattern、异常处理规则和设计模式**，而不只是动作 primitive。

#### 3. 真正可迁移的是策略背后的因果结构

“旋转接近方向避开碰撞区”在不同物体、机器人和 API 上都可能成立；但具体的关节轨迹或函数调用往往无法直接迁移。

这解释了为什么抽象的 failure condition + repair strategy 能跨 embodiment 转移，而模拟器代码本身不能。ASPIRE 的实机实验支持这一点，但目前只覆盖三个 skill，因此仍属于初步证据。

#### 4. Agent 的长期能力取决于“记忆治理”，而不仅是记忆数量

Skill library 越大总体上越有帮助，但论文也明确指出，随着库不断增长，skill 可能变得：

- 过时；
- 重复；
- 过度具体；
- 检索错误；
- 对新任务产生误导。

因此，未来关键问题会从“能不能记录经验”，转向“如何检索、排序、合并、淘汰和重新验证经验”。

#### 5. 这是一套强系统，而不是通用机器人智能已经被解决

ASPIRE 依赖预定义的感知、规划和控制 primitive，以及具备百万 token 上下文的前沿 LLM；如果任务超出 API 可表达的能力，Agent 仍然无法自行完成。真实环境中的自动成功判断、安全重置、长期校准和监控也尚未闭环，同时搜索过程需要大量 LLM 调用和机器人 rollout。

因此，其结果更应该理解为：**在机器人基础设施足够模块化、可执行、可观测的条件下，Coding Agent 可以显著减少人工编程和重复调试成本。**



agentic robotics 还是需要在基模的这些能力足够的情况下才能得到落地



## References
- AlphaXiv: https://www.alphaxiv.org/abs/2607.00272
- PDF: 
- Code: 
