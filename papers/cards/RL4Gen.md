---
type: paper-card
paper_id: RL4Gen
title: "What Can RL Bring to VLA Generalization? An Empirical Study"
status: seed
year: 
alphaxiv: https://www.alphaxiv.org/abs/2505.19789
pdf: 
code: 
created: 2026-07-20
---

# What Can RL Bring to VLA Generalization? An Empirical Study

## Navigation
- Paper note: [What Can RL Bring to VLA Generalization? An Empirical Study note](../notes/RL4Gen-note.md)

## Core Insight

在离散 action-token 的 OpenVLA 上，验证在线 PPO 相比 SFT 能更明显地提升语义泛化与动作执行鲁棒性，并给出一套比较省资源的 PPO 工程配方。



### 1. 建立 VLA 泛化评测框架

作者把机器人 VLA 的泛化能力拆成三个维度：

- **视觉泛化**：新桌面、背景、纹理、图像噪声；
- **语义泛化**：新物体、新容器、不同语言指令；
- **执行泛化**：物体位置、机器人初始位姿和动态扰动变化。

相比只报告训练任务成功率，这套分类试图回答：RL 究竟改善的是视觉识别、语言理解，还是闭环控制。

### 2. 系统比较 PPO、GRPO 和 DPO

论文将三种方法都接到 OpenVLA 上，并统一使用 LoRA 微调：

- PPO：标准 actor–critic、GAE 和 clipped ratio；
- GRPO：从相同初始状态采样一组轨迹估计相对 advantage；
- DPO：根据轨迹奖励构造偏好对。

实验中 PPO 明显优于 GRPO 和 DPO。作者认为，GRPO 容易受到多步机器人环境非平稳性的影响；DPO 则受到稀疏奖励、偏好数据构造困难和分布偏移的限制。

这部分的价值主要是：

> 说明 LLM 上流行的 RL/post-training 方法，不能不加修改地直接迁移到机器人 VLA。

### 3. 总结一套 OpenVLA + PPO 的训练配方

作者通过消融实验提出三个关键工程设计：

- **actor 和 critic 共享 OpenVLA backbone**，只额外增加 value head；
- 使用少量 demonstration 对策略进行 **warm-up**，避免初始策略过差；
- 每批 rollout 只训练 **1 个 PPO epoch**，避免过度重复使用旧数据。

项目页报告，共享 backbone 可节约约 45% 显存、提升约 53% 训练速度；warm-up 可减少约一半环境交互步数。

这大概是论文最具直接复现价值的部分，但属于工程 recipe，不是新的 PPO 目标函数。

### 4. 实证分析 RL 相比 SFT 改善了什么

论文的主要实验结论是：

- **视觉泛化**：RL 和 SFT 基本相当；
- **语义泛化**：RL 有中等幅度改善；
- **执行泛化**：RL 改善最明显。



## References
- AlphaXiv: https://www.alphaxiv.org/abs/2505.19789
- PDF: 
- Code: 
