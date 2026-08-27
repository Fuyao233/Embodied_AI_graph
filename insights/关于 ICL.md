# 关于 ICL

语言作为提示可以提示更长程的任务，也更简单一些





# Question 

我认为其实视频示范的作用其实和pi07演示的用语言教会机器人做新动作是异曲同工的。首先基础模型学会了如何做原子动作，示范/提示的作用就是教模型如何把原子动作组合起来。但是似乎和你上面提到的这个“不是 Transformer 架构本身突然会 ICL；是数据分布终于让 “忽略 context” 成为一个坏策略”不太一样。我觉得你说的这个观点很有意思，能比较分析一下这两个思想吗？



# Answer



对。我会把你的观点和我前面的观点合并成一个更强的解释：

> **“原子动作组合”回答：context 提供了什么计算。**
>  **“不能忽略 context”回答：为什么训练会迫使模型学会这项计算。**

两者分别是 **capability / representation 层** 和 **learning / identifiability 层**。

## 1. 先把机器人 ICL 写成一个简单模型

假设大规模预训练已经让机器人形成了一套并不一定显式离散的 motor repertoire：

$\mathcal S=\{\text{reach},\text{grasp},\text{pull},\text{place},\text{rotate},\ldots\}$

这里“原子动作”不一定真的是 symbolic options，更可能是模型内部连续的 skill manifold。

对于一个新任务，真正缺失的是一个 latent program：

$z = (\text{用哪些技能},\ \text{什么顺序},\ \text{作用于什么对象},\ \text{用什么策略})$

然后 policy 实际上可以理解成：

$c \xrightarrow{g} z$$(o_t,z)\xrightarrow{\pi}a_t$

其中 $c$ 就可以是：

- language coaching；
- video demonstration；
- robot trajectory；
- visual subgoal；
- metadata；
- 甚至前几个 episode 的经验。

所以你说的核心非常对：

> **prompt/demo 未必是在教机器人一个新的低层 motor skill，而是在告诉已有 motor repertoire 应该如何组合。**

这就是 π₀.7 所谓的 **compositional task generalization**：它明确把新任务描述为对已有能力进行新的 recombination。

------

## 2. 那我之前说的“必须让模型不能忽略 context”在哪里？

问题是：

**即使模型拥有原子动作，为什么它一定会学会 $c\rightarrow z$ 这个映射？**

这是另一个问题。

考虑一个很糟糕的数据集：

| scene  | prompt           | behavior                         |
| ------ | ---------------- | -------------------------------- |
| 厨房 A | “把杯子放进柜子” | grasp cup → open cabinet → place |
| 厨房 B | “擦桌子”         | grasp cloth → wipe               |
| 厨房 C | “打开抽屉”       | reach handle → pull              |



这里虽然每条数据都有 language prompt，但实际上：

$scene \approx task$

模型完全可以学：

$o \rightarrow a$

而根本不用看 prompt。

例如一看到厨房 A，它就知道该收杯子。

训练 loss 一样可以很低。

这就是 shortcut。

------

现在把数据改成：

| 相同 scene | prompt               | behavior               |
| ---------- | -------------------- | ---------------------- |
| 厨房 A     | “把杯子放柜子”       | grasp cup → cabinet    |
| 厨房 A     | “把杯子放水槽”       | grasp cup → sink       |
| 厨房 A     | “把杯子递给我”       | grasp cup → handover   |
| 厨房 A     | 一段擦杯子的视频     | grasp cloth → wipe cup |
| 厨房 A     | 一段把杯子倒扣的视频 | grasp → rotate → place |



此时：

$P(z\mid o)$

本身是高度不确定的。

只有看到 context 后，

$P(z\mid o,c)$

才变得确定。

于是模型**必须读取 $c$**，否则根本无法预测 action。

这就是我说的：

> **让“忽略 context”成为一个坏策略。**

π₀.7 自己其实说得相当明确：它加入 language、metadata、control modality、visual subgoal 等 conditioning，就是为了 **disambiguate behavior**，使不同策略、不同质量、不同机器人来源的数据能够放到同一个模型里。

------

## 3. 所以两个理论其实可以拼成一张图

我觉得最好的统一解释是：

$\boxed{\text{大量 diverse data}}$

↓ 学到

$\boxed{\text{reusable motor primitives / skills}}$

同时：

$\boxed{\text{同一 observation 对应不同可能 behavior}}$

↓ 迫使模型

$\boxed{\text{读取 context}}$

↓

$\boxed{\text{从 context 推断 latent task program }z}$

↓

$\boxed{\text{重新组合已有 motor skills}}$

↓

$\boxed{\text{zero-shot / in-context new task}}$

所以真正有意思的是：

> **skill diversity 决定“有什么积木”；behavioral ambiguity 决定“模型会不会学会看说明书”。**

只有积木，没有“必须看说明书”的训练压力，模型可能永远学不会 physical prompting。

只有必须看说明书，但没有足够丰富的积木，模型虽然会读取 demonstration，也完成不了真正 novel 的任务。

------

## 4. 这也揭示了一个重要区别：compositional generalization ≠ ICL

这两个概念实际上经常被混起来。

### 情况 A：有 composition，没有 ICL

机器人已经知道：

- open drawer
- pick spoon
- place object

你告诉它：

> “打开抽屉，把勺子拿出来放桌上。”

它第一次见这个组合，却能做到。

这是：

$\text{compositional generalization}$

但并不一定是我们现在所说的强意义 robotics ICL。

它可能只是非常好的 language-conditioned policy。

------

### 情况 B：有 ICL，但没有真正 composition

假设你给机器人一段 demo。

模型确实看了 demo，然后识别：

> “哦，这很像训练集里的 task #732。”

接着调用一个近似 memorized macro policy。

那 context 的确改变了 behavior：

$\pi(a|o,c_1)\neq\pi(a|o,c_2)$

但它未必真正进行了：

$skill_3\rightarrow skill_7\rightarrow skill_2$

这种 novel recombination。

这可以算 ICL，却不一定拥有强 compositionality。

------

因此，我认为现在最值得区分的其实有两个轴：

|                        | 不会组合                  | 会组合                        |
| ---------------------- | ------------------------- | ----------------------------- |
| **不真正使用 context** | 普通 BC / specialist      | zero-shot compositional VLA   |
| **真正使用 context**   | retrieval / task matching | **真正有意思的 robotics ICL** |



GEN-1.5、Skild S1 这些工作真正想占据的是右下角。

------

## 5. 你的 π₀.7 类比尤其有意思，因为 language 和 video 本质上可能就是同一种东西

我很赞同这里的直觉。

可以把两者都视为：

$\boxed{\text{task program specification}}$

区别只是通信 channel 不同。

### Language coaching

比如 π₀.7 的 air fryer：

> grasp handle
>  open air fryer
>  pick sweet potato
>  put sweet potato in
>  close air fryer

这几乎已经是一个 symbolic program：

$z= [\text{grasp},\text{pull},\text{pick},\text{place},\text{push}]$

模型负责把这些 high-level instructions grounding 成当前场景中的动作。

π₀.7 的结果确实表明 step-by-step language coaching 能让它完成训练数据里没有直接收集过的 appliance task。

------

### Video demonstration

一个人做：

> 抓把手 → 拉开 → 拿土豆 → 放进去 → 推回去

video 没有显式产生 symbolic tokens，但模型可以内部推断：

$video\rightarrow [\text{grasp handle}, \text{open}, \text{pick object}, \text{insert}, \text{close}]$

也就是：

$c_{\text{video}}\rightarrow z$

所以从 computational role 来讲，你说得对：

$\boxed{\text{language coaching}\approx \text{video demonstration}}$

都是在指定“已有技能应该怎么组合”。

------

## 6. 但 video 比 language 又多了一层东西

我会稍微修改“视频只是告诉模型怎么组合原子动作”这个假设。

因为 video 不仅告诉：

> **做哪几个 skill**

还同时告诉：

> **这些 skill 在空间和时间上应该长什么样。**

例如“把毛巾折三折”。

语言可以说：

> fold the towel into thirds.

这给了 task semantics。

但 demonstration 还携带：

- 从哪边开始；
- grasp point；
- object correspondence；
- 移动轨迹；
- folding axis；
- 中间 state；
- 节奏；
- 何时 release；
- 最终几何状态。

所以更完整的表达应该是：

$\text{language}\approx \text{program}$

而：

$\text{video}\approx \text{program}+\text{trajectory scaffold}$

这可能也是为什么 physical ICL 的 demo prompt 特别强。

它压缩掉了大量语言很难明确描述的连续空间约束。

------

## 7. π₀.7 这里还有一个很值得注意的细节

严格来说，π₀.7 的 language coaching demo 和 GEN/Skild 那种 one-demo ICL **还不能完全划等号**。

π₀.7 在 air fryer 例子里展示的是：

> 人在执行过程中逐步告诉机器人下一步干什么。

也就是外部的人实际承担了一部分：

$\text{high-level planner}$

机器人负责：

$\text{language subgoal}\rightarrow\text{motor execution}$

而他们后来要实现完全 autonomous execution，是把这些 coaching instructions 用来训练一个 **high-level policy**，由它自动产生 subtasks。

因此这里其实有两个问题：

**π₀.7：**

$\text{human planner} \rightarrow \text{language subgoal} \rightarrow \text{generalist low-level policy}$

而最强版本的 video ICL 想做到：

$\text{one demonstration} \rightarrow \underbrace{\text{infer entire latent program}}_{\text{model自己完成}} \rightarrow \text{autonomous execution}$

这后者的确更接近真正的 **program induction**。

------

## 8. 我现在会把 robotics ICL 的 emergence 写成两个必要条件

我觉得你这个思路让前面的观点可以精确很多。

不是简单地说：

> “task diversity 导致 ICL。”

而是两个独立因素：

### ① **Basis diversity：先学会足够丰富的行为 basis**

模型必须已经学过足够多：

$s_1,s_2,\ldots,s_N$

否则 prompt 描述一个新组合也没有用。

这是你的观点。

也是为什么 web-scale VLM knowledge + 大规模 robot data + cross embodiment data 非常重要。

------

### ② **Conditional ambiguity：让任务不能从 observation 本身猜出来**

训练数据中必须大量存在：

$(o,c_1)\rightarrow a_1$$(o,c_2)\rightarrow a_2$$(o,c_3)\rightarrow a_3$

这样 Transformer 才会发现：

> “context 是预测 action 的 causal variable。”

这是我前面强调的观点。

------

最终：

$\boxed{ \text{Robotics ICL} \approx \text{rich skill basis} \times \text{context necessity} }$

这里用乘号比加号更合适。

任何一个接近零，能力都出不来。

------

## 9. 这其实给了一个很好验证的实验

如果我要验证我们两个假说，我会做一个 **2×2 controlled scaling experiment**：

|                        | context 不必要 | context 必要 |
| ---------------------- | -------------- | ------------ |
| **低 skill diversity** | A              | B            |
| **高 skill diversity** | C              | **D**        |



然后测试 novel skill compositions。

我的预测会非常明确：

**A：** 什么都不会。

**B：** 会认真看 prompt，但只能在有限 repertoire 中选任务，本质接近 task retrieval。

**C：** 有丰富技能，也可能出现一些 zero-shot language composition，但对 demonstration prompt 的敏感性很弱，容易 shortcut。

**D：** 才会出现我们现在看到的那种：

$\text{new demonstration} \rightarrow \text{infer intent/program} \rightarrow \text{recombine skills} \rightarrow \text{new behavior}$

也就是强 robotics ICL。

------

所以我现在反而觉得，你的解释补上了我之前那个说法里缺失的一半。

**“忽略 context 是坏策略”并不能解释为什么模型能完成一个真正的新任务。**它最多解释：

> 为什么模型学会了 condition on prompt。

而你的 **“原子技能已经预训练好，prompt 教的是 composition”** 才解释：

> 为什么改变 prompt 能产生训练集中没有的复杂 behavior。

更完整的机制应该是：

$\boxed{ \text{pretraining learns the vocabulary of physical behavior} }$$+$$\boxed{ \text{ambiguous conditional data teaches the model to read a physical prompt} }$$\Downarrow$$\boxed{ \text{prompt becomes a program written in language/video} }$$\Downarrow$$\boxed{ \text{robot executes a novel composition of known physical concepts} }$

这个 framing 我觉得比单纯说“robotics 出现了 GPT-3 式 ICL”更有解释力：**机器人所谓的 ICL，可能本质上是“physical program induction over a pretrained skill basis”。**