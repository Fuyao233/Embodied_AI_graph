---
type: paper-note
paper_id: starvla
created: 2026-05-07
---

# starVLA Note

## Navigation
- Paper card: [starVLA card](../cards/starvla.md)

## Reading Notes



### 整体框架

- starVLA: 核心框架
- deployment：通用推理服务层
- examples：具体应用场景层



#### StarVLA

**config**

- data_config: 放数据集信息，包括训练数据索引、动作维度、归一化统计文件、评测任务位置
- deep_speeds: 配置分布式训练相关参数
- training: 运行基础配置、framework参数



##### dataloader

从 NVIDIA GR00T 体系移植来的dataloader

- gr00t_lerbot: 

  - data_config.py: 定义不同机器人用哪些 video/state/action/language 键，以及对应的 transform。ROBOT_TYPE_CONFIG_MAP 是总映射表。

  - datasets.py:

    - LeRobotSingleDataset：单个机器人轨迹数据集
    - CachedLeRobotSingleDataset：带缓存版本；
    - LeRobotMixtureDataset：多数据集混合采样。
    - 还负责读 LeRobot 元数据、统计量、视频帧、parquet，以及混合采样权重。

  - mixtures.py: 数据集混合表。把 data_mix 名字映射到具体的数据集列表、采样权重、robot type。

    ```json
        "lerobot-tianji-0508": [
            ("/mnt/data/lerbot-tianji-0507/", 1.0, "srobot_tianji"),
            ],
    ```

    第一个参数是数据路径，和yaml的`vla_data.data_root_dir`拼接，第二个是采样率，第三个对应config.py中的config类名

  - embodiment_tags.py: 机器人 embodiment tag 和 robot_type -> tag 的映射。

  - index.py: 视频读取工具，按 index 或 timestamp 抽帧。

- *datasets.py



##### model

- tools：提供注册表、冻结状态检查、checkpoint 配置读取等公共工具
- modules：负责“VLM、动作头、视觉编码器、投影器、状态头”等底层部件
  - vlm：Qwen2.5-VL、Qwen3-VL、Florence2
  - action_model：diffusion、flow matching、RDT、MLP regression、FAST
        tokenization、VLA-Adapter
  - dino_model & projector: 辅助视觉分支，主要给M1和QwenDual这类双路结构用 
  - gr00t_policy/atlas_policy.py: GR00T风格的cross embodiment tokenizer
    - action tokenizer 本体是 MultiEmbodimentActionEncoder，它不是一个单独命名为 tokenizer 的模块，而是 3 层 category-specific linear 组成的 MLP：
            - W1: action_dim -> hidden_size
            - W2: 拼上 timestep embedding 后再投影
            - W3: 再投影一次
- framework：负责“把各组件组装成完整 VLA 模型”
  - M1.py：最像“原始 InternVLA-M1”路线，Qwen + DINO + Layerwise QFormer + DiT diffusion action head。
  - QwenGR00T.py：Qwen hidden states -> GR00T flow-matching action head
  - QwenRDT.py：Qwen -> RDT2 action head，支持 KV cache、selected layers、latent CoT
  - QwenPI.py：功能最多的一个，集成了 layerwise flow-matching、progress-aware 版本、latent CoT、DINOv3 latent 监督，像研究实验主战场。
  - QwenOFT.py：OpenVLA-OFT 风格，把 action token 注入到 VLM 里，再做连续动作回归。
  - QwenFast.py：把连续动作离散化成 FAST token，走自回归 next-token prediction。
  - QwenAdapter.py：VLA-Adapter 路线，往 Qwen 末尾拼 action query token，再回归动作。
  - QwenDual.py：Qwen + DINO 双路条件后接 GR00T 头。



关于laten CoT



##### training

主训练循环：

1. 参数读取和配置：
   1. 读取 YAML 配置 + CLI 覆盖参数
   2. 包装配置对象，追踪哪些配置项被访问
   3. 创建输出目录
2. 模型&优化器构建：
   1. 构建模型框架
   2. 构建 VLA / VLM dataloader
   3. 构建优化器和学习率调度器
3. 训练代理：
   1. 初始化 trainer
   2. 加载权重、冻结模块、分布式封装
   3. 进入训练循环
4. 保存最终模型并关闭 W&B



**Trainer** 逻辑：

```
__init__
  → 保存 cfg / model / dataloader / optimizer / scheduler / accelerator
  → 初始化 completed_steps、batch size、best score 等状态

prepare_training()
  → set_seed
  → load pretrained / resume
  → freeze modules
  → print trainable params
  → setup_distributed_training
  → init wandb
  → init checkpoint

train()
  → 创建 dataloader iterator
  → while completed_steps < max_train_steps:
        get batch
        _train_step(...)
        completed_steps += 1
        eval
        log
        save checkpoint
  → _finalize_training()
```



**VLAMTrainer**: VLA & VLM cotraining，vla loss和vlm loss叠加训练







