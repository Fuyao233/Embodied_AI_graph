---
type: paper-card
paper_id: Qwen-VLA
title: "Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments"
status: seed
year: 
alphaxiv: https://arxiv.org/pdf/2605.30280
pdf: 
code: 
created: 2026-08-27
---

# Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments

## Navigation
- Paper note: [Qwen-VLA: Unifying Vision-Language-Action Modeling across Tasks, Environments, and Robot Embodiments note](../notes/Qwen-VLA-note.md)

## Core Insight

这篇宣称大一统：跨本体、跨任务（VLN、VLA）、跨数据（预训练混有 6% 的人类示范数据）



大一统的方式就是更丰富的语言标注，提示词模板：

```
The robot is {robot_tag} with {single arm / dual arms} [, waist] [, and mobile base].
The control frequency is {FPS} Hz.
Please predict the next {chunk_size} control actions to execute the following task: {instruction}.
```



训练流：

```
Stage I — T2A
────────────────────────────────
real robot action
+ synthetic text→action
(no image)
              │
              ▼

Stage II — CPT
────────────────────────────────
robot manipulation  ───────────┐
synthetic          ────────────┤  ← 和 T2A 有明显重叠/延续
human ego                       │
navigation                      ├── broad mixture
general VL                      │
VQA / grounding                 │
action caption     ─────────────┘
              │
              ▼
       Qwen-VLA-Base
          /        \
         /          \
        ▼            ▼

Stage III-A        Stage III-B
Multi-task SFT     Real-robot SFT
──────────────     ───────────────
manipulation       in-house teleop
navigation               │
VQA                      ▼
grounding             ALOHA eval
(task/emb balanced)
       │
       ▼

Stage IV — RL
────────────────────────────────
only SimplerEnv online rollouts
PPO + sparse success reward
       │
       ▼
Qwen-VLA-Instruct
```

T2A 其实和 [LA4VLA](./LA4VLA.md) 思路比较接近，先训练指令遵循能力



但是实际上最大提升来自 CPT（continue pretraining）-> SFT，RL几乎没用



## References
- AlphaXiv: https://arxiv.org/pdf/2605.30280
- PDF: 
- Code: 
