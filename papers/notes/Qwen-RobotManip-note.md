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





**Representation alignment**

将不同embodiment的状态和动作映射到相同的80维空间，每个臂29维

-  Joint positions (7 dims): joint positions for the robot arm;
- End-effector pose (9 dims): Cartesian position (3) and orientation in a 6D continuous rotation representation (Zhou et al., 2019) (6);
- Gripper state (1 dim): joint position for the parallel gripper;
- Dexterous hand joints (12 dims): active hand joint positions for embodiments equipped with multifingered dexterous hands.

没有的就补0然后计算loss的时候mask



最后 22 个预留维度由两个机械臂共享，可用于额外的自由度，例如移动基座速度。状态向量的所有值均以绝对坐标表示。

动作向量中，关节动作以绝对值表示，末端执行器动作以相对于当前状态的相对增量表示。



**Motion Alignment**

[相机参数](../../common_knowledge/相机参数.md)

这一步是对齐不同相机

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



