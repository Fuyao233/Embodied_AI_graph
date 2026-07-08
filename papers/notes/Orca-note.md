---
type: paper-note
paper_id: Orca
created: 2026-07-07
---

# Orca: The World is in Your Mind Note

## Navigation
- Paper card: [Orca: The World is in Your Mind card](../cards/Orca.md)

## Reading Notes

![image-20260707155504232](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260707155504232.png)

主要架构就是这种先预训练 encoder 然后在下游任务上冻结再训练一个任务对应的 readout，主要创新在预训练方法上



### Pretraining

![image-20260708093959848](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708093959848.png)
$$
S_{t+\Delta} \sim p_{\Theta}\left(S_{t+\Delta}\mid S_t, z_t, c_t\right), \quad \Delta \in \mathbb{Z}_{\ne 0}
$$
$z$ 是隐动力学条件，orca没有显式建模；$v_t$ 来自冻结的 encoder，具体就是Qwen3.5自带的ViT





输入使用：`<visual token>, <Query 1>, <Instruction>, <Query 2>`来兼容两种 learning

unconscious learning：q1 经过两层 MLP 和目标对齐

conscious learning：q2 和目标对齐



**训练损失**：
$$
\mathcal{L} = \lambda_{obs}\mathcal{L}_{obs} + \lambda _{evt}\mathcal{L}_{evt}+\lambda_{vqa}\mathcal{L}_{vqa}
$$
相比于 JEPA/V-JEPA, Orca 的差异主要是加了语言条件和双向 event transition, $\mathcal{L}_{obs}$ 基本就是沿用

具体的权重：$\lambda_{obs}=0.1$, $\lambda_{evt}=0.5$, $\lambda_{vqa}=0.4$

数据采样层面，state transition samples 和 VQA samples 大约按 `5:1` 混合



latent matching loss 是：

```
0.1 × MSE + 0.9 × cosine distance
```

也就是同时约束数值距离和方向相似性

L_evt = 1/2 [ previous-event latent matching + next-event latent matching ], 同时预测未来和过去，建立双向因果

控制模型输出 previous 还是 next 主要依靠 instruction





**数据组织**：

![image-20260708102209096](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708102209096.png)

标注清洗过滤细节？



### Evaluation

主要证明：**Orca 的 world latent 能随规模变强**，再证明这个 latent 能通过冻结 backbone 后的轻量 readout，迁移到文本、图像、动作三类任务

#### Effectiveness and Scaling Behavior

![image-20260708104504862](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708104504862.png)

这一部分回答 Question 1.1：随着模型大小和数据规模增加，Orca 的学习范式是否有效。实验比较 0.8B 和 4B 两种规模，横轴是预训练视频小时数，纵轴是总 loss。结果是总 loss 随数据规模持续下降，且 4B 模型比 0.8B 获得更低 objective loss。作者据此认为 Orca 的学习范式可以有效构建 world latent，而且还没有快速收敛，继续增加数据和模型规模仍有收益。

![image-20260708104545754](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708104545754.png)

这一部分回答 Question 1.2：更强的预训练 latent 是否能带来更强的下游 readout。作者从 Orca-0.8B 和 Orca-4B 的预训练过程中取多个 checkpoint，分别接到文本、图像、动作 readout 上做 probe；文本分数是 TemporalBench、MVBench、SWITCH、3DRSBench 平均，图像是 PRICE-V0.1 平均，动作是五个真实机器人 OOD 任务平均。结果显示，随着预训练数据增加，文本、图像、动作 readout 都提升





#### Downstream Readout Analysis

**Text Generation**

![image-20260708105206579](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708105206579.png)





| Benchmark         | 主要测什么             | 更具体的能力                                                 | 在 Orca 里对应的意义                                 |
| ----------------- | ---------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| **MVBench**       | 通用视频理解           | 动作识别、动作定位、物体交互、事件级理解、动作顺序、状态变化、反事实推理等 | 看模型是否能理解视频里“发生了什么”，不是只看单帧图像 |
| **TemporalBench** | 细粒度时间动态         | 动作频率、运动幅度、事件先后顺序、短视频/长视频时间推理      | 看模型是否真正理解时间顺序和动态变化                 |
| **3DSRBench**     | 3D 空间推理            | 高低、前后左右、朝向、位置、多个物体之间的三维关系           | 看模型是否有 3D 几何和空间关系理解                   |
| **SWITCH**        | 真实世界交互与状态转移 | 识别真实控制接口、理解操作目标、预测按钮/开关/设备操作后的结果、验证操作是否成功 | 看模型是否理解“做一个动作后，世界状态会怎么变”       |

这些benchmark的形式：

```
Input:
Video: 一个人拿起杯子，把水倒进锅里
Question: What does the person do after picking up the cup?
Options:
A. Puts it on the shelf
B. Pours water into the pot
C. Throws it away
D. Washes it

Output:
B
```



**Image Prediction**

![image-20260708110444187](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708110444187.png)

**PRICE-V0.1 = Prediction of Real-world Interactions with Constraints Evaluation**。

它是作者自建的一个 **instruction-conditioned image-to-image generation / TI2I** benchmark。输入是：

> 初始状态图像 + 动作/交互指令
>  输出：动作执行后的目标状态图像

例如：给一张桌面图和指令“把杯子拿起来 / 打开抽屉 / 移动物体”，模型要生成执行后的画面。重点不是“画得好不好看”，而是：

1. 指令结果有没有发生；
2. 场景、视角、物体布局是否保持一致；
3. 结果是否符合物理常识，不能凭空多出物体、物体瞬移、手/机器人姿态不变但物体状态变了。论文明确说 PRICE 关注真实物理环境中指令造成的状态变化，而不是传统 image editing。

每列是用不同的AI模型打分（太草了），提示词核心内容大概是：

```
你是一个实际 benchmark evaluator，使用宽松通过标准。

输入：
- original image
- modified image
- modification instruction

任务：
根据指令执行效果给 1–5 的整数分。

高分条件：
- 指令意图的结果清楚可见；
- 对 agent-action 指令，结果不能只是物体瞬移；
- 如果人/机器人应该执行动作，但姿态、位置、接触状态几乎没变，要扣分；
- 允许执行中状态或不完美执行；
- 轻微遮挡、模糊、细节损失不直接判失败。

输出：
JSON only:
{
  "score": 3,
  "reasoning": "..."
}
```



**Action generation**

动作生成用双臂轮式机器人，任务包括 Take Book、Stacked Bowls、Pull Out Tissue、Stamp、Scoop Sugar，并设置 environment OOD 和 object OOD。每个任务只用 200 条真实机器人轨迹做 Action Expert post-training；environment OOD 改变未见过的桌布/背景，object OOD 用语义相关但未见过的对象替换训练对象



指标分两类：一是 rule-based score，把每个任务拆成关键阶段，统计终止前最高完成阶段；二是 PRM-as-a-Judge 的轨迹级诊断，包括 M25、M50、SR、MaxP-F、FNS、DRR、SQS 等，用于衡量进度、成功率、失败前进展和恢复能力。

![image-20260708111546010](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708111546010.png)

和$\pi_{0.5}$打得有来有会

错误恢复能力确实不错，这个指标主要看DRR



#### Ablation Study

![image-20260708112528249](/home/caiyinghao/桌面/Embodied_AI_graph/papers/notes/Orca-note.assets/image-20260708112528249.png)

比较难绷，本文最大创新是 event-conditioned based transition，但是发现去掉这个 loss 之后反而 action generation 上升，text generation也没掉多少，仅仅只是image prediction这个训练对应的任务不能做 :laughing:	



### Coclusion

- **模态太少**：目前基本只有 **vision + language**。真正的 world model 还应该加入：

  - audio

  - tactile

  - force

  - proprioception

  - light

  - 更多科学信号

​	作者认为目前学习到的 world latent 只是完整世界状态的一小部分。

- **监督空间仍然依赖已有 ViT/VLM**：目前 latent prediction 是对齐到冻结视觉编码器产生的 latent。作者承认

  > 真正的 world foundation model 不应该依赖某个已有 ViT 的 embedding space，而应该直接从多模态信号学习 native world latent。

- **模型规模太小**：实验只做到0.8B&4B。他们已经准备了125K 小时视频和160M event annotation，但论文实际上只用了 **十分之一的数据**。他们认为目前主要受模型容量限制。

- **Image benchmark 太弱**：PRICE-V0.1 是作者自己提出的新 benchmark。他们承认：

  - 数据规模有限

  - diversity 不够

  - interaction richness 不够

​	只能作为第一版 benchmark。

- **Event supervision 太短**：目前 event annotation 基本都是minute-level & short horizon, 因此只能学习局部状态变化。对于：小时级, 天级, 长期规划基本没有覆盖。

- **Readout 太少**: 作者认为真正 world latent 应该还能支持hearing, protein, quantum, AI for Science等等

- **Loss 设计仍然不够自然**. 作者直接承认：目前需要observation loss, event loss, VQA loss三个 loss 一起训练。他们认为真正的 Next-State Prediction 应该有**更统一、更简单**的监督方式。

- **Embodied benchmark 太简单**. 现在机器人任务其实还是短任务、简单 manipulation，距离真正 embodied intelligence 很远。



**Future Works**

未来方向主要有五个：

1. **加入更多模态**（audio、force、touch……）
2. **摆脱 ViT latent，训练 native world latent**
3. **建立统一的 world-model evaluation**（状态预测、干预、反事实等）
4. **Model–Data–Evaluation 自演化闭环**（模型自己生成数据→自动评估→再训练）
5. **扩展到 AI for Science**（生命科学、量子、宇宙等）。
