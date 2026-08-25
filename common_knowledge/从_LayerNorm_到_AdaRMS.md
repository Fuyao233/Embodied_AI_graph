# 从 LayerNorm 到 AdaRMS：归一化与条件调制的统一理解

## 0. 概览

从 LayerNorm 到 RMSNorm，再到 AdaRMS（Adaptive RMSNorm），可以沿着一条非常清晰的主线理解：

1. **LayerNorm**：同时做中心化（re-centering）和尺度归一化（re-scaling）。
2. **RMSNorm**：去掉中心化，只保留尺度归一化。
3. **AdaRMS**：在 RMSNorm 提供的稳定接口上，让归一化后的通道增益由外部条件动态决定。

如果只记住一句话，可以记成：

> **RMSNorm 负责消除 hidden state 中“不受控制的整体尺度”，AdaRMS 再根据条件信号施加“受控制的通道尺度”。**

这使得归一化层不再只是训练稳定工具，也可以成为网络中的 **conditioning interface（条件控制接口）**。

---

## 1. 从 LayerNorm 开始

设一个 token 的 hidden state 为

$$
x=[x_1,x_2,\dots,x_d]\in\mathbb{R}^d.
$$

LayerNorm 首先计算均值：

$$
\mu=\frac{1}{d}\sum_{i=1}^{d}x_i,
$$

再计算方差：

$$
\sigma^2=\frac{1}{d}\sum_{i=1}^{d}(x_i-\mu)^2.
$$

最终：

$$
\operatorname{LayerNorm}(x)
=
\gamma\odot
\frac{x-\mu}
{\sqrt{\sigma^2+\epsilon}}
+\beta.
$$

其中：

- $\gamma\in\mathbb{R}^d$：可学习的逐通道缩放参数；
- $\beta\in\mathbb{R}^d$：可学习的逐通道偏置；
- $\epsilon$：用于数值稳定的小常数。

因此 LayerNorm 实际做了两件事。

### 1.1 Re-centering：中心化

$$
x\rightarrow x-\mu.
$$

它去掉了 hidden state 在所有通道上的共同偏移。

### 1.2 Re-scaling：尺度归一化

$$
x-\mu
\rightarrow
\frac{x-\mu}{\sqrt{\sigma^2+\epsilon}}.
$$

它把输入调整到相对稳定的尺度。

所以可以概括为：

$$
\boxed{
\text{LayerNorm}
=
\text{re-centering}
+
\text{re-scaling}
}
$$

---

## 2. RMSNorm 去掉了什么？

RMSNorm 的核心变化非常简单：

> **不再计算均值，也不再减均值。**

它直接计算输入的 Root Mean Square：

$$
\operatorname{RMS}(x)
=
\sqrt{
\frac{1}{d}
\sum_{i=1}^{d}x_i^2
+\epsilon
}.
$$

然后进行归一化：

$$
\operatorname{RMSNorm}(x)
=
\gamma\odot
\frac{x}{\operatorname{RMS}(x)}.
$$

RMSNorm 的基本思想是：

> LayerNorm 中的 **re-centering invariance** 不一定是必须的；只保留 **re-scaling invariance**，依然可以获得很好的训练稳定性，同时结构更简单。

原始论文：

- Zhang & Sennrich, *Root Mean Square Layer Normalization*, NeurIPS 2019  
  <https://arxiv.org/abs/1910.07467>

### 2.1 LayerNorm 与 RMSNorm 对比

| 特性 | LayerNorm | RMSNorm |
|---|---:|---:|
| 减均值 | ✓ | ✗ |
| 控制整体尺度 | ✓ | ✓ |
| learned scale $\gamma$ | ✓ | ✓ |
| bias $\beta$ | 通常有 | 基础形式通常没有 |
| 核心操作 | 中心化 + 尺度归一化 | 尺度归一化 |
| 计算复杂度 | 略高 | 更简单 |

---

## 3. RMSNorm 的几何直觉：保留方向，控制长度

先忽略 learned scale $\gamma$。

有：

$$
y=
\frac{x}
{\sqrt{\frac{1}{d}\|x\|_2^2}}.
$$

因为

$$
\sqrt{\frac{1}{d}\|x\|_2^2}
=
\frac{\|x\|_2}{\sqrt d},
$$

所以：

$$
y
=
\sqrt d\frac{x}{\|x\|_2}.
$$

因此归一化之后：

$$
\|y\|_2\approx\sqrt d.
$$

也就是说，RMSNorm 会把不同输入的整体长度调整到相近范围。

例如：

$$
x=[0.01,0.02,-0.03,\dots]
$$

和

$$
100x=[1,2,-3,\dots]
$$

经过 RMSNorm 后近似满足：

$$
\operatorname{RMSNorm}(100x)
\approx
\operatorname{RMSNorm}(x).
$$

因此可以粗略理解为：

$$
\boxed{
\text{RMSNorm 主要保留向量方向和通道间相对结构}
}
$$

而弱化：

$$
\boxed{
\text{输入整体 amplitude / scale}
}
$$

需要注意的是，由于实际计算中存在 $\epsilon$ 和 learned $\gamma$，上述“完全相同”只是理想化近似。

---

## 4. 为什么 Transformer 需要归一化？

考虑一个典型的 Pre-Norm Transformer block。

首先：

$$
n_l=\operatorname{RMSNorm}(x_l),
$$

然后进入 Attention：

$$
a_l=\operatorname{Attention}(n_l),
$$

再做残差连接：

$$
x_l'=x_l+a_l.
$$

接着：

$$
m_l=\operatorname{RMSNorm}(x_l'),
$$

进入 MLP：

$$
u_l=\operatorname{MLP}(m_l),
$$

最后：

$$
x_{l+1}=x_l'+u_l.
$$

结构上可以表示为：

```text
                         residual
            ┌───────────────────────────────┐
            │                               ↓
x_l ──→ RMSNorm ──→ Attention ──→ + ──→ x'_l
                                      │
                                      │
                         residual     ↓
            ┌──────────────────────────────────────┐
            │                                      ↓
x'_l ─→ RMSNorm ──→ MLP ──────────────→ + ──→ x_{l+1}
```

这里最重要的不是“RMSNorm 存在”，而是它所在的位置：

$$
\boxed{
\text{RMSNorm 位于复杂 transformation 的入口}
}
$$

也就是说，Attention 和 MLP 每次处理 residual stream 之前，都会先看到一个尺度受控的表示。

---

## 5. 如果没有归一化，会有什么问题？

Transformer 中大量使用残差连接：

$$
x_{l+1}=x_l+F_l(x_l).
$$

随着层数增加，residual stream 的幅值可能不断变化。

例如某一层收到：

$$
x=[200,-100,50,\dots],
$$

另一批数据却可能是：

$$
x=[0.1,-0.05,0.02,\dots].
$$

对于 Attention：

$$
Q=W_Qx,\qquad K=W_Kx,
$$

输入尺度变化会传递到：

$$
QK^\top,
$$

进而影响 softmax logits 的尺度和尖锐程度。

对于 MLP，输入幅值也会改变非线性激活函数所在的工作区域。

因此归一化层可以被理解为给后续计算模块提供一个稳定接口：

$$
\boxed{
\text{Residual stream}
\rightarrow
\text{Normalization}
\rightarrow
\text{Information processing}
}
$$

Residual stream 可以继续保存丰富、不断累积的状态；

而 Attention / MLP 不需要同时处理巨大的输入尺度漂移。

---

## 6. Learned Scale $\gamma$ 到底是什么？

RMSNorm 不是简单地把向量长度固定之后就结束。

实际形式中还有：

$$
y
=
\gamma\odot
\operatorname{RMSNorm}_0(x),
$$

其中：

$$
\operatorname{RMSNorm}_0(x)
=
\frac{x}{\operatorname{RMS}(x)}.
$$

设：

$$
\gamma=[\gamma_1,\gamma_2,\dots,\gamma_d].
$$

那么：

$$
y_i
=
\gamma_i
\frac{x_i}{\operatorname{RMS}(x)}.
$$

如果：

$$
\gamma_{20}=2,
$$

第 20 个 hidden channel 会被放大。

如果：

$$
\gamma_{87}=0.1,
$$

第 87 个 hidden channel 会被压低。

因此可以把 $\gamma$ 粗略理解成：

$$
\boxed{
\text{每个 hidden channel 的 gain}
}
$$

普通 RMSNorm 中，这个 gain 是训练得到的固定参数。

模型训练完成后，对于不同输入样本，基础参数 $\gamma$ 本身并不会动态改变。

---

## 7. 从 RMSNorm 到 AdaRMS

AdaRMS 的关键变化只有一步：

> **让归一化后的 scale 不再是固定参数，而是由 condition 动态生成。**

普通 RMSNorm：

$$
y
=
\gamma
\odot
\operatorname{RMSNorm}_0(x).
$$

Adaptive RMSNorm：

$$
y
=
\gamma(c)
\odot
\operatorname{RMSNorm}_0(x)
+
\beta(c),
$$

其中 $c$ 是外部条件。

条件 $c$ 可以来自很多地方，例如：

- timestep；
- class embedding；
- task embedding；
- style embedding；
- context vector；
- 其他全局控制信号。

此时：

$$
\boxed{
\gamma=\gamma(c),\qquad
\beta=\beta(c)
}
$$

网络就可以根据不同条件动态调整各个 hidden channel。

例如：

$$
\gamma(c_A)
=
[0.1,2.0,0.4,\dots],
$$

而：

$$
\gamma(c_B)
=
[1.8,0.2,1.5,\dots].
$$

即使 hidden state $x$ 相同、主干网络权重相同，不同 condition 也可以让后续 Attention / MLP 工作在不同状态。

因此：

$$
\boxed{
\text{condition 不需要修改主干权重，
也能动态改变主干网络的计算方式}
}
$$

---

## 8. AdaRMS 不只是 Norm，而是 Conditioning Interface

普通 RMSNorm 的主要角色是：

$$
\boxed{
\text{numerical / optimization stabilization}
}
$$

AdaRMS 在此基础上增加了一层作用：

$$
\boxed{
\text{global conditioning}
}
$$

可以拆成两步。

### 8.1 第一步：Normalization

$$
x_l
\rightarrow
\hat{x}_l
=
\frac{x_l}{\operatorname{RMS}(x_l)}.
$$

先把上一层累积产生的 uncontrolled scale 去掉。

### 8.2 第二步：Condition-dependent modulation

$$
\hat{x}_l
\rightarrow
\gamma_l(c)\odot\hat{x}_l+\beta_l(c).
$$

再由 condition 决定：

- 哪些 feature 应该增强；
- 哪些 feature 应该减弱；
- activation 的工作点应该如何变化。

因此可以把 AdaRMS 理解为：

$$
\boxed{
\text{Normalization}
+
\text{Feature-wise conditional modulation}
}
$$

---

## 9. 为什么“先去掉幅值，再乘回来”不是多此一举？

表面上看，RMSNorm 先做：

$$
x
\rightarrow
\frac{x}{\operatorname{RMS}(x)},
$$

把输入幅值去掉；

然后 AdaRMS 又乘：

$$
\gamma(c),
$$

似乎又把幅值加了回来。

但这两个“幅值”来源完全不同。

原始 hidden state 的整体幅值：

$$
\|x\|,
$$

往往是前面多层计算、残差累积和数据变化共同造成的：

$$
\boxed{
\text{uncontrolled scale}
}
$$

而 AdaRMS 重新施加的：

$$
\gamma(c)
$$

是网络根据明确条件产生的：

$$
\boxed{
\text{condition-controlled scale}
}
$$

所以它实际上完成了：

$$
\boxed{
\text{uncontrolled scale}
\rightarrow
\text{normalize}
\rightarrow
\text{controlled scale}
}
$$

这正是 Adaptive Normalization 非常核心的设计思想。

---

## 10. Token Conditioning 与 AdaRMS Conditioning 的区别

向模型加入 condition，最直接的方法通常是把它编码成 token 或 embedding，然后和 hidden representation 混合。

例如：

$$
h'=h+e_c.
$$

这种方式中，condition 会进入内容表示本身：

$$
\text{content feature}
+
\text{condition feature}.
$$

网络需要在后续层中自己学习：

> 哪部分表示内容，哪部分表示控制条件，以及应该如何使用控制条件。

而 AdaRMS 使用：

$$
h'
=
\gamma(c)\odot
\operatorname{RMSNorm}_0(h)
+
\beta(c).
$$

此时 condition 不一定需要成为一个新的“内容 feature”。

它可以直接控制：

$$
\boxed{
\text{已有 feature 应该如何被使用}
}
$$

因此可以用一个简化的类比：

$$
\boxed{
\text{Token / representation pathway}
\approx
\text{What}
}
$$

$$
\boxed{
\text{Adaptive normalization pathway}
\approx
\text{How}
}
$$

这不是严格的数学划分，但对于理解 conditioning 的 inductive bias 很有帮助。

---

## 11. 为什么 Scale Modulation 能显著影响 Attention？

设：

$$
z
=
\gamma(c)
\odot
\operatorname{RMSNorm}_0(x).
$$

写成矩阵形式：

$$
z
=
D_{\gamma(c)}
\operatorname{RMSNorm}_0(x),
$$

其中：

$$
D_{\gamma(c)}
=
\operatorname{diag}(\gamma(c)).
$$

Attention 中：

$$
Q=W_Qz.
$$

代入可得：

$$
Q
=
W_Q
D_{\gamma(c)}
\operatorname{RMSNorm}_0(x).
$$

定义：

$$
W_Q^{\mathrm{eff}}(c)
=
W_QD_{\gamma(c)},
$$

那么：

$$
Q
=
W_Q^{\mathrm{eff}}(c)
\operatorname{RMSNorm}_0(x).
$$

也就是说：

$$
\boxed{
W_Q^{\mathrm{eff}}(c)
=
W_QD_{\gamma(c)}
}
$$

虽然真实参数 $W_Q$ 并没有改变，但 condition-dependent scale 改变了各个输入通道进入线性层时的权重。

同样的逻辑也作用于：

$$
W_K,\quad W_V,\quad W_{\text{MLP}}.
$$

所以 AdaRMS 可以在不显式生成整套新权重的情况下，产生一种轻量的：

$$
\boxed{
\text{condition-dependent effective network}
}
$$

从这个角度看，生成 $\gamma(c)$ 和 $\beta(c)$ 的小网络可以被视为一种非常轻量的：

- gain scheduler；
- feature-wise modulator；
- 或弱形式的 hypernetwork。

---

## 12. 为什么经常需要“每层注入”？

假设 condition 只在输入处融合：

$$
h_0=f(x,c),
$$

随后经过很多层：

$$
h_0
\rightarrow
h_1
\rightarrow
\dots
\rightarrow
h_L.
$$

那么深层网络必须自己保证 condition 信息在长路径中始终可访问。

另一种方法是在每一层都进行条件调制：

$$
c
\rightarrow
\operatorname{AdaRMS}_1,
$$

$$
c
\rightarrow
\operatorname{AdaRMS}_2,
$$

$$
\vdots
$$

$$
c
\rightarrow
\operatorname{AdaRMS}_L.
$$

于是每一层都可以直接访问 condition。

这相当于把 condition 看成一个始终位于主干网络之外的 **global control signal**，而不是要求主干网络把它作为普通 hidden feature 一路“记住”。

因此：

$$
\boxed{
\text{input conditioning}
\neq
\text{layer-wise conditioning}
}
$$

前者主要影响初始表示；

后者可以持续改变整条计算路径。

---

## 13. 一个典型的 AdaRMS 结构

一个通用实现可以写成：

```text
condition c
    │
    ▼
Embedding / Encoder
    │
    ▼
   MLP
    │
    ├──────────────► scale γ(c)
    │
    └──────────────► shift β(c)

hidden x
    │
    ▼
 RMSNorm
    │
    ▼
 normalized hidden
    │
    ├── × γ(c)
    │
    └── + β(c)
    ▼
conditioned hidden
    │
    ▼
Attention / MLP
```

对应数学形式：

$$
\hat{x}
=
\frac{x}{\operatorname{RMS}(x)},
$$

$$
(\gamma(c),\beta(c))
=
\operatorname{MLP}(c),
$$

$$
y
=
\gamma(c)\odot\hat{x}
+
\beta(c).
$$

实际实现中也经常使用 residual parameterization，例如：

$$
y
=
(1+\Delta\gamma(c))
\odot
\hat{x}
+
\beta(c).
$$

这样当条件分支输出接近零时：

$$
\Delta\gamma(c)\approx 0,\qquad
\beta(c)\approx 0,
$$

模型初始行为更接近普通 RMSNorm。

---

## 14. AdaRMS 与 FiLM / AdaLN 的关系

AdaRMS 并不是孤立的设计，它属于更广泛的 **feature-wise affine modulation** 思路。

一般形式为：

$$
y
=
\gamma(c)\odot \hat{x}
+
\beta(c).
$$

差别主要在于 $\hat{x}$ 如何得到。

### AdaLN

如果：

$$
\hat{x}
=
\frac{x-\mu}
{\sqrt{\sigma^2+\epsilon}},
$$

那么得到的是 Adaptive LayerNorm。

### AdaRMS

如果：

$$
\hat{x}
=
\frac{x}
{\sqrt{\frac{1}{d}\sum_i x_i^2+\epsilon}},
$$

那么得到的是 Adaptive RMSNorm。

因此两者的核心区别仍然对应：

$$
\boxed{
\text{LayerNorm：center + scale}
}
$$

与

$$
\boxed{
\text{RMSNorm：scale only}
}
$$

而 adaptive 部分的共同思想都是：

$$
\boxed{
\text{让 affine parameters 由 condition 决定}
}
$$

---

## 15. 从 LayerNorm 到 AdaRMS 的完整演化

### LayerNorm

$$
y
=
\gamma\odot
\frac{x-\mu}
{\sqrt{\sigma^2+\epsilon}}
+\beta.
$$

解决：

> 如何让每层看到尺度和中心位置更稳定的输入？

---

### RMSNorm

$$
y
=
\gamma\odot
\frac{x}
{\sqrt{\frac{1}{d}\sum_i x_i^2+\epsilon}}.
$$

进一步提出：

> 中心化可能不是必要条件，只控制输入尺度就足够。

---

### AdaRMS

$$
y
=
\gamma(c)\odot
\frac{x}
{\sqrt{\frac{1}{d}\sum_i x_i^2+\epsilon}}
+
\beta(c).
$$

进一步把问题从“稳定输入”扩展为：

> 在稳定输入尺度之后，能否利用这个统一入口，根据外部条件动态改变网络的工作方式？

因此三者的演化可以概括为：

```text
LayerNorm
  │
  ├─ remove mean
  └─ normalize scale
        │
        ▼
RMSNorm
  │
  └─ normalize scale only
        │
        ▼
AdaRMS
  │
  ├─ normalize uncontrolled scale
  └─ inject condition-controlled scale / shift
```

---

## 16. 最终直觉

如果把一个 hidden state 想象成一条有 $d$ 路信号的总线：

### LayerNorm

> 先校正整体中心，再把信号调整到稳定尺度。

### RMSNorm

> 不管中心位置，只把整条总线的总体电平调整到稳定范围。

### Learned $\gamma$

> 给每一路信号设置一个固定增益。

### AdaRMS

> 根据当前 condition，动态修改每一路信号的增益，必要时再增加动态偏置。

所以最值得记住的是：

$$
\boxed{
\text{RMSNorm}
=
\text{stable interface}
}
$$

$$
\boxed{
\text{AdaRMS}
=
\text{conditional control interface}
}
$$

以及：

$$
\boxed{
\text{RMSNorm 先消除非受控尺度；
AdaRMS 再注入有语义的、condition-controlled 尺度。}
}
$$

这就是从 LayerNorm、RMSNorm 一直到 AdaRMS 的核心逻辑。
