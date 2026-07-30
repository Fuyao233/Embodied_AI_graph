# Physical Intelligence Research 

• 截至 2026-07-27，你的 ./papers 已覆盖 Physical Intelligence 主线的大部分，但仍有 3 篇官方论文完全缺失、1 篇只有占位笔记、1 篇只读了一部分。

  我以“是否存在实质性阅读笔记”为已读标准，而不是仅看有没有 paper card。目前目录共有 39 张卡片和 39 份 Markdown 笔记。

  ## PI 官方论文覆盖情况

| 时间       | 论文                                                         | 本地状态                                    | 判断     |
| ---------- | ------------------------------------------------------------ | ------------------------------------------- | -------- |
| 2024-10    | [π₀: A Vision-Language-Action Flow Model for General Robot Control](https://arxiv.org/abs/2410.24164) | 无卡片/笔记                                 | 未读     |
| 2025-01    | [FAST: Efficient Action Tokenization for VLAs](https://arxiv.org/abs/2501.09747) | `papers/notes/pi-FAST-note.md`，323 行      | 已精读   |
| 2025-02    | [Hi Robot: Open-Ended Instruction Following with Hierarchical VLAs](https://arxiv.org/abs/2502.19417) | 无卡片/笔记                                 | 未读     |
| 2025-04    | [π₀.₅: a VLA Model with Open-World Generalization](https://arxiv.org/abs/2504.16054) | `papers/notes/pi05-note.md`，669 行         | 已精读   |
| 2025-05    | [Knowledge Insulating VLAs](https://arxiv.org/abs/2505.23705) | `papers/notes/ki-note.md`，约 45 行         | 部分读过 |
| 2025-06    | [Real-Time Execution of Action Chunking Flow Policies](https://arxiv.org/abs/2506.07339) | `papers/notes/RTC-note.md`，415 行          | 已精读   |
| 2025-11    | π₀.₆*: a VLA That Learns From Experience / RECAP             | `papers/notes/pi06-note.md`，376 行         | 已精读   |
| 2025-12    | [Training-Time Action Conditioning for Efficient RTC](https://arxiv.org/abs/2512.05964) | `papers/notes/Training-RTC-note.md`，106 行 | 已读     |
| 2025-12    | [Emergence of Human to Robot Transfer in VLAs](https://arxiv.org/abs/2512.22414) | 无卡片/笔记                                 | 未读     |
| 2026-03    | [MEM: Multi-Scale Embodied Memory for VLAs](https://arxiv.org/abs/2603.03596) | `papers/notes/mem-note.md`，287 行          | 已精读   |
| 2026-03/04 | [RL Token: Bootstrapping Online RL with VLAs](https://arxiv.org/abs/2604.23073) | `papers/notes/RL-token-note.md`，160 行     | 已读     |
| 2026-04    | π₀.₇: a Steerable Generalist Robotic Foundation Model        | `papers/notes/pi07-note.md`，只有模板       | 实际未读 |

  

因此，PI 官方主线最明确的未读项是：

  1. π₀ 原始论文
  2. Hi Robot
  3. Emergence of Human-to-Robot Transfer
  4. π₀.₇
  5. Knowledge Insulation 的实验和消融部分需要补读

  ## 值得补充的直接后续论文

  以下论文在当前 papers 中均没有独立记录。

  ### 第一优先级：直接继承 π₀/openpi 方法

  - Openpi Comet: Competition Solution for 2025 BEHAVIOR Challenge (https://arxiv.org/abs/2512.10071)
    在 π₀.₅ 上研究预训练、后训练和数据扩展，用于 BEHAVIOR-1K 长时域移动操作。它比普通 benchmark paper 更有价值，因为给出了实际适配 π₀.₅ 的训练经验。

  - FASTer: Neural Action Tokenization (https://arxiv.org/abs/2512.04952)
    FAST 的直接后续：用可学习 tokenizer、block-wise 自回归解码和轻量 action expert，解决 FAST 固定 DCT/BPE 表示的局限。

  - SnapFlow: One-Step Action Generation for Flow-Matching VLAs (https://arxiv.org/abs/2604.05656)
    直接在 π₀.₅ 上将约 10 步流匹配压缩成单步生成；报告 π₀.₅ 端到端延迟从 274 ms 降至 83 ms。和 KI、RTC、Training-RTC 构成一条完整的实时化路线。

  - Real-Time Execution with Autoregressive Policies (https://arxiv.org/abs/2606.13355)
    将 RTC 问题从 flow/diffusion 扩展到 autoregressive VLA，通过 token horizon 和 constrained decoding 实现有严格延迟界的异步执行。

  - Mechanistic Interpretability for Steering VLAs (https://arxiv.org/abs/2509.00328)
    在 π₀ 和 OpenVLA 上寻找速度、方向等内部语义方向，并通过 activation steering 零样本改变行为。它可以作为 π₀.₇“可 steerability”的外部技术对照。

  - VLAFlow (https://arxiv.org/abs/2607.01586)
    在统一的 π₀-style 架构下，控制变量比较 action-only、language co-training、future latent alignment 及其组合。很适合用来重新审视 π₀.₅/π₀.₇ 的 heterogeneous co-training 配方。

  ### 第二优先级：与 PI 研究问题高度相关

  - MolmoAct: Action Reasoning Models that Can Reason in Space (https://arxiv.org/abs/2508.07917)
    用 perception token → spatial plan → low-level action 的显式三阶段结构，对比 π₀、π₀-FAST 和 GR00T。适合作为 Hi Robot/π₀.₇ 层级推理路线的强对照。

  - Masquerade: Learning from In-the-Wild Human Videos using Data-Editing (https://arxiv.org/abs/2508.09976)
    PI 的 Human-to-Robot 页面明确引用的相关工作。它采用“移除人手并渲染机器人”的显式 embodiment alignment，恰好与 PI 论文主张的“规模足够后无需显式对齐”形成对照。

  - A1: A Fully Transparent, Adaptive and Efficient Truncated VLA (https://arxiv.org/abs/2604.05672)
    从 VLM early exit 与 truncated flow matching 两侧同时压缩推理成本，适合和 KI、SnapFlow、RTC 横向比较。

  - StreamingVLA (https://arxiv.org/abs/2603.28565)
    将 observation、action generation、execution 流水化并行，属于 RTC 之外的系统级实时化方案。

  - DynaWM (https://arxiv.org/abs/2607.02604)
    用 π₀/π₀.₅ 的 base action 引导 world model 重新生成动态物体操作轨迹；覆盖 moving-object manipulation，这是 PI 当前主线相对薄弱的能力。

  ### 第三优先级：部署和评测 π₀/openpi

  - VLAgents: A Policy Server for Efficient VLA Inference (https://arxiv.org/abs/2601.11250)
    统一部署 OpenVLA、Pi Zero 等七种策略，并对比 OpenPi 原生 policy server；偏工程部署。

  - PhAIL: A Real-Robot VLA Benchmark (https://arxiv.org/abs/2605.29710)
    在真实 Franka 上比较 OpenPI、GR00T、ACT 等，强调 time-to-success 分布、吞吐率和置信区间，而不只是二值成功率。

  - Benchmarking the Generality of VLAs (https://arxiv.org/abs/2512.11315)
    MultiNet 基准直接比较 GPT-5、π₀ 和 Magma，结论是当前模型在跨域、跨模态迁移中仍存在明显能力退化。

  ## 推荐阅读顺序

  如果目标是补齐 PI 技术演进，建议按这个顺序：

  1. π₀：理解 flow-matching action expert 和基础数据配方
  2. Hi Robot：理解高层 VLM 与低层 VLA 的层级控制
  3. 补完 KI：重点看梯度隔离消融、冻结 backbone 为什么失败
  4. Human-to-Robot Transfer + Masquerade：比较 emergent transfer 与显式 alignment
  5. π₀.₇：把此前的 co-training、RECAP、memory、steering 汇总起来
  6. SnapFlow + Real-Time Autoregressive + FASTer：比较三条实时化路线
  7. Openpi Comet：看 π₀.₅ 在长时域 benchmark 上的实际训练配方
  8. VLAFlow / MolmoAct：作为下一代架构对照

  核心结论是：你的笔记对 π₀.₅→RECAP→MEM/RLT 和 FAST→RTC 这两条线覆盖很好；最大的知识缺口在“π₀ 起点”“Hi Robot 的层级推理”“Human-to-Robot 数据迁移”和最新的 π₀.₇ 汇总模型。

  主要来源：PI 官方 Research (https://www.physicalintelligence.company/research)、PI 官方 Blog (https://www.physicalintelligence.company/blog) 以及上述 arXiv 论文页面。