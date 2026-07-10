---
type: paper-note
paper_id: pi06
created: 2026-04-29
---

# PI0.6 Note

## Navigation
- Paper card: [PI0.6 card](../cards/pi06.md)

## Related Work

先前用RL提升VLA表现的技术路线：

- PPO及其变体训练：not scalable，数据利用率低
- 基于预训练VLA做强化学习微调.部分研究还探索了如何将学习到的行为提炼回VLA，以实现端到端的迭代改进：提升的是外接控制器，而不是 VLA 本身的能力



pi06：使用（迭代的）离线强化学习方法，对整个 VLA 模型进行端到端的训练，并采用表达力强的流匹配 VLA 模型（与pi05不同，pi06先用 offline RL/advantage conditioning 训练一个 $π^*_{₀.₆}$ base，再针对具体任务用 demonstrations 和真实机器人经验继续 fine-tune）



![image-20260426115121839](./pi06.assets/image-20260426115121839.png)



## Method



### **Recap Pipeline**

预训练的时候包括步骤2&3，后续训练包括所有步骤

#### **Data collection**

运行VLA做任务，并且打标签，同时可选提供一些人类介入的轨迹





#### **Value function training**

采用和



用上一步收集的数据训练一个多任务的value function



标注的时候采用稀疏reward：
$$
r_t =
\begin{cases}
0 & \text{if } t = T \text{ and success} \\
-C_{\text{fail}} & \text{if } t = T \text{ and failure} \\
-1 & \text{otherwise}
\end{cases}
$$
$C_{\text{fail}}$是一个很大的数。所以累积reward可以直接反映任务进程，越接近0，表明越接近成功



value function的输出$p_{\phi}(V|o_t,l)\in[-1,0]$, 间隔是$\frac 1 {200}$, 监督信号$R_t(\tau)$需要归一化然后离散为201维的向量$R^B_t(\tau)$（具体是hard on-hot还是插值论文没具体说），然后用cross-entropy训练
$$
\min _\phi \mathbb E_{\tau\in D}[\sum_{o_t\in \tau}H(R_t^B(\tau),p_\phi(V|o_t,l))] \\
R_t = \sum_{t=t'}^T r_{t'} \; (\text{MC estimation})
$$
输出时，
$$
V^{\pi_{\text{ref}}}(o_t, \ell) = \sum_{b \in [0, B]} p_\phi(V = b \mid o_t) v(b)
$$
$v(b)$是bin对应的值







#### **Advantage conditioned training**

value function 根据prefix给出轨迹是否足够优，根据这个作为条件训练VLA



policy extraction: 利用现有的价值函数训练一个改进策略，需要满足：

- 能有效利用多样化离策略数据，包括初始演示、专家干预以及来自最新策略和旧策略的自主训练片段
- scalable，易用与大型VLA
- 能够有效利用好数据和坏数据



**现存一些方法及问题**：

- 策略梯度：flow matching model不会输出动作分布，所以很难适配
- AWR：加权学习，即基于advantage赋予权重，没办法利用坏数据



最接近的方法：advantage conditioning，在所有数据上做supervised learning，同时在输入中加入基于advantage的最优性判断
$$
\min_{\theta} \mathbb{E}_{\mathcal{D}_{\pi_{\text{ref}}}} \left[ -\log \pi_\theta(a_t \mid o_t, \ell) - \alpha \log \pi_\theta(a_t \mid I_t, o_t, \ell) \right],
\\
\text{where,\;}
I_t = \mathbf{1}\left(A^{\pi_{\text{ref}}}(o_t, a_t, \ell) > \epsilon_\ell\right).
$$

**$I_t$融合：**根据示性函数结果将“Advantage: positive”或者“Advantage: negative”作为额外文本输入VLA

**Advantage 计算**：n-step advantage（论文中后训练时N=50，预训练为了省计算直接用的whole-episode, $A^\pi(o_t, a_t) =  \sum_{t'=t}^{T} r_{t'}  - V^\pi(o_t)$）
$$
A^\pi(o_t, a_t) = \mathbb{E}\left[ \sum_{t'=t}^{t+N-1} r_{t'} + V^\pi(o_{t+N}) \right] - V^\pi(o_t)
$$
**目标函数分析**：

- $\log \pi_\theta(a_t \mid o_t, \ell)$ 是为了保留参考策略
- $\log \pi_\theta(a_t \mid I_t, o_t, \ell)$ 是为了让模型学习 $I_t$ 和策略的关系，能够判断出哪些是好的策略



Inference的时候设置 $I_t=\text{positve}$



**关于$V^{\pi_\text{ref}}$**：这个 $\pi_\text{ref}$ 在预训练的时候是演示轨迹，在后训练的时候是demonstrations 和 learned policy return 的加权混合

**$\alpha$的选择**：实际训练中并没有这个 $\alpha$，而是通过 $30\%$ 可能 drop 掉 $I_t$ 实现的

**$\epsilon_l$的选择**：在预训练阶段，我们为每个任务选择阈值，使得大约 30% 的演示数据具有正优势（基于 1 万个数据点的随机样本计算得出）。在微调阶段，我们通常将阈值设置为使得每次迭代中大约 40% 的评估结果具有正优势。对于 T 恤和短裤的折叠任务（该任务在高质量演示数据上训练得到的策略速度较慢，但成功率较高），我们提高阈值，使得只有大约 10% 的数据具有正优势。







### IMPLEMENTATION, MODEL, AND SYSTEM DETAILS

<img src=".\pi06-note.assets\image-20260513175558946.png" alt="image-20260513175558946" style="zoom: 67%;" />

metadata：文本化的任务上下文 / 条件控制信息，可能是执行风格或者环境条件等等，比较神秘（其实是 $\pi_{0.7}$ 的核心机制之一）

<img src=".\pi06-note.assets\image-20260513173909964.png" alt="image-20260513173909964" style="zoom:50%;" />

#### pi06

总对数似然：
$$
\log \pi_\theta(a_{t:t+H}, a_{t:t+H}^\ell, \hat{\ell} | I_t, o_t, \ell)
= \underbrace{\log \pi_\theta(\hat{\ell} | I_t, o_t, \ell)}_{\text{高层子任务}}
+ \underbrace{\log \pi_\theta(a_{t:t+H}^\ell | I_t, o_t, \ell, \hat{\ell})}_{\text{离散化动作 (FAST)}}
+ \underbrace{\log \pi_\theta(a_{t:t+H} | I_t, o_t, \ell, \hat{\ell})}_{\text{连续动作块}}
$$

- 沿用pi05的subtask规划
- 离散动作化来自 KI（knowledge insulation） 训练方案



#### Value model

使用和主干同架构的Gemma 3但是超参（层数、隐藏层维度、注意力头数）缩小的模型（词表、层结构等都是一样的）



 **RECAP 后训练阶段所收集数据构成**:

| 任务                          | 数据细节                                                     |
| ----------------------------- | ------------------------------------------------------------ |
| T-shirt / shorts laundry      | 使用 autonomous evaluation data，不用 expert corrections；收集 300 episodes，4 个 robot stations |
| Diverse laundry               | 450 evaluation episodes + 287 correction episodes            |
| Failure-mode removal ablation | 约 1000 autonomous episodes，外加 280 + 378 correction episodes，3 台机器人 |
| Box assembly                  | deployment 场景中直接收集；每轮 600 demonstrations + 360 correction episodes，3 台机器人 |
| Cafe                          | 单轮迭代；429 correction episodes + 414 autonomous episodes  |

真实数据规模并不小，并且不同任务的数据配方差异明显



### Evaluation

**Task**

| 类别     | 任务变体     | 机器人需要完成的操作                               | 成功标准                                                     | 主要考察能力                              |
| -------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| 衣物折叠 | T 恤和短裤   | 从篮子取出衣物、铺平、折叠并堆放                   | **200 秒内**正确折叠，并放到桌面右上角                       | 基础布料操作、对不同初始状态的适应性      |
| 衣物折叠 | 多样衣物     | 处理毛巾、衬衫、毛衣、牛仔裤、袜子等 **11 类衣物** | 评测时主要使用较难的纽扣衬衫；需在 **500 秒内**折好并放入衣物堆 | 对不同形状、材质和结构衣物的泛化          |
| 衣物折叠 | 定向失败消除 | 从固定状态折叠一件橙色 T 恤                        | **200 秒内**正确折叠，且衣领必须始终朝上                     | 检验 RECAP 能否消除“衣领朝下”这一特定错误 |
| 咖啡制作 | 双份意式浓缩 | 取手柄、磨豆、压粉、锁入咖啡机、取杯、萃取并上杯   | **200 秒内**完成全部步骤，且不能掉落手柄或洒出咖啡           | 长时程规划、精细操作、力控制与液体处理    |
| 纸箱组装 | 完整纸箱流程 | 从平纸板开始，折叠纸箱、贴标签并放入周转箱         | **600 秒内**完成组装、贴标和堆放                             | 形变物体操作、受力操作、多阶段任务执行    |



**Camparision**

| 模型                               | 训练方式                                               | 用途                         |
| ---------------------------------- | ------------------------------------------------------ | ---------------------------- |
| Pre-trained ($\pi_{0.5}$)          | 纯监督预训练，不使用 RL 或 RECAP                       | 较早一代 VLA 基线            |
| Pre-trained ($\pi_{0.6}$)          | 更新的监督预训练模型，但没有 advantage indicator       | 衡量基础模型升级带来的收益   |
| RL pre-trained ($\pi^{*}_{0.6}$)   | 在通用预训练阶段同时训练价值函数，并加入优势条件       | 衡量离线 RL 预训练是否有帮助 |
| ($\pi^{*}_{0.6}$) Offline RL + SFT | 在 RL 预训练模型上，使用目标任务的人类演示进行监督微调 | 衡量目标任务示范数据的作用   |
| ($\pi^{*}_{0.6}$) Ours             | 完整 RECAP，加入自主执行轨迹、奖励标签和专家纠正       | 衡量真实机器人经验带来的增益 |



**AWR**

AWR，即 Advantage-Weighted Regression：

- 从不包含优势条件的预训练 $\pi_{0.6}$ 开始；
- 使用论文价值函数计算出的 advantage；
- 高优势动作获得更高训练权重；
- 低优势动作被降低权重或基本忽略。

它仍属于监督回归式更新，但与 RECAP 的区别是：AWR 通过**样本权重**表达动作质量，而 RECAP 把优势作为模型的**条件输入**。

**PPO**

作者实现的是适配 flow-matching VLA 的 PPO 变体：

- 参考 DPPO/FPO；
- 通过单步 diffusion objective 近似动作似然；
- 使用 SPO 风格的 trust-region 约束，以提高离策略训练稳定性。

设置 PPO 的目的，是检验传统策略梯度方法能否有效扩展到大型、包含自回归输出和 flow-matching 动作头的 VLA。





**量化评估**

指标：成功率、吞吐量（每小时成功执行的任务数量）

![image-20260710142921771](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710142921771.png)

![image-20260710142947754](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710142947754.png)

没加SFT但是仍有成功率是因为预训练中有过类似的数据



**1. 完整 RECAP 是否有效？**（Fig. 8）

有效，而且收益主要来自**目标任务上的真实机器人经验**。

从 $\pi^{*}_{0.6}$ Offline RL + SFT 到最终 RECAP：

- 多样衣物折叠和 espresso 的吞吐量提升到原来的两倍以上；
- 两个困难任务的失败率大约降低一半；
- 简单衣物折叠在 SFT 后成功率已接近饱和，但 RECAP 仍显著提高执行速度；
- 除多样衣物外，最终模型在其他任务上的成功率达到 90% 以上；
- 纸箱任务中，最终模型在拾取、组装、贴标和放置各阶段都最稳定。

这里最重要的不是“RL 预训练模型比监督预训练模型强多少”，而是：
$$
\text{Offline RL pretrain}
\rightarrow
\text{task SFT}
\rightarrow
\text{on-robot RECAP}
$$
这条完整流程能够不断提高真实部署性能。



**2. 多轮训练是否继续提升？**(Fig 9, 10)

可以，但不一定每一轮都单调提升。

- T 恤和短裤任务只使用自主轨迹，两轮后吞吐量总体提高约 50%；第一轮成功率已经超过 90%，第二轮主要改善速度。
- 纸箱任务第一轮吞吐量反而下降，第二轮才明显上升，最终吞吐量约为初始策略的两倍。
- 这说明复杂长时程任务需要更多数据，单轮更新出现性能波动并不罕见。

![image-20260710143957571](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710143957571.png)

![image-20260710144012836](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710144012836.png)







**3. Advantage conditioning 是否优于 AWR 和 PPO？**(Fig. 11)

在论文的设置下，明显优于。

- PPO 在离策略数据上很难稳定，必须使用很小的 trust-region 参数 $\eta=0.01$，但最终性能仍较差。
- AWR 可以获得合理成功率，但策略执行较慢，因此吞吐量较低。
- RECAP 的 advantage-conditioned policy 在吞吐量上显著领先。

![image-20260710144102816](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710144102816.png)





**4. RECAP 能否定向移除一种错误？**(Fig. 12)

可以。

在固定橙色 T 恤任务中，基线经常把衣领折反。经过两轮 RECAP、每轮 600 条自主轨迹后：

- 成功率达到 97%；
- 不需要新演示；
- 不需要专家干预。

因此，RECAP 不仅能整体改善策略，还能像“行为补丁”一样，针对某个失败模式进行优化。

![image-20260710145343496](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/pi06-note.assets/image-20260710145343496.png)

这种strict criteria通过标注success label来影响模型行为






## Q:

### 为什么value function是学习分布？

**训练目标本身是noisy的**

同一个 $o_t,l$ 可能对应不同的后续结果

例如任务是：
$$
ℓ=\text{make espresso}
$$
当前图像 $o_t$：杯子已经放到咖啡机下面。

数据里可能有两种后续：

| 后续轨迹               | return |
| ---------------------- | ------ |
| 正确按下按钮，成功萃取 | −0.1   |
| 机械臂碰歪杯子，失败   | −1.0   |

这比单个 −0.55-0.55−0.55 更忠实地表示：**这个状态有一半概率通向成功，一半概率通向失败**



还有就是因为这个critic model是用MC训练的，用这种分布+cross entropy的方法可以减小离群点的影响



### 示性函数的输出如何作为条件？

把True/False的输出作为token加入到prefix中，不会被忽略？存疑

