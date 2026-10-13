---
type: paper-note
paper_id: NoMaD
created: 2026-09-30
---

# NoMaD: Goal Masked Diffusion Policies for Navigation and Exploration Note

## Navigation
- Paper card: [NoMaD: Goal Masked Diffusion Policies for Navigation and Exploration card](../cards/NoMaD.md)

## Reading Notes

本文介绍了一种训练单一统一扩散策略（unified diffusion policy）的方法，该策略**能同时处理目标导向导航与目标无关探索**：前者使机器人能够在定位目标后前往用户指定的位置，后者则赋予其在陌生环境中进行搜寻的能力



### Related Work

[地图类型](https://zhuanlan.zhihu.com/p/708050126)

| 类型                         | 它记录什么               | 直观类比                        | NoMaD 是否主要使用 |
| ---------------------------- | ------------------------ | ------------------------------- | ------------------ |
| **Metric / Geometric map**   | 精确空间位置、障碍物几何 | 建筑平面图                      | ❌                  |
| **Topological map**（graph） | 哪些地点可以互相到达     | 地铁线路图                      | ✅                  |
| **Semantic map**             | 这里是什么东西/区域      | 标注了“厨房、门、椅子”的地图    | ❌                  |
| **Topometric / Hybrid**      | 拓扑关系 + 局部几何信息  | 地铁线路图 + 每个站附近详细地图 | NoMaD 本身不是重点 |



Geometric map 通常是用传统的 SLAM 来做，能够获得物体的准确几何坐标，优点是能做非常精确的避障和路径规划；缺点是传感器、深度、定位误差都会影响地图，而且大场景下地图会比较重。NoMaD 的 Related Work 特意指出，没有可靠 depth 时，高精度 geometric mapping 会变困难。



本文将探索问题分成两个部分：

- 能够执行多样化短时程动作的学习型控制策略
- 基于拓扑图的高层规划器，该规划器利用上述策略实现长时程的目标导向探索
