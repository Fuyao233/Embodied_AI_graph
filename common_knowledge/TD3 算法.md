# TD3 算法

## TD3 是什么

**TD3（Twin Delayed Deep Deterministic Policy Gradient）** 是一种面向**连续动作空间**的强化学习算法，例如机械臂控制、自动驾驶转向、速度控制等。

它可以看作是对 **DDPG** 的改进，核心目标是解决 DDPG 中常见的：

- Q 值高估
- 策略更新不稳定
- 对价值函数误差过于敏感

TD3 的三个核心改进是：

1. **双 Q 网络取最小值**
2. **延迟更新策略网络**
3. **目标策略平滑**

------

## 1. 基础结构

TD3 是一种确定性 Actor-Critic 算法。

### Actor

策略网络输出确定性动作：

[
a=\pi_\phi(s)
]

其中：

- (s)：状态
- (a)：动作
- (\phi)：Actor 参数

### Critic

Critic 估计状态动作价值：

[
Q_\theta(s,a)
]

TD3 不使用一个 Critic，而是同时训练两个：

[
Q_{\theta_1}(s,a),\qquad Q_{\theta_2}(s,a)
]

另外，TD3 还保留对应的目标网络：

- 目标 Actor：(\pi_{\phi'})
- 两个目标 Critic：(Q_{\theta_1'},Q_{\theta_2'})

------

## 2. 双 Q 网络：减少 Q 值高估

DDPG 使用目标值：

[
y=r+\gamma Q_{\theta'}(s',\pi_{\phi'}(s'))
]

当 Critic 的估计存在噪声时，Actor 会倾向于选择被错误高估的动作。随着训练进行，这种误差可能被不断放大。

TD3 同时计算两个目标 Critic，并取较小值：

[
y=r+\gamma(1-d)
\min_{i=1,2}Q_{\theta_i'}(s',a')
]

其中：

- (r)：即时奖励
- (\gamma)：折扣因子
- (d)：终止标记
- (s')：下一个状态
- (a')：目标动作

取最小值是一种相对保守的估计，可以明显降低 Q 值高估。

两个 Critic 分别最小化：

[
L_i=
\mathbb{E}
\left[
\left(Q_{\theta_i}(s,a)-y\right)^2
\right]
]

------

## 3. 延迟策略更新

DDPG 通常每更新一次 Critic，就更新一次 Actor。

但训练初期 Critic 的估计往往不准确。如果 Actor 频繁根据错误的 Q 函数更新，策略就容易震荡甚至崩溃。

TD3 的做法是：

> Critic 更新多次后，Actor 才更新一次。

例如常见配置是：

[
\text{policy_delay}=2
]

即每进行两次 Critic 更新，才进行一次 Actor 更新。

Actor 的目标是最大化 Critic 给出的 Q 值，通常只使用第一个 Critic：

# [ J(\phi)

\mathbb{E}*{s}
\left[
Q*{\theta_1}(s,\pi_\phi(s))
\right]
]

对应的损失写成：

# [ L_{\text{actor}}

-\mathbb{E}*{s}
\left[
Q*{\theta_1}(s,\pi_\phi(s))
\right]
]

延迟更新可以让 Critic 先获得相对准确的估计，再指导 Actor 更新。

------

## 4. 目标策略平滑

如果 Critic 在某个动作附近产生了尖锐、错误的 Q 值峰值，Actor 可能会利用这个误差，选择该动作。

TD3 在计算目标动作时加入截断噪声：

[
\epsilon
\sim
\operatorname{clip}
\left(
\mathcal{N}(0,\sigma^2),
-c,c
\right)
]

# [ a'

\operatorname{clip}
\left(
\pi_{\phi'}(s')+\epsilon,
a_{\min},a_{\max}
\right)
]

然后使用这个带噪声的动作计算目标 Q 值：

[
y=r+\gamma(1-d)
\min_{i=1,2}Q_{\theta_i'}(s',a')
]

这相当于让 Critic 不只关注某个精确动作，而是考虑该动作附近的一小片区域。

因此，策略更难利用 Q 函数中的局部错误峰值，学习结果会更加平滑和鲁棒。

需要注意：这里的噪声是**目标策略噪声**，用于计算训练目标；它与智能体和环境交互时使用的**探索噪声**不是同一个概念。

------

## 5. TD3 的完整训练流程

### 与环境交互

当前策略输出动作，并加入探索噪声：

[
a_t=
\operatorname{clip}
\left(
\pi_\phi(s_t)+\epsilon_{\text{explore}},
a_{\min},a_{\max}
\right)
]

执行动作后得到：

[
(s_t,a_t,r_t,s_{t+1},d_t)
]

并将这条经验存入经验回放池。

### 从经验池采样

随机采样一批经验：

[
(s,a,r,s',d)
]

### 计算平滑目标动作

# [ \tilde a

\operatorname{clip}
\left(
\pi_{\phi'}(s')+
\operatorname{clip}(\epsilon,-c,c),
a_{\min},a_{\max}
\right)
]

### 计算 TD 目标

[
y=
r+\gamma(1-d)
\min
\left(
Q_{\theta_1'}(s',\tilde a),
Q_{\theta_2'}(s',\tilde a)
\right)
]

### 更新两个 Critic

[
L_i=
\frac{1}{N}
\sum
\left(
Q_{\theta_i}(s,a)-y
\right)^2
]

### 延迟更新 Actor

每隔 (k) 次 Critic 更新：

# [ L_{\text{actor}}

-\frac{1}{N}
\sum
Q_{\theta_1}(s,\pi_\phi(s))
]

### 软更新目标网络

[
\theta_i'
\leftarrow
\tau\theta_i+(1-\tau)\theta_i'
]

[
\phi'
\leftarrow
\tau\phi+(1-\tau)\phi'
]

其中 (\tau) 通常较小，例如 (0.005)。

------

## 6. 伪代码

```text
初始化 Actor πφ 和两个 Critic Qθ1、Qθ2
初始化对应的目标网络
初始化经验回放池 D

循环执行：
    根据当前状态选择动作：
        a = πφ(s) + 探索噪声

    执行动作，得到 r、s'、done
    将 (s, a, r, s', done) 存入 D

    从 D 中采样一个批次

    生成目标策略噪声：
        ε = clip(N(0, σ), -c, c)

    计算目标动作：
        a' = clip(πφ'(s') + ε, action_low, action_high)

    计算目标 Q：
        y = r + γ(1-done) *
            min(Qθ1'(s', a'), Qθ2'(s', a'))

    更新两个 Critic，使其接近 y

    每隔 policy_delay 次：
        更新 Actor，最大化 Qθ1(s, πφ(s))
        软更新所有目标网络
```

------

## 7. TD3 与 DDPG 的区别

| 特性           | DDPG               | TD3             |
| -------------- | ------------------ | --------------- |
| Critic 数量    | 1 个               | 2 个            |
| 目标 Q 值      | 单个 Q 网络        | 两个 Q 取最小值 |
| Actor 更新频率 | 通常每步更新       | 延迟更新        |
| 目标动作       | 直接使用目标 Actor | 加入截断噪声    |
| 训练稳定性     | 较容易震荡         | 通常更稳定      |
| 计算成本       | 较低               | 略高            |

可以将 TD3 的名称直接理解为：

- **Twin**：两个 Critic
- **Delayed**：延迟更新 Actor
- **DDPG**：基于 DDPG 的确定性策略梯度框架

------

## 8. 常见超参数

经典实现中常见的配置包括：

```python
gamma = 0.99
tau = 0.005
policy_delay = 2
policy_noise = 0.2
noise_clip = 0.5
batch_size = 256
```

如果动作范围不是 ([-1,1])，策略噪声和探索噪声通常需要根据动作范围进行缩放。

------

## 9. TD3 的局限

TD3 虽然比 DDPG 稳定，但仍存在一些问题：

- 主要适用于连续动作空间
- 属于离策略算法，对经验回放池质量敏感
- 探索方式通常只是动作加高斯噪声，复杂任务中可能不足
- 双 Critic 取最小值有时会导致 Q 值低估
- 超参数仍可能影响训练结果
- 奖励非常稀疏时，学习效率可能较低

一句话概括：

> **TD3 通过双 Critic、延迟策略更新和目标策略平滑，降低 DDPG 的 Q 值高估与训练震荡问题。**