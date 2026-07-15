---
type: paper-note
paper_id: FlyingKnot-ILC
created: 2026-07-15
---

# Learning Dynamic Rope Manipulation Using Task-Level Iterative Learning Control Note

## Navigation
- Paper card: [Learning Dynamic Rope Manipulation Using Task-Level Iterative Learning Control card](../cards/FlyingKnot-ILC.md)

## Reading Notes



ILC 的前提是不同次任务和初始状态得一致，不太适合 VLA/WAM 场景，但是这种关键点目标代理的思想比较有意思



ILC要求：

- 任务在各次试验中具有固定目标
- 动力学特性具有足够的可重复性，使得误差在试验间持续存在
- 系统可重置为一致的初始状态
- 结果可测量
- 初始轨迹足够接近期望轨迹，以确保特定的更新算子能够收敛



### Method

```
Input:
    one human demonstration

Generate:
    initial robot trajectory u0


for iteration k:

    Execute uk on robot

    Measure rope state xk

    Compute:
        e = xk(tc)-xdemo(tc)


    Solve QP:

        minimize
             rope error
           + trajectory deviation
           + command change


        subject to:
             joint limits
             velocity limits
             acceleration limits
             torque limits


    obtain Δu


    update:

        uk+1 = uk - Δu


until task succeeds
```



QP ( Quadratic Program ):  输入是预测的绳子状态差异（根据绳模型预测得到的），输出是机械臂动作修正



关键时刻标注：在示范轨迹中标注之后后续机械臂自己试错过程中就按照示范轨迹标注的时间

所以这就是为什么要求任务阶段固定







应用到VLA：如何定义目标？有没有自动探索关键点的方法？（能找到这个目标就能实现动态标注并且学习）

**这个关键点应该是对 progress 有明显推进的点** 





### Evalation

Evaluation 证明：一个粗糙绳模型 + QP inverse model + critical point objective，可以让机械臂只通过一次人类示范，在真实环境中经过少量试验迭代，学会不同绳子的动态打结。
