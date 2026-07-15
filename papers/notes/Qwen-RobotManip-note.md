---
type: paper-note
paper_id: Qwen-RobotManip
created: 2026-07-08
---

# RoboManipBaselines: A Unified Framework for Imitation Learning in Robotic Manipulation across Real and Simulation Environments Note

## Navigation
- Paper card: [RoboManipBaselines: A Unified Framework for Imitation Learning in Robotic Manipulation across Real and Simulation Environments card](../cards/Qwen-RobotManip.md)

## Reading Notes



![image-20260708151840137](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Qwen-RobotManip-note.assets/image-20260708151840137.png)

这篇最大的亮点在如何将不同源数据联合起来训练





### **Representation alignment**

将不同embodiment的状态和动作映射到相同的80维空间，每个臂29维

-  Joint positions (7 dims): joint positions for the robot arm;
- End-effector pose (9 dims): Cartesian position (3) and orientation in a 6D continuous rotation representation (Zhou et al., 2019) (6);
- Gripper state (1 dim): joint position for the parallel gripper;
- Dexterous hand joints (12 dims): active hand joint positions for embodiments equipped with multifingered dexterous hands.

没有的就补0然后计算loss的时候mask



最后 22 个预留维度由两个机械臂共享，可用于额外的自由度，例如移动基座速度。状态向量的所有值均以绝对坐标表示。

动作向量中，关节动作以绝对值表示，末端执行器动作以相对于当前状态的相对增量表示。



#### **Motion Alignment**

[相机参数](../../common_knowledge/相机参数.md)

这一步是对齐不同相机

##### 动机

同样是图像右侧 40 像素的位置：

**广角相机**
$$
f_x = 300
$$
说明这条射线偏离中心较大，视锥张得比较开。

**长焦相机**
$$
f_x = 1000
$$
说明这条射线偏离中心较小，视锥更窄。

所以，即使两个物体都在“图像右侧 40 像素”，它们对应的真实空间方向也不一样。这就是 Qwen-RobotManip 要把内参编码进 visual token 的原因。



##### 流程

**选取 reference frame**

原始数据中的 delta 的坐标系都是 robot base frame，不同的 embodiment 定义的坐标系不同就会导致相似的动作在不同 embodiment 下表示的 delta 不一样



例子：

**Franka**

Franka 的 base frame 可能是：

```
+x_base = 向右
+y_base = 向前
+z_base = 向上
```

动作在 base frame 下：

```
Δp_base = [+5cm, +2cm, 0]
```

**UR**

UR 机器人可能反向安装，base frame 是：

```
+x_base = 向左
+y_base = 向前
+z_base = 向上
```

同样的视觉动作在 UR base frame 下可能变成：

```
Δp_base = [-5cm, +2cm, 0]
```



reference camera $C$ 是从当前样本已有的、已标定的相机集合里选出来的一个真实相机坐标系。

训练过程中 reference frame 选择策略：

- 对于单臂数据集，我们随机选择任意可用的外部或腕戴式视角作为参考视角
- 对于双臂数据集，我们随机应用以下两种策略之一：
  - 双臂共享一个头戴式摄像头或任意可用的第三人称视角作为共同的参考坐标系
  - 左臂使用左腕戴式摄像头，右臂使用右腕戴式摄像头作为各自的参考坐标系。

推理的时候固定选择 reference frame





**将动作转为  reference frame 中的动作**

$$
a_p^c
=
\begin{bmatrix}
{}^c_e R \; {}^e_{e^*}R \; {}^e_c R
&
{}^c_e R \; {}^e t_{e^*}
\\
0 & 1
\end{bmatrix}
$$
${}^e_{e^*} R, ^et_{e^*}$ 指的是 EEF 坐标下的位移和旋转；$^c_eR$ 是 EEF 坐标系到 reference frame 的变换矩阵

这里说明在此步之前会先把数据从 base frame 下转到 EEF frame 中

 

其实还可以用另一种形式，用齐次变换矩阵直接连接两个坐标系的动作：
$$
a^c_p={}^c_{e^*}T^e_{c}T
$$
但是这会导致平移部分有旋转项，这种平移旋转的耦合使其更容易受到长尾分布的影响，且对标定误差更为敏感

（我推测可能是因为语义不清晰，如果用齐次变换表示则齐次矩阵的平移项就不等于真实的平移，而是混合了旋转的部分）



**通过 CaPE 注入相机内参**

CaPE 来自 EscherNet 的 Camera Positional Encoding。EscherNet 的核心观点是：在 3D 视觉里，token 的“位置”不是文本中的第几个词，而是**相机位姿**；两个视角之间的关系只依赖它们的**相对相机变换**，而不依赖某个任意的全局坐标系。EscherNet 论文也明确说，CaPE 让 key/query 的 attention map 学习 relative camera poses，并且不依赖 specific coordinate systems。

普通 RoPE 的性质是：
$$
q_m^\top k_n
$$
可以变成依赖相对位置：
$$
m-n
$$
CaPE 类似，只是把“序列位置差”换成“相机相对位姿”：
$$
P_i^{-1}P_j
$$
其中 $P_i, P_j$ 是两个 token 所属相机的 pose。



CaPE 并非本文原创，而是引自 [EscherNet: A Generative Model for Scalable View Synthesis](https://arxiv.org/pdf/2402.03908)



CaPE 注入在 DiT **action expert** 的 cross-attention layers(因为内参是和画面相关的) 中。它在每个 64D attention head 中占 32D，用来编码 camera pose；剩下 32D 继续用 RoPE 编码时间位置。



```
DiT action expert block
  ├── self-attention over action/state tokens
  │     └── RoPE: 处理 temporal / action-chunk 位置
  │
  ├── cross-attention: action/state tokens attend VLM/image tokens
  │     ├── CaPE: 处理 camera pose / reference camera geometry
  │     └── RoPE: 处理 temporal indexing 的那部分维度
  │
  └── MLP
```







希望学习一种**跨视角的泛化**，能够把相机内参作为条件，理解不同视角下相同的动作
