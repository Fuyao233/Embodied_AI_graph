---
type: paper-note
paper_id: DexCap
created: 2026-07-31
---

# DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation Note

## Navigation
- Paper card: [DexCap: Scalable and Portable Mocap Data Collection System for Dexterous Manipulation card](../cards/DexCap.md)

## Reading Notes



1. **问题**：机器人要学习人类级别的灵巧操作，需要大量高质量示范；现有动作捕捉系统通常不便携、容易受遮挡影响，而人手动作也难以直接转换成机器人控制指令。
2. **DexCap**：作者提出一套便携式动作捕捉系统，同时采集手腕位姿、手指运动和三维环境信息，使人类可以在真实环境中自然完成任务并生成示范数据。
3. **DexIL**：通过逆运动学将人手动作重定向到机器人手，再利用点云观测和模仿学习训练机器人策略。执行失败时，还可以加入人类在线纠正数据进行微调。
4. **结果**：该系统在六种灵巧操作任务上取得较好效果，说明机器人可以利用在不同真实环境中采集的人类动作数据学习复杂操作。





### 残差控制如何实现

策略在时刻 $t$ 输出下一目标状态：
$$
a_t=(p_{t+1},J_{t+1})
$$
其中：

- $p_{t+1}$：机器人手腕/机械臂末端的目标位姿；
- $J_{t+1}$：LEAP Hand 的目标关节角。

操作者在 rollout 开始时保持一个初始手势：
$$
(p_0^H,J_0^H)
$$
随后 DexCap 实时计算人手相对初始手势的变化：
$$
(\Delta p_t^H,\Delta J_t^H)
$$
并将其作为残差叠加到策略动作：
$$
a'_t=
\left(
p_{t+1}\oplus \alpha\Delta p_t^H,\;
J_{t+1}+\beta\Delta J_t^H
\right)
$$
这里：

- $\oplus$ 表示位姿组合，而不是简单地把旋转矩阵逐元素相加；
- $\alpha$ 控制手腕修正幅度；
- $\beta$ 控制手指关节修正幅度；
- 作者将 $\beta$ 设为小于 $0.1$，避免机器人手指变化过快。

工程上，手部 T265 的跟踪数据由随身 mini-PC 采集，通过局域网 Redis 服务器发送给机器人工作站；工作站接收人手增量，并在每个控制周期将其叠加到策略动作。纠正数据以 20 Hz 采集。



并没有严格保证修正后的动作在可达空间内
