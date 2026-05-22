---
type: paper-note
paper_id: gr00t-n1
created: 2026-05-09
---

# GR00T-N1 Note

## Navigation
- Paper card: [GR00T-N1 card](../cards/gr00t-n1.md)

## Reading Notes



### GR00T N1 Foundation Model



#### model architecture

![image-20260509120021681](D:\Embodied_AI_graph\papers\notes\gr00t-n1-note.assets\image-20260509120021681.png)

将Eagle-2 的中间层表示（具体是第12层）输到DiT的cross attention中

DiT是作为flow matching的向量场估计的



#### Training Data Generation

**Latent Actions **

采用VQ-VAE架构：

- Encoder输入当前帧 $x_t$ 和未来帧 $x_{t+H}$，输出潜在动作 $z_t$
- Decoder输入潜在动作 $z_t$ 和 $x_t$，输出未来帧 $x_{t+H}$

训练完成之后用encoder的输出作为GR00T的潜在动作标签





**Neural Trajectories**

使用视频生成模型（WAN 2.1）扩展当前轨迹：

> use a commercial-grade multimodal LLM to detect the objects given initial frames and generate many more possible combinations of “pick up {object} from {location A} to {location B}"

主要是换左右手或者取放位置等等



**Simulation Trajectories**

用DexMimicGen大规模合成轨迹：DexMimicGen 从少量人类演示数据（仿真环境中）入手，通过仿真环境中的演示变换和回放来自动扩展数据集。每个任务都被分解成一系列以物体为中心的子任务。初始的人类演示数据被分割成更小的操作序列，每个序列对应一个涉及单个物体的子任务。然后，通过将这些片段与物体的位置对齐，并保持机器人末端执行器与物体之间的相对姿态，使它们适应新的环境。





**两种方法的对比**

| 特性         | 物理仿真轨迹 (Simulation)                | 神经生成轨迹 (Neural)                       |
| :----------- | :--------------------------------------- | :------------------------------------------ |
| **底层原理** | 基于物理定律的公式推导                   | 基于视频扩散模型的像素生成                  |
| **优势**     | 动作 100% 准确，自带真实标签             | 能够模拟复杂的物理现象（如液体、软体物体）  |
| **挑战**     | 存在 Sim-to-Real Gap（仿真与现实的差异） | 动作标签需靠模型推测（IDM），可能不完全精准 |
| **主要用途** | 学习基础的抓取、放置等机械运动           | 学习在复杂、多变场景下的视觉泛化能力        |





**Training details**

GR00T N1 在预训练阶段使用 flow-matching loss，在多种机器人形态和数据源上训练，包括真实机器人数据、合成机器人数据、人类运动视频等。

- 对于没有真实动作标签的人类视频，模型会提取 学习到的 latent actions 作为训练目标（不用IDM反解是因为IDM 反出来的是某个 embodiment 的真实动作空间标签）
- 对于机器人数据，则同时使用真实机器人动作和 latent actions。
- 对于用神经轨迹增强的数据，还会使用 latent actions 以及由逆动力学模型预测出的动作作为伪标签。

在后训练阶段，模型会针对每一种具体机器人形态或任务进行微调。和预训练一样，视觉语言 backbone 中的语言部分保持冻结，只微调其余部分。后训练中	真实世界轨迹与神经轨迹1：1混合。





### Pre-Training Datasets

这里不同来源的数据集是一起训练的，但是具体的混合比例论文没交代



- **Real-World Datasets:**
  - GR00T N1 Humanoid Pre-Training Dataset：使用傅利叶 GR-1 机器人通过多种遥操作设备（如 VIVE、Xsens 手套、Apple Vision Pro）采集。数据包含精细的分层标注（原子动作与高层任务）
  - Open X-Embodiment
  - AgiBot-Alpha：100 台机器人的 14 万条轨迹
- **Synthetic Datasets:**
  - **仿真轨迹 (Simulation)：** 在 **RoboCasa** 厨房环境中使用 **DexMimicGen** 系统，从少量真人演示自动扩展出 **54 万条** 高质量示教数据（约 1742 小时）
  - **神经轨迹 (Neural)：** 利用视频生成模型（如 WAN2.1）在真实数据基础上生成“counterfactual robot trajecteries”（与已有数据不同但是符合逻辑的）视频，将 88 小时的真实轨迹扩展至 827 小时，极大地增强了视觉场景的多样性
- **Human Video Datasets**：
  - 包含了 Ego4D（第一视角）、EPIC-KITCHENS（厨房活动）、Assembly-101（组装任务）等 7 个主流的人类活动数据集



