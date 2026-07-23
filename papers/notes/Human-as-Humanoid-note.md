---
type: paper-note
paper_id: Human-as-Humanoid
created: 2026-07-21
---

# Human-as-Humanoid: Enabling Zero-Shot Humanoid Learning from Ego-Exo Human Videos with Human-Aligned Embodiments Note

## Navigation
- Paper card: [Human-as-Humanoid: Enabling Zero-Shot Humanoid Learning from Ego-Exo Human Videos with Human-Aligned Embodiments card](../cards/Human-as-Humanoid.md)

## Reading Notes

**Human-as-Humanoid** 提出了一套将人类 ego-exo 视频近乎实时地转化为 60-DoF 人形机器人可执行动作标签的流水线，使仅用人类演示数据训练的 VLA 策略能在真实机器人上零样本部署，无需目标任务的真机演示。



利用 human-centric data 的痛点：人类演示和机器人动作之间的 gap



### Introduction

#### 1. VLA 的瓶颈不只是模型，而是动作数据

VLA 模型输入视觉观察和语言指令，输出机器人动作。因此训练数据必须同时包含：
$$
(\text{observation},\ \text{language},\ \text{robot action})
$$
视觉和语言数据相对容易扩展，但机器人动作标签必须符合具体机器人的形态、关节定义和控制器接口。对于带灵巧手、腰部和颈部的人形机器人，动作维度高，而且动作表示高度依赖硬件。

这里作者强调了一个关键区别：

- 普通夹爪机器人可以用“末端位姿 + 夹爪开合”描述动作；
- 灵巧人形机器人还需要描述手指预形状、指尖接触、双手协调、手臂冗余以及关节级控制命令。

所以，高自由度人形机器人的数据问题，本质上是**如何获得既可执行、又保留精细操作几何关系的动作标签**。



#### 2. 遥操作的数据质量高，但扩展性差

传统遥操作直接控制目标机器人，记录下来的轨迹天然满足：

- 关节顺序正确；
- 关节范围合法；
- 控制接口兼容；
- 动作能够在真实机器人上执行。

问题是采集速度受到机器人运行速度、安全约束、场景复位和设备数量限制。高自由度人形机器人的遥操作尤其慢，难以覆盖大量任务和环境。

作者于是提出 Introduction 中最核心的问题：

> 如何减少对机器人端遥操作的依赖，同时不丢失“可执行的动作监督”？



#### 3. 人类视频丰富，但不是机器人训练数据

人类示范具备明显优势：

- 采集快；
- 双手操作自然；
- 包含抓取、换手、重抓、接触时序和主动观察；
- 第一视角视频与机器人头部相机比较接近。

但原始视频没有目标机器人的动作标签，而且人与机器人之间存在：

- 身体比例差异；
- 关节结构差异；
- 手部形态差异；
- 自由度差异；
- 相机视角差异；
- 可达空间差异。

因此，作者认为问题不是“多收集人类视频”，而是：

> **把人类行为转换成 robot-learnable 且 robot-executable 的监督。**

这是整篇论文的问题重定义。



#### 4.  四类对齐：Introduction 的核心框架

作者把转换问题拆成四个相互耦合的要求。

##### ① Embodiment alignment：形态对齐

机器人本身要尽量接近人类的操作尺度，包括肩宽、臂长、手的大小、可达空间和传感器位置。

论文使用专门设计的 PrimeU：

- 双臂 14 DoF；
- 双灵巧手 40 DoF；
- 颈部 3 DoF；
- 腰部 3 DoF；
- 总计 60 DoF。

这里的思想比较特别：作者不是只在算法末端处理 embodiment gap，而是从机器人硬件设计阶段就缩小差距。

##### ② Observation–motion compatibility：观察与运动恢复兼容

单一第一视角存在严重遮挡，尤其是手和上肢。因此作者同步采集：

- **Ego view**：头戴第一视角，作为未来 VLA 的视觉输入；
- **Exo view**：外部第三视角，用于稳定恢复人体、手部和上肢运动。

也就是说，两类相机承担不同职责：
$$
\text{Ego} \rightarrow \text{policy observation}
$$
这种设计避免了一个常见冲突：适合策略部署的视角，未必适合动作估计。

##### ③ Action-interface alignment：动作接口对齐

恢复出人体骨架还不够。人体姿态必须进一步转换成符合 PrimeU 的：

- 关节顺序；
- URDF 坐标约定；
- 关节限制；
- 控制器输入格式。

作者使用分阶段逆运动学 IK，把人体动作转换为机器人 60-DoF joint-space action chunks。最终数据不是“人体姿态标注”，而是可以直接用于机器人策略训练的动作序列。

##### ④ Joint–task consistency：关节空间与任务空间一致

策略必须输出关节命令，因为关节命令能够直接执行。但精细操作成败通常取决于：

- 手腕位置和方向；
- 指尖位置；
- 双手之间的空间关系；
- 接触几何。

只在关节空间计算损失，可能出现“关节角误差不大，但指尖偏移很大”的情况。

因此作者在训练时加入 FK-aware supervision：
$$
\text{predicted joints}
\overset{\text{FK}}{\longrightarrow}
\text{wrist/fingertip geometry}
$$
策略仍然输出可执行的关节动作，但损失函数同时约束手腕和指尖的任务空间几何。



#### 方法与四类问题是一一对应的

整篇方法可以压缩成：
$$
\text{Ego–Exo Human Videos}
\rightarrow
\text{Human Motion Recovery}
\rightarrow
\text{Staged IK Retargeting}
\rightarrow
\text{60-DoF Robot Actions}
\rightarrow
\text{FK-aware VLA Training}
$$
其中：

- PrimeU 解决形态差异；
- Ego–Exo 解决观察与运动恢复冲突；
- Staged IK 解决控制接口转换；
- FK supervision 解决关节输出与接触几何之间的错位。

从 Introduction 的组织方式看，论文最主要的贡献不是单一网络结构，而是一个**硬件、数据采集、运动恢复、动作表示与训练目标协同设计的完整转换链条**。



**观察和运动恢复冲突**

ego 数据适合做机器人策略输入但是 ego 数据看不清操作者的身体，没办法恢复人体三维骨架，所以需要 exo 数据



**控制接口转换**
$$
\text{人体关键点/姿态}
\rightarrow
\text{PrimeU 的可执行关节命令}
$$
例如人体动作恢复系统给出的可能是：

```
右手腕三维位置：(x, y, z)
右手掌朝向：R
右肘位置：p_elbow
食指指尖位置：p_index
拇指指尖位置：p_thumb
```

这些都只是**任务空间或人体几何信息**，不能直接发送给机器人电机。

PrimeU 的控制器需要的是一个固定格式的 60-DoF 向量，例如概念上：
$$
q=
[
q_{\text{left arm}},
q_{\text{right arm}},
q_{\text{left hand}},
q_{\text{right hand}},
q_{\text{neck}},
q_{\text{waist}}
]
$$
其中包含：

- 双臂 14 个关节；
- 双手 40 个关节；
- 颈部 3 个关节；
- 腰部 3 个关节。

论文从数据生成、训练到实际部署都采用相同的 PrimeU URDF、关节排序和控制接口。



Staged IK，分阶段逆运动学。论文给出的顺序是：

1. 手部；
2. 手臂和手腕；
3. 颈部和腰部；
4. 合法性检查与平滑



同时在训练中用 **FK-constrain，不止要求关节角相近还要姿态相近**





#### Introduction 中的主要结果主张

作者在 Introduction 里提前给出四类证据：

1. 转换管线约以 20 FPS 运行；
2. 相比动作捕捉式人形机器人遥操作，原始 demonstration throughput 提升约 4.8–7.2 倍；
3. 人类数据生成的动作表示能够以较低误差重构未见过的真实机器人轨迹；
4. 仅使用转换后的人类目标任务示范进行微调，策略可以部署到倒水、装包、拧盖和套环等真实机器人任务，不需要这些目标任务的机器人示范。

需要注意两个措辞：

- 作者说的是 **raw demonstration-throughput gain**，不等同于有效数据量提升 4.8–7.2 倍；
- “zero-shot”主要指**没有目标任务的机器人示范**，并不表示不需要机器人模型、URDF、控制器、硬件标定或机器人相关训练基础。论文后面的限制部分也明确限定了这一点。





#### 局限性

**“通用性”可能受到硬件绑定限制**

方法依赖 PrimeU 的人体尺度、60-DoF 结构、URDF 和控制接口。它证明的是人类数据可以高效服务于一个经过专门对齐的目标 embodiment，而不一定能直接迁移到任意已有机器人。

论文后文也承认，换机器人需要重新进行动作维度和 retargeting 适配。



**人类视频主要提供运动学，而不是动力学**

视频和 IK 能恢复“手应该放在哪里”，但较难直接提供：

- 接触力；
- 摩擦；
- 抓握压力；
- 局部滑动；
- 电机动力学。
