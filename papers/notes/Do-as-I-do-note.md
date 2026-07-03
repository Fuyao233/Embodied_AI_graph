---
type: paper-note
paper_id: Do-as-I-do
created: 2026-07-01
---

# Do as I Do: Dexterous Manipulation Data from Everyday Human Videos Note

## Navigation
- Paper card: [Do as I Do: Dexterous Manipulation Data from Everyday Human Videos card](../cards/Do-as-I-do.md)

## Reading Notes

数据是机器人学习的关键，但当前机器人主要依赖**体验性数据**（通过真实世界遥操作或模拟探索收集），而人类主要通过**观察性数据**学习（通过观看专家操作）。如何将从人类视频中获取的观察性数据转化为机器人的体验性数据，是一个重要挑战。



现有方法的局限：

- 遥操作：受限于操作者专业技能、操作成本和机械透明度
- 模拟探索：受限于设计多样化环境和奖励函数的复杂性
- 传统"Do as I do"方法：通常需要对行为（如仅限pick-and-place）或物体（如仅限3D扫描物体）做出假设，或依赖特殊硬件收集的数据（深度、3D、手部关键点等）





DO AS I DO 的贡献：

1. 提出一个两步算法：从单目RGB视频重建并重定向行为到多指灵巧手
2. **手部-物体重建**超越SOTA，能处理多样化视频（egocentric/exocentric、互联网视频、生成式视频模型输出）
3. **重定向过程**引入新组件，能鲁棒地处理噪声重建的参考轨迹
4. 生成的机器人数据可在真实灵巧手上执行，实现了**从互联网视频到真实灵巧手rollout的完整pipeline**





Sharpa Wave手和UR3e臂





### Related Works

![image-20260702114147399](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Do-as-I-do-note.assets/image-20260702114147399.png)

- Self：自己收集的数据
- Gen：由生成式视频模型生成的
- Ego：第一人称，如头戴摄像头拍摄
- Internet：来自互联网的视频



**从单目RGB视频重建4D手-物体交互**可分解为三个互补方向：

- 手部姿态估计：人类手的结构化形状和运动使得手部追踪模型对运动模糊、遮挡和低分辨率具有鲁棒性
- 物体重建和追踪：由于日常物体的多样性，这在野外噪声条件下仍然 substantially harder。近期进展来自图像条件的3D生成基础模型和基于模型的6-DoF追踪器
- 联合手-物体重建方法：同时推理手和物体信号，但范围仍然有限（如仅限egocentric或假设封闭物体类别）

DO AS I DO 采用模块化分解：HaWoR用于手部追踪，SAM3D用于单图像物体meshing，以及基于SAM3D的追踪用于物体姿态演化。

4D=3D+时间维度，指的是不仅要重建每一帧中手和物体的3D位置、姿态和形状，还要在整个视频时间序列中追踪他们的轨迹



**人类到机器人重定向**

灵巧重定向算法将人类手部姿态映射到具有 vastly different geometries 的机器人上：

- **运动学重定向方法**：通过求解几何、任务空间或关节空间优化，但仅操作机器人配置，不考虑手-物体之间的力，常导致穿透、指尖滑动和抓取不稳定
- **动力学感知重定向框架**：通过强化学习或基于采样的优化来追踪基于参考的奖励

**关键区别**：大多数 prior retargeting approaches 假设可用性clean references（如来自MoCap的ground-truth手-物体姿态），而 **DO AS I DO 处理更困难的设置**——noisier reconstructed references，可能存在时间不连续性和严重的手-物体错位。



### Method

1. 从视频中重建人手和物体的4D交互轨迹
2. 将上一步的交互轨迹“翻译”成机器人可执行的轨迹（重定向）



#### Reconstruction

注意：这一部分都是物体建模，完整的手部 4D 重建与跟踪由 HaWoR 完成，同时 MoGe 提供场景相对深度，并连接手和物体坐标系

| 模块       | 输入                           | 输出                                          | 在论文中的职责                         |
| ---------- | ------------------------------ | --------------------------------------------- | -------------------------------------- |
| **SAM 3**  | 视频帧                         | 手和物体的 2D mask                            | 分割，确定哪些像素属于手/物体          |
| **HaWoR**  | 整段视频中的手区域             | 人手 mesh、关节姿态、全局旋转和平移、相机轨迹 | **完整的手部 4D 重建与跟踪**           |
| **MoGe**   | 每一帧 RGB 图像                | 每像素 3D pointmap、深度、相机内参            | 提供场景相对深度，并连接手和物体坐标系 |
| **SAM 3D** | 图像、物体 mask、MoGe 几何信息 | 物体 mesh shape 和 6-DoF pose                 | **物体重建与逐帧跟踪**                 |



Q：为什么不用SAM 3D一起生成手？

因为手和普通刚性物体的结构差别很大。手是已知拓扑的关节物体，人手有强先验：

- 固定骨骼结构；

- 固定mesh topology；
- 约15个MANO关节；
- 有限的关节运动空间；
- 不同人的shape变化可以用低维参数 β 表示。

因此使用HaWoR/MANO，可以直接获得语义对应，这些语义是后续robot retargeting所必需的。

物体则是开放类别的刚体，不存在一个统一的参数化拓扑模型，所以要依靠SAM 3D这种开放类别image-to-3D生成模型恢复shape，再估计6-DoF pose。



**Object Tracking via Guided Diffusion**

这一步的难点就是SAM 3D虽然可以提取出 pose 和 shape，但是帧间不能保证时序的一致性，具体来说就是 shape 可能不固定，pose 可能发生跳变



SAM 3D流水线：

![img](https://github.com/facebookresearch/sam-3d-objects/raw/main/doc/arch.png)

这是一个两阶段的模型，第一阶段生成 pose 和 shape


\[
x_t^s
=
\underbrace{
(1-\alpha_s)\left(x_{t-\Delta}^s+\Delta v_\theta^s\right)
}_{\text{denoising}}
+
\underbrace{
\alpha_s x_{\mathrm{ref}}^s(t)
}_{\text{blending}},
\qquad
x_t^p
=
\underbrace{
(1-\alpha_p)\left(x_{t-\Delta}^p+\Delta v_\theta^p\right)
}_{\text{denoising}}
+
\underbrace{
\alpha_p x_{\mathrm{ref}}^p(t)
}_{\text{blending}}
\]
其中$\alpha_s\in[0.9,1]$, $\alpha_p$用的经验公式：
$$
\alpha_p(k)=\max\left(0.1,\;0.7-0.09\left|\Delta\theta_k\right|\right)
$$
这个 $\theta_k$ 是通过前后帧物体上关键点匹配然后计算了一个二维刚体变换然后从这个变换矩阵中提取的旋转角度

作者并不需要 $\Delta\theta_k$ 准确恢复物体的真实三维角速度，只需要粗略判断：

> 当前帧相对于上一帧，视觉变化是大还是小？

（主打一个工程）



Q：为什么不每次都固定$x_t^s=x_{\text{ref}}^s$？因为第一阶段是 MOE 架构，需要 $x^s_t$ 的中间量来计算 $x_t^p$



**Sampling Per-frame Poses**

这一步是从生成的N个 pose 里面选（一开始采样了N组噪声）



朴素想法是计算所有 pose 的概率选最高。但是flow matching计算概率比较麻烦，需要统计该 pose 对应的高斯噪声的积分。因此作者采用一种聚类的方法，效果上和计算概率相当，速度快了 30x



作者算法：

1. 得到 N 个 pose：$x_i^p$

2. 计算距离 $$d\!\left(x_i^p,x_j^p\right)=w_t\left\|t_i-t_j\right\|_2+w_r\cdot 2\arccos\!\left(\left|\langle q_i,q_j\rangle\right|\right)$$

   其中两个候选位姿写成：
   $$
   x_i^p=(t_i,q_i),\qquad x_j^p=(t_j,q_j),
   $$

   - $t_i,t_j\in\mathbb R^3$：物体的三维平移；
   - $q_i,q_j\in\mathbb R^4$：表示三维旋转的单位四元数；
   - $w_t,w_r$：分别控制平移误差和旋转误差的重要程度。

3. 过滤离群 cluster: 正确、高置信度的 pose 通常会有多个样本集中在附近；随机错误通常比较分散。因此规模很小的 cluster 被视为 outlier

4. 用 mask IoU 选择 cluster: 将候选 pose 下的固定物体 mesh 渲染到二维，比较渲染 silhouette 与当前帧分割 mask 的 IoU，从主要 cluster 中选出最符合当前图像的 pose





**Hand-Object Alignment**

因为手和物体的建模是两种方法，所以这一步要做的是对物体进行放缩和平移，保证尺寸的对齐。这一步以 HaWoR 的尺寸作为标准



（细节还不是很懂，涉及相机内参、深度估计，有待学习）





#### Retargeting







### Experiment

#### Setting

作者在两个带标注的数据集上评估：

- **DexYCB**：160 段视频；
- **HOI4D**：12 段视频。

为了单独评估物体重建与跟踪，实验中直接提供 ground-truth hand，只比较物体形状和 pose 的恢复质量。对比方法包括联合手物重建方法 HO、IHOI、HORSE、MCC-HO、G-HOP，以及 FoundationPose、Any6D 等 6D object tracker。指标为 F-5、F-10，越高越好；Chamfer Distance，越低越好。

此外，他们又收集了 **150 段更接近真实应用分布的视频**，来源包括互联网、第一视角数据集和生成视频。因为这些视频没有真实 6D pose 标注，所以使用人工偏好评估：每段视频由三名评审比较该方法和 FoundationPose 的 mesh reprojection 哪个更符合真实物体运动







#### Human Data Filtering Playbook

作者从已经声称包含 hand-object interaction 的 100DOH 中采样 2,000 个 10 秒视频片段，结果是：

- 只有 187 个，即 **9%**，包含有意义的手物交互；
- 其中 41 个手或物体离开画面；
- 29 个没有有效动作，或动作跨越镜头切换；
- 14 个因相机运动失败；
- 10 个因 SAM 3D 失败；
- 另有 10 个因其他原因失败；
- 最终只有 83 个，即约 **4%**，通过 reconstruction quality check。

即使假设未来模型解决 SAM 3D 和部分相机问题，作者估计也只有约 107 个，即 **5%** 的原始片段适合直接用于灵巧操作学习，相当于约 $20\times$ 的数据筛选损耗。

这部分带来的实际结论是：

> “互联网视频数量巨大”不等于“可用于机器人学习的数据数量巨大”。

用于 manipulation 的视频必须至少满足：

- 手和物体持续可见；
- 没有镜头切换；
- 动作本身具有明确操作意义；
- 相机运动不过于剧烈；
- 物体可以稳定分割和重建；
- 视频包含完整的接触状态变化。

因此，规模化利用互联网视频时，**自动化数据检索、动作切分和质量过滤可能与重建算法本身同等重要**。
