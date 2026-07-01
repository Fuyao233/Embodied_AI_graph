---
type: paper-note
paper_id: 动作空间设计
created: 2026-07-01
---

# Demystifying Action Space Design for Robotic Manipulation Policies Note

## Navigation
- Paper card: [Demystifying Action Space Design for Robotic Manipulation Policies card](../cards/动作空间设计.md)

## Reading Notes

作为主要的监督信号，动作表示的选择不仅决定了策略的可学习性，也决定了部署的稳定性



![image-20260701135957482](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701135957482.png)

![image-20260701140237082](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701140237082.png)



**实验setting：**

1. **硬件平台**

研究涵盖了仿真和真实世界的四种配置，以验证结论的普适性：

- **单臂 AgileX PiPER**：主要实验平台，用于大规模数据收集和策略测试。
- **双臂 AgileX PiPER**：用于测试复杂的双臂协作任务（如 Bimanual Transfer）。
- **AIRBOT 单臂**：用于跨形态（Cross-morphology）泛化性测试。
- **RoboTwin 2.0 (仿真)**：用于进行更大规模、可重复的消融实验（包含 10 个代表性任务）。

2. **任务设计**

设计了四个难度递增的真实世界任务，旨在测试动作空间在不同维度的表现：

- **Touch Cube（触碰方块）**：基础精度测试，排除动力学干扰。
- **Pick Cup（抓取杯子）**：引入接触动力学和夹爪时机控制。
- **Pick & Place Cup（抓取并放置）**：长时序任务，测试时间漂移和误差累积。
- **Bimanual Cube Transfer（双臂方块移交）**：最高难度，要求双臂之间高度的时空协调精度。

3. **模型架构与训练**

为了确保结论不局限于单一模型，研究采用了两种主流学习范式：

- **回归策略 (Regression-based)**：基于 **ACT** 架构，使用 MSE 损失函数直接预测动作。
- **流匹配策略 (Flow Matching-based)**：基于 **Diffusion Policy (DP)** 思想，具有更强的多峰分布建模能力。
- **基础模型微调**：利用 **$\pi_0$** 机器人基础模型进行 LoRA 微调，测试动作空间对迁移学习的影响。

4. **严苛的评估协议**

这是该研究高可信度的来源：

- **空间覆盖策略 (Grid-based)**：将机器人工作空间划分为 **6x6 的网格**，确保训练和测试数据均匀覆盖空间，避免由于初始位置过于简单导致的实验偏差。
- **实验规模**：
  - 收集了 **2,000+** 段专家演示轨迹。
  - 测试了 **500+** 个不同的模型训练检查点。
  - 进行了 **13,000+** 次真实世界机器人运行（Rollouts）。
- **衡量指标**：采用 **Progress Score（进度分）**，不仅看最终是否成功，还根据任务完成的阶段赋予 0.25 到 1.0 之间的分数。





###  Action Abstraction Taxonomy



**Spatial Abstraction**

尽管关节空间和任务空间可以通过正向和逆向运动学求解器在运动学上相互转换，但选择不同的监督域会导致截然不同的优化形态（optimization landscapes）。任务空间控制提供了一种具有几何意义的抽象，能自然地与以物体为中心的视觉观测相契合。然而，它在部署阶段依赖逆向运动学求解器，这会引入数值奇异性和误差累积，从而降低执行的鲁棒性。相比之下，关节空间控制避免了逆向运动学求解，但这种鲁棒性是以增加学习复杂度为代价的：策略必须隐式地学习机器人的运动学结构，将视觉输入映射到高度非线性的构型流形上。





**Temporal Abstraction**

在绝对参数化方案下，策略必须将观测映射到全局目标状态。这种接口有助于实现直观且精确的语义映射（grounding）；然而，它也要求模型内化复杂的现实世界几何结构，并应对高度多变的目标分布，从而导致巨大的学习难度。相比之下，增量参数化方案预测的是相对增量，能提供条件更优且适合闭环学习的目标。然而，执行增量动作会使系统对反馈缺陷更为敏感：噪声、延迟和跟踪误差可能会随时间累积，进而导致系统漂移





**Action Chunking**

- Ambiguity in Delta Alignment：当delta+action chunking结合的时候有两种不同设计——相较于紧邻的上一个状态预测delta以及相较于action chunk起始状态的增量
- action chunk长度可能和增量/绝对的空间目标选择有关系



### Results and Analysis



#### RQ1. Foundational Impact

在实现层面，动作空间具体构建方式的选择如何影响策略性能？什么样的配置才是最优的？



**SUPERIORITY OF CHUNK- VS. STEP-WISE DELTA**

基于回归的标准策略在单臂AgileX平台上执行三项基础任务（触碰方块、拾取杯子、拾取并放置杯子）时的性能表现:（此处用的ACT,其他的模型见附录F）

![image-20260701151720022](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701151720022.png)

实验结果表明，在所有任务中，分块式增量动作的表现均持续且显著优于逐步式增量动作。值得注意的是，两者的平均性能差距超过10%；这一显著差异凸显了对齐参考系（alignment frame）选择的重要性。



作者的解释是，step wise会导致误差的累计，而chunk-wise可以保持误差的相对稳定





**INTERPLAY WITH HORIZON k**

![image-20260701152354712](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701152354712.png)

绝对控制（absolute control）受益于显著更长的时域长度，而增量控制（delta control）的效果则在较短的时域长度下达到峰值。说明相对表征对执行漂移（execution drift）较为敏感。在某些任务中，即使是绝对动作也存在一个饱和点，此时增加执行时域长度已无法带来显著的性能提升。





#### RQ2: Systematic Trends in Action Abstraction

基于这些优化后的实现方案，我们能否在不同任务中识别出一致的趋势，从而指导如何选择更优的动作抽象？





![image-20260701153850563](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701153850563.png)



**TEMPORAL ABSTRACTION**

即便采用了在 RQ1 中确定的针对绝对抽象（absolute abstraction）和增量抽象（delta abstraction）的最优实现方案，两者之间仍存在显著的性能差距



解释：

- 正如第 2 节所述，学习从高维视觉观测到全局坐标的直接映射极具挑战性。即使对于具有强大表达能力且经过适当归一化的策略，任务空间（Task space）和关节空间（Joint space）中的全局坐标也表现出较低的局部连贯性。相比之下，实现得当的分段增量动作（chunkwise delta actions）使网络能够专注于即时位移，这构成了一种更易于处理的归纳偏置（inductive bias）
- 正如第 2.3 节所指出的，针对“时间跨度权衡”（horizon trade-off）的研究尚显不足

结论：对于现代模仿学习的主干网络而言，增量抽象提供了一个更稳健且样本效率更高的基础



**SPATIAL ABSTRACTION**



**基于流匹配（flow-matching）生成范式训练的策略，在关节空间学习中展现出了显著的优越性**：由于关节空间中的动作分布通常位于复杂的、非线性的且多模态的硬件配置流形上，因此需要强大的生成建模能力来有效捕捉其底层结构



#### RQ3: Consistency and Scaling Analysis

最后，当面对更复杂的场景——如大规模数据环境、基础模型迁移以及跨具身学习——时，这些已识别出的趋势是否依然稳健有效？



**SCALING WITH DATA AND COMPUTE**

这一部分是逐渐增大数据规模和训练时长观察表现

![image-20260701164523219](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701164523219.png)

上图汇总了 AgileX 平台上针对四项设计任务进行单任务学习的结果，这些结果清晰地展示了在不同资源预算下动作抽象性能的表现



结论：

- 尽管在某些特定设置下增益幅度有限，但“增量动作”始终是更优的时间抽象方式
- 在大多数情况下，“关节空间动作”依然是最稳健的空间表征形式
- 随着训练轮数和数据量的增加，关节空间动作的优势愈发显著，尤其是在基于回归的策略中





**ADVANCED LEARNING REGIMES**

![image-20260701164912098](/home/caiyinghao/.config/Typora/typora-user-images/image-20260701164912098.png)

cross-embodiment：

具体实验协议写的不是很清楚，只知道涉及两个6轴机械臂



结论：当实验扩展到另一种运动学结构时，EEF 表示的相对优势变得更加明显



transfer-learning: 作者采用预训练的 **π₀ policy**，使用 π₀ 官方代码，并通过 **LoRA** 进行下游微调。delta/abs, EEF/joint是微调时的设计。任务空间表征展现出更为显著的优势，甚至在某些情况下超越了关节空间控制





**结论：**

我们将这一现象归因于任务空间表征相对“具身无关”的特性；这种特性屏蔽了特定机器人独有的运动学细节，从而促进了跨不同具身的知识迁移。这些结果凸显了任务空间控制的互补优势，特别是在那些优先考虑跨机器人或跨任务泛化能力、而非单一固定具身内执行鲁棒性的场景中。



### Future Direction

#### 1. 自适应或混合动作表示

不再固定使用单一的 Joint、EEF、Absolute 或 Delta 表示，而是让策略根据任务阶段动态选择。

例如：

- 自由空间接近物体时使用 Delta EEF，利用其局部几何直观性和泛化能力；
- 接触、抓取和精细操作阶段使用 Joint action，提高执行稳定性并避免在线 IK；
- 进一步通过 gating、mixture-of-experts 或分层策略自动决定动作空间。

核心问题是：
$$
\text{何时使用哪种动作表示，以及如何在不同表示之间平滑切换？}
$$

#### 2. 建立 action chunking 和时间参数化的理论

当前 chunk horizon、执行长度以及 absolute/delta 的选择仍主要依赖经验和网格搜索。

未来需要系统研究：

- chunk 长度如何影响优化难度；
- 预测误差如何沿时间累积；
- 远期动作与当前观测之间的信息如何衰减；
- 训练 horizon 与实际执行 horizon 如何匹配；
- 不同动作表示是否应该采用不同的 chunk 长度。

目标是从经验结论进一步发展为可预测、可分析的设计原则。

#### 3. 扩展到更高自由度和更复杂的任务

论文的结论主要来自常规机械臂和相对静态的操作任务。未来需要验证其是否适用于：

- 人形机器人；
- 双臂系统；
- 多指灵巧手；
- 高自由度冗余机械臂；
- 高速动态任务，如乒乓球；
- 可变形物体操作，如布料折叠。

这些场景具有更强的多解性、动力学约束、关节耦合和实时反馈需求，当前观察到的 Delta Joint 优势未必仍然成立。

#### 4. 发展跨 embodiment 的统一动作空间

EEF 具有更强的机器人形态不变性，因此可能成为跨机器人预训练和迁移的公共接口。

未来需要研究：

- 更多不同机器人之间的联合训练和迁移；
- 是否能构造统一的 task-space action representation；
- 如何处理不同机器人的可达空间、IK、多解和奇异性；
- 是否需要 embodiment token、形态编码或显式运动学条件；
- Joint 与 EEF 能否通过共享 latent action space 统一起来。

目前的 cross-embodiment 结果只是初步证据，还不足以说明 EEF 在所有机器人迁移场景中都最优。

#### 5. 研究动作表示与基础模型预训练目标的耦合

作者认为，EEF 在 foundation-model transfer 中表现较好，可能不仅来自 EEF 本身，也与预训练目标有关。

未来需要比较：

- vision-language alignment 预训练；
- 大规模行为克隆；
- EEF supervision；
- joint-space supervision；
- 混合动作空间预训练。

一个关键问题是：
$$
\text{如果基础模型从一开始就在大规模 Joint 数据上预训练，Joint 的迁移劣势是否会消失？}
$$
因此，动作表示不能只作为下游控制接口研究，还应被视为基础模型预训练设计的一部分。
