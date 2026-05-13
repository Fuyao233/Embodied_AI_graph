---
type: paper-note
paper_id: wm-survey-2026
created: 2026-05-11
---

# wm-survey-2026 Note

## Navigation
- Paper card: [wm-survey-2026 card](../cards/wm-survey-2026.md)

## Reading Notes

![image-20260511114557515](D:\Embodied_AI_graph\papers\notes\wm-survey-2026-note.assets\image-20260511114557515.png)



### Background

VLA缺乏对世界结构的预测 -> World Model 



世界模型应该具备的能力：

- 前瞻能力，即在执行前预测未来状态或行动后果
- 想象驱动的规划能力，即利用想象的场景来比较和选择候选行为
- 数据放大能力，即综合额外的演示或交互轨迹以提升学习效果
  - 生成合成演示数据
  - 作为可学习的仿真器
  - 覆盖长尾（在现实生活中发生概率极低，但种类极其繁多、无法穷举的罕见情况）和失败场景





主流机器人策略：

- 端到端（specialized visuomotor policies）：专注于训练特定任务的、通常轻量级的端到端网络，这些网络利用生成建模以高精度和低延迟捕获复杂的动作分布，如单纯的RDT
- VLA：通过在大规模机器人轨迹数据上微调大规模视觉语言模型 (VLM) 而训练的，继承了基础模型的庞大语义知识和开放词汇推理能力，以实现卓越的跨任务和跨具身泛化





### World Model for Policy

将世界模型集成到机器人的控制策略中

![image-20260511120635910](D:\Embodied_AI_graph\papers\notes\wm-survey-2026-note.assets\image-20260511120635910.png)



#### Inverse Dynamics Policies with World Models

首先
$$
\hat z_{t+1:t+H} = \mathcal{W}(E_{img}(o_t),E_{text}(l))
$$
then 
$$
\pi(a_{t+1:t+H'}|o_t,l) = P(a_t|E_{img}(o_t),E_{text}(l),\hat z_{t+1:t+H})
$$


该系列方法的一个显著特征是其架构解耦：预测模型$\mathcal{W}$通常先进行预训练，然后冻结、轻度调整或连接到单独的策略头，而不是与动作生成联合优化

| 方法类别                  | 代表方法                                               | 核心做法                                                     | 作用                                                   |
| ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------ |
| 像素级未来视频 → 动作     | UniPi、VidMan、Vidar                                   | 先生成未来视频/图像轨迹，再用逆动力学模型从相邻帧或预测轨迹中恢复动作 | 建立最经典的“先预测、再执行”范式                       |
| 人类视频生成 → 机器人动作 | Gen2Act                                                | 不生成机器人自身视角未来，而是条件化生成/利用人类执行视频，再转换为机器人动作 | 利用人类视频中的任务先验                               |
| 视频 latent 表征 → 动作   | VPP、Video2Act                                         | 不显式渲染完整未来帧，而是从预训练视频扩散模型的 latent space 中提取控制相关特征，再送入动作头 | 更紧凑、更稳定，减少像素生成负担                       |
| 生成视频状态作为目标      | V2A                                                    | 将合成的视频状态当作视觉目标，通过 goal-conditioned exploration 学习策略 | 不直接训练逆动力学解码器，而是把未来状态变成可探索目标 |
| 视觉计划/执行计划 → 动作  | MimicVideo、TC-IDM、LVP、Say-Dream-ACT                 | 把未来预测进一步压缩成 latent visual plan、工具中心轨迹、可重定向视觉计划或 video prompt | 让未来预测更接近可执行计划                             |
| 结构化 3D 中间表示 → 动作 | AVDC、VidBot、Object-centric 3D Motion Field、NovaFlow | 从视频中提取 dense correspondence、3D 手部轨迹、物体中心 3D motion field、actionable 3D object flow | 用几何/运动结构提高动作恢复的直接性和鲁棒性            |



#### Unified Policies with a Single World Model Backbone

输入是当前观测&指令，同时输出未来预测以及动作，二者协同优化

| 方法类型                           | 输入                                                         | 输出                                            | 损失函数                                                     |
| ---------------------------------- | ------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------ |
| **UVA**                            | 当前图像/视频、动作或被 mask 的模态                          | video prediction、action prediction，或二者联合 | video diffusion loss + action diffusion loss；通过 masked input 支持 policy、forward dynamics、inverse dynamics、video generation |
| **UWM / UWA**                      | 当前观测、noisy action、noisy future observation、两个 modality-specific timesteps | action noise、future observation noise          | $\lambda_a \mathcal{L}_{action}+\lambda_v \mathcal{L}_{video}$，本质是联合 denoising score matching |
| **VideoVLA**                       | 语言指令、当前观测 latent、noisy future frame latents、noisy action tokens | action chunk + future frame latents             | DDPM denoising loss，对 action 和 future visual latent 联合去噪 |
| **Cosmos Policy**                  | 多视角图像、语言/任务、proprioception、latent-frame 序列     | action chunk、future state、future value        | latent diffusion denoising loss；根据 conditioning mask 训练 policy、world model、value function |
| **DreamZero / flow-matching 类**   | 当前观测、语言、noisy video-action trajectory                | velocity field 或 clean trajectory              | flow matching loss：$|v-\hat v_\theta|^2$                    |
| **UD-VLA / discrete diffusion 类** | 当前观测、语言、masked future-image tokens、masked action tokens | 被 mask 的 image/action tokens                  | token-level cross entropy 或 discrete denoising loss         |





#### MoE/MoT-Style Policies with Expert World-Model Backbones

不同模态有各自的专家，通过层间注意力交互信息
$$
(h_{l+1}^v,h_{l+1}^a)=\mathcal{F}_{l}^{mix}(h_l^v,h_l^a;o_t,l)
$$
$\mathcal{F}_{l}^{mix}$ denotes a layerwise interaction operator, such as joint attention, crossattention, or shared-attention fusio

| 类别                           | 代表方法       | 专家/分支设计                                                | 视频世界模型如何参与动作                                     | 推理时是否显式生成未来                                  | 核心特点                                                     |
| ------------------------------ | -------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------ |
| **Parallel expert coupling**   | **GE-Act**     | 预训练 video diffusion world model + 轻量 action flow-matching branch | action branch 通过 deep cross-attention 读取 video branch 的 visual latent features | 通常不需要完整渲染未来视频                              | 视频分支提供 predictive world-state structure，动作分支把它转成可执行控制；比 3.2 更紧耦合，但仍保留专家分工。 |
| **MoT deep interaction**       | **Motus**      | understanding expert + video generation expert + action expert | 多个 Transformer 专家通过 shared attention / MoT fusion 反复交互 | 可进行 expert rollout                                   | 最直接的 Mixture-of-Transformers 设计：不同专家分别负责理解、视频生成和动作。 |
| **MoT deep interaction**       | **LingBot-VA** | dual-stream MoT：video stream + action stream                | 将 video token 和 action token 交错进共享自回归序列；用 shared attention 融合 | 未来状态作为 action refinement 的上下文                 | 更强调 causal world modeling：imagined future states 不是后处理结果，而是动作细化的上下文。 |
| **MoT deep interaction**       | **BagelVLA**   | language planning + visual forecasting + action generation 交错执行 | 在长程执行循环中交替处理语言规划、视觉预测和动作生成         | 用 single-step visual foresight，避免完整长视频 rollout | 通过 Residual Flow Guidance 把视觉 foresight 做轻量化，使预测未来更适合在线控制。 |
| **MoT / expert fusion**        | **DiT4DiT**    | video DiT branch + action prediction branch                  | 使用 video branch 的中间 denoising features 引导 action prediction | 多为 latent video guidance                              | 重点不是输出完整视频，而是利用视频扩散过程中的中间特征作为动作预测条件。 |
| **Hybrid MoT**                 | **Fast-WAM**   | shared-attention MoT backbone，包含 coupled video/action branches | 训练时 video branch 和 action branch 共同优化；推理时可跳过视频分支 | 训练时用 video，测试时可 skipped                        | 代表一种更激进观点：收益可能主要来自 video co-training，而不是推理时显式想象未来。 |
| **Latent-space expertization** | **LDA-1B**     | visual expert + action expert，位于 multimodal diffusion transformer 中 | 不预测 RGB 视频，而是在 DINO latent space 做 visual forecasting；通过 shared self-attention 耦合动作 | latent dynamics only                                    | 把“未来预测”从像素空间移到视觉表征空间，降低生成冗余，更贴近控制。 |
| **Latent-space expertization** | **FRAPPE**     | 多个 parallel expert streams + 独立 adapters                 | 不重建未来观测，而是把专家流对齐到 visual foundation model 的 future representation | latent representation alignment                         | 更偏训练/表征对齐：让多个专家学到与未来视觉表征一致的预测性表示。 |



#### Unified Vision-Language-Action Models

把 world modeling 内化到同一个多模态策略骨干里：不一定有独立 video world model，但会把“未来预测/未来表征/视觉前瞻”作为辅助目标或内部模块

| 类别                                                    | 核心思想                                                     | 未来建模信号/目标                                            | 代表方法                                                     | 推理时怎么用                                                 | 优点                                                         | 局限                                                         |
| ------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **1. 显式未来状态 / 未来图像预测**                      | 在统一 VLA 或 GPT-style transformer 里，同时预测动作和未来图像；未来帧可以是单帧，也可以是短序列。 | 真实轨迹里的未来图像、未来视觉 token 或 future image reconstruction loss。 | **GR-1、UP-VLA、WorldVLA**。论文表 1 中也把 GR-1/UP-VLA 标成 future image prediction，WorldVLA 标成 train-time future image。 | 有些方法推理时可能显式生成未来图像；WorldVLA 更偏把 future-image prediction 当作训练期 joint signal，而不是必须在推理时输出。 | 可解释性强，能直接看到模型“想象”的未来；对动作生成和视觉泛化有帮助。 | 像素级预测成本高，容易学到与控制无关的视觉细节；图像好看不等于动作可执行。 |
| **2. 隐式 / latent / semantic future modeling**         | 不直接重建未来图像，而是预测更紧凑、与动作更相关的未来表征或结构化世界知识。 | 未来 latent、motion target、structured world knowledge，或由未来帧编码得到的 compact target。 | **DreamVLA、UniVLA、CoWVLA**。DreamVLA 预测 dynamic/spatial/semantic cues；UniVLA 在 multimodal tokenization post-training 中吸收视频因果动态；CoWVLA 建模 latent motion 和 compact future visual targets。 | 推理时通常不需要显式生成未来图像，而是用内部预测表征辅助 action decoding 或 inverse dynamics。 | 更省算力，更贴近控制；避免重建冗余像素细节。UniVLA 这类尤其适合从大规模视频中吸收 dynamics。 | 可解释性弱；latent target 设计是否真的对动作有用，是关键风险。 |
| **3. 统一多专家 / 多系统 VLA + foresight/subgoal 模块** | 训练和任务层面仍是统一 VLA，但内部保留功能分工：grounding、视觉前瞻、subgoal、episodic dynamics、control 等由不同专家或子系统承担。 | visual foresight、latent foresight、visual subgoal、episodic dynamics 等未来导向监督。 | **F1、InternVLA-A1、HALO、TriVLA**。F1 用 MoT 预测未来视觉状态作为 planning target；InternVLA-A1 做轻量 latent visual foresight；HALO 强调 visual subgoal 和 embodied reasoning；TriVLA 拆成 grounding、episodic dynamics perception 和 control 子系统。 | 推理时通过 foresight/subgoal/专家协同来约束动作，而不是靠一个纯 reactive policy 直接输出动作。 | 兼顾统一训练和功能专门化；适合长程任务、分阶段推理和复杂操控。 | 架构复杂；专家之间的协调、训练稳定性和模块间 credit assignment 更难。 |





#### Policies with Latent-Space World Modeling



| 方法类型                                      | 核心思想                                                     | 监督信号来自哪里                                             | 代表方法                                                    | 与动作生成的关系                                             | 主要价值                                                     |
| --------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **1. Future latent alignment**                | 不预测未来图像，而是让 policy 内部特征对齐未来观测的 latent embedding。 | 真实轨迹里的未来帧，经视觉编码器/latent encoder 得到 future embedding。 | **FLARE**                                                   | action denoising network 的 hidden features 被拉向未来观测 latent，使策略隐式预判未来。 | 保留 future supervision，但避免像素重建开销。                |
| **2. JEPA-style latent prediction**           | 用 JEPA 思路在 embedding space 预测未来状态，而不是在 pixel space 预测未来图像。 | 未来帧只用于生成 latent target；模型不能直接看未来像素，避免信息泄漏。 | **VLA-JEPA**                                                | 学 action-relevant state transition，让 VLA 获得预测性状态表征。 | 更关注动作相关动态，而不是视觉纹理变化。                     |
| **3. Predictive embedding backbone**          | 不额外加 future prediction head，而是直接把视频 JEPA 学到的 predictive embeddings 当作更好的 VLA backbone。 | 来自预训练视频 JEPA 模型的预测性视觉表征。                   | **JEPA-VLA**                                                | 用 predictive visual embedding 替代静态视觉特征，为 policy 提供更强先验。 | 把 world modeling 能力前置到视觉 backbone。                  |
| **4. Compact future condition modeling**      | 直接预测对控制最有用的未来条件，而不是一般性的未来 latent 或图像。 | 未来导向的 compact condition，通常由轨迹未来状态/动作效果构造。 | **WoG**                                                     | world modeling 被放进 action generation 的 condition space；动作和未来条件一起预测。 | 更贴近精细控制，减少无关预测目标。                           |
| **5. Latent visual foresight as bottleneck**  | 把高层意图和低层动作解耦，中间插入 latent world modeling bottleneck。 | VLM feature space 里的 latent visual foresight。             | **DIAL**                                                    | 高层语义先转成 latent foresight，再驱动 downstream action generation。 | 改善语言意图到动作控制之间的结构化过渡。                     |
| **6. Symbolic / planner-facing world models** | 不用神经 latent，而是在 predicates、object relations、affordances、operators、causal processes 上建模状态转移。 | 抽象状态、对象关系、符号谓词、因果过程等。                   | Silver et al., Shah et al., Liang et al., Athalye et al. 等 | 被 symbolic planner 或 task-and-motion planner 查询，用于生成高层 skill sequence。 | 说明 world model 不必是像素模型；也可以是可规划的抽象动力学。 |



### World Model as Simulator

除了直接控制之外，世界模型还充当交互式模拟器。这个角色对于强化学习（RL）尤为关键

![image-20260512113937852](D:\Embodied_AI_graph\papers\notes\wm-survey-2026-note.assets\image-20260512113937852.png)



#### For Reinforcement Learning

这一类方法的共同点是：**世界模型基本被当作环境本身**，策略在里面采样轨迹、获得反馈并更新。代表工作包括：

| 工作                                       | 主要贡献                                                     |
| ------------------------------------------ | ------------------------------------------------------------ |
| **UniSim / World-Env / VLA-RFT**           | 建立“动作条件世界模拟 + reward 生成”的基本范式。             |
| **DiWA**                                   | 使用从大规模 play data 学到的冻结世界模型，支持 diffusion policy 的完全离线适配。 |
| **World4RL**                               | 用 diffusion world model 做更高保真度的 manipulation refinement，实现端到端 imagined policy optimization。 |
| **World-Gymnast**                          | 表明在 video world model 里做 RL 可以优于 supervised finetuning 和传统软件模拟器。 |
| **PlayWorld**                              | 从 autonomous play 中学习机器人世界模型，并证明 learned simulator 中的 RL 能提升真实世界表现。 |
| **RehearseVLA**                            | 用物理一致的世界模拟器和即时 reward / termination reflector 做 VLA 后训练。 |
| **WMPO / ProphRL / RISE / GigaBrain-0.5M** | 分别推进 pixel-space imagination、on-policy GRPO、flow-based action head 的 RL 更新、组合动力学与 progress-value estimation，以及大规模预训练 VLA 的世界模型式 RL 适配。 |

这一阶段的重点是：**如何让 RL 在 learned world simulator 中跑起来**。差异主要体现在 reward 设计、rollout 表示、优化目标，以及与现代 VLA 架构的兼容性。

4.1 后半部分指出，仅仅把世界模型当环境还不够，因为 learned simulator 本身会有误差。于是出现第二层范式：**policy 改进 world model，world model 再反过来改进 policy**。

代表工作包括：

| 工作               | 主要贡献                                                     |
| ------------------ | ------------------------------------------------------------ |
| **World-VLA-Loop** | 联合预测未来观测和 reward，并用策略失败 rollout 反过来修正模拟器。 |
| **VLAW**           | 采用 iterative repair-and-improve：真实数据用于修复 simulator，合成数据用于改进 VLA。 |
| **WoVR**           | 把 simulator reliability 作为核心瓶颈，提出 controllable action-conditioned video modeling、Keyframe-Initialized Rollouts，以及 world-model–policy co-evolution。 |



#### For Evaluation

与RL的区别：

- RL是为了学出更好的策略
- evaluation是判断当前候选行为是否值得执行



给定当前观测、任务指令和若干候选动作，world model 预测这些动作会导致的未来状态，然后根据预测结果进行：

| 评估用途                           | 含义                                                |
| ---------------------------------- | --------------------------------------------------- |
| **ranking**                        | 在多个候选动作中排序                                |
| **rejection**                      | 拒绝明显失败或危险的动作                            |
| **safety filtering**               | 执行前做安全筛查                                    |
| **policy / checkpoint evaluation** | 在真实部署前比较不同策略或同一策略的不同 checkpoint |

- rollout-based candidate assement: policy 先提出多个候选动作序列，world model 对每个候选动作做未来 rollout，然后选择 predicted consequence 最好的动作

  - | 工作               | 作用                                                         |
    | ------------------ | ------------------------------------------------------------ |
    | **GPC**            | 冻结原有 generative robot policy，在部署时加入 action-conditioned world model，用 predictive look-ahead 在线排序和细化候选动作。 |
    | **IRASim**         | 模拟多个候选轨迹，选择 predicted value 最高的轨迹。          |
    | **World-in-World** | 把 candidate plans 放进 imagination 中 rollout，由 revision policy 评估并修改，再执行。 |
    | **DreamPlan**      | 用 world-model rollout 构造候选动作之间的 preference pairs，把 evaluator 逻辑转成训练信号。 |

- world model + MPC: 在 world model 的 imagined dynamics 中主动优化动作序列，使某个 cost function 最小（**TD-MPC2** 和 **LeWorldModel**）

- world model 作为 policy evaluator比较不同策略或者checkpoint: 

  - | 工作                                                         | 作用                                                         |
    | ------------------------------------------------------------ | ------------------------------------------------------------ |
    | **Evaluating Gemini Robotics Policies in a Veo World Simulator** | 用视频世界模拟器做 offline policy evaluation、OOD testing 和 safety probing。 |
    | **WorldEval**                                                | 研究 world model 是否能作为真实机器人 policy evaluation 的 scalable proxy，可在 imagination 中比较不同 robot policies 或同一 policy 的不同 checkpoints，并兼任 safety detector。 |
    | **WorldArena**                                               | 在 benchmark 层面明确把 policy evaluation 作为 embodied world model 的核心下游用途。 |

- 带显式反馈头的 simulator evaluator：有些系统会让 world model 额外输出 reward、termination、progress value 等显式评估信号，使 imagined rollout 不只是“视频预测”，而是能直接告诉系统任务是否完成、动作是否值得执行

  - | 工作               | 显式反馈                                                     |
    | ------------------ | ------------------------------------------------------------ |
    | **World-Env**      | 连续 reward prediction + action termination prediction       |
    | **VLA-RFT**        | 在 controllable world simulator 中对 imagined trajectories 计算 verified rewards |
    | **World-VLA-Loop** | 联合预测未来观测和 reward signal                             |
    | **RISE**           | 引入 progress value model，根据任务进展给 imagined outcomes 打分 |





### **Benchmarks, Datasets, and Results**

#### Benchmarks 

**机器人世界模型的评估不能等同于普通视频生成评估**。

普通视频生成可能关注画面质量、清晰度、真实感；但机器人 world model 更关键的是：

- 是否能根据 action 产生正确后果；
- 是否符合物理规律；
- 是否能保持长时程一致性；
- 是否能支持 policy learning、planning、evaluation 等下游决策。论文明确指出，visual realism alone is neither necessary nor sufficient，因为 rollout 看起来真实，也可能违反动力学，导致闭环控制失败。



三类benchmark:

| 类型                             | 评什么                                                     | 代表问题                                                    | 代表                                                 |
| -------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| **Open-loop predictive quality** | 给定 observation + action / instruction，生成未来          | 预测的视频是否语义正确、时间连贯、对动作有响应？            | **RBench、EWMBench、DreamGen Bench、EVA-Bench**      |
| **Closed-loop task utility**     | 把 world model 放进 planning / evaluation / simulator loop | 它是否真的提升策略选择、规划或任务成功率？                  | **WorldArena** 和 **World-in-World**                 |
| **Diagnostics**                  | 针对物理一致性、可控性、可执行性做专项检测                 | 生成的 rollout 能否恢复出合理动作？是否符合物理和操作约束？ | WorldSimBench、WoW-World-Eval、DrivingGen、WM-ABench |

没有单一指标足够评估 embodied world model





#### Datasets

不能是普通的视频集合：

- observation；
- action；
- task progression；
- embodiment-specific constraints；
- physical interaction dynamics；
- long-horizon task structure；
- contact / tactile / force 等物理信号



**Open X-Embodiment, DROID, BridgeData V2**：大规模机器人轨迹数据；

**AgiBot World, Galaxea Open-World Dataset, RoboMIND 2.0**：更偏大规模或开放场景机器人数据；

**UMI, MV-UMI, ActiveUMI, DexWild, EgoMimic**：人类演示 / human-to-robot prior；

**FreeTacMan, RH20T, VTDexManip, Humanoid Visual-Tactile-Action**：更偏触觉、力、contact-rich interaction；

**RoboTwin 2.0, Action100M**：更偏仿真或合成 / web-scale recipe



这一节最后指出一个重要缺口：虽然数据资源增长很快，但 **failure recovery、decision-sensitive variation、dense physically grounded supervision** 仍然稀缺
