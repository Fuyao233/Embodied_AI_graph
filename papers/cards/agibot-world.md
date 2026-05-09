---
type: paper-card
paper_id: agibot-world
title: "AgiBot World Colosseo: A Large-scale Manipulation Platform for Scalable and Intelligent Embodied Systems"
status: seed
year:
alphaxiv: https://www.alphaxiv.org/abs/2503.06669
pdf:
code:
created: 2026-05-09
---

# AgiBot-World

## Navigation
- Paper note: [AgiBot-World note](../notes/agibot-world-note.md)

## Core Insight

数据采集流程：
1. 正式开始数据采集之前，我们首先进行初步数据采集，以验证各项任务的可行性并建立相应的采集标准
2. 在可行性验证和采集标准审核之后，经验丰富的远程操作员布置初始场景，并按照既定标准正式开始数据采集。所有数据均在本地进行初步有效性验证，例如验证是否存在缺失帧。一旦确认数据完整，便将其上传至云端以进入下一阶段
3. 在后处理阶段，数据标注员将验证每个片段是否符合第一阶段建立的采集标准，并提供语言标注

对数据的insight：
- 故障恢复数据很重要
- 收集数据时空闲时间过多会导致模型开始时出现长时间停顿，可以通过后处理消除掉


## References
- AlphaXiv: https://www.alphaxiv.org/abs/2503.06669
- PDF: 
- Code: 
