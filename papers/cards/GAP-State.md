---
type: paper-card
paper_id: GAP-State
title: "When would Vision-Proprioception Policies Fail in Robotic Manipulation?"
status: seed
year: 
alphaxiv: https://arxiv.org/pdf/2602.12032
pdf: 
code: 
created: 2026-09-01
---

# When would Vision-Proprioception Policies Fail in Robotic Manipulation?

## Navigation
- Paper note: [When would Vision-Proprioception Policies Fail in Robotic Manipulation? note](../notes/GAP-State-note.md)

## Core Insight

Vision-Proprioception policy 不是一直都会失败，而是更容易在“运动模式切换、需要重新依赖视觉定位”的阶段失败；GAP 就是在这些阶段主动削弱 proprioception 分支的学习强度，避免模型过度走 proprio shortcut（但是目前仓库实现和论文描述差距有点大，不好复现，就看个思路）



在 “locate” 的时候是需要依赖视觉而非本体的



## References
- AlphaXiv: https://arxiv.org/pdf/2602.12032
- PDF: 
- Code: 
