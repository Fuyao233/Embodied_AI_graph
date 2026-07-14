# LeRobot v2.0

LeRobot v2.0 主要规定的是：

> **机器人轨迹如何按 episode 存储、每一帧有哪些索引字段，以及 observation/action/video/task 如何通过元数据关联。**

它并不强制机械臂必须有多少维状态或 action，也不规定 action 必须是关节位置、速度还是末端位姿；这些由 `features` 自行声明。

## 1. 目录结构

典型的 v2.0 数据集如下：

```text
dataset_root/
├── data/
│   ├── chunk-000/
│   │   ├── episode_000000.parquet
│   │   ├── episode_000001.parquet
│   │   └── ...
│   └── chunk-001/
│       └── episode_001000.parquet
│
├── videos/
│   ├── chunk-000/
│   │   ├── observation.images.front/
│   │   │   ├── episode_000000.mp4
│   │   │   └── episode_000001.mp4
│   │   └── observation.images.wrist/
│   │       ├── episode_000000.mp4
│   │       └── episode_000001.mp4
│   └── ...
│
└── meta/
    ├── info.json
    ├── episodes.jsonl
    ├── tasks.jsonl
    └── stats.json
```

v2.0 的核心特征是：

- 每个 episode 对应一个 Parquet 文件；
- 每个相机、每个 episode 对应一个 MP4；
- 每个 chunk 默认最多容纳 `chunks_size` 个 episode；
- 默认路径模板使用 `episode_chunk = episode_index // chunks_size`。官方 v2.0 数据集使用的典型路径就是 `data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet` 和对应的视频路径。([Hugging Face](https://huggingface.co/datasets/lerobot/droid_100/blob/a8835e87ef6178ce2bb5bf26a96bb03731e6355c/README.md))

------

## 2. 每个 Parquet 的字段

Parquet 中**一行对应一个控制帧/timestep**。

### 核心业务字段

通常至少有：

| 字段                          | 类型示例            | 含义                    |
| ----------------------------- | ------------------- | ----------------------- |
| `observation.state`           | `float32[D_state]`  | 当前机器人状态          |
| `action`                      | `float32[D_action]` | 当前帧对应的监督 action |
| `observation.images.<camera>` | video reference     | 当前帧对应的视频图像    |

例如：

```text
observation.state
action
observation.images.front
observation.images.wrist
```

`observation.state` 和 `action` 是 LeRobot 策略最常使用的约定名称，但它们的维度和物理意义不是格式固定的。例如可以是：

```text
observation.state:
  joint position
  joint velocity
  gripper state

action:
  target joint position
```

也可以是：

```text
observation.state:
  end-effector pose + gripper

action:
  delta end-effector pose + gripper
```

官方 v2.0 ALOHA 示例将状态和动作均定义为 14 维 `float32`，并通过 `names` 标注每一维电机名称。([Hugging Face](https://huggingface.co/datasets/lerobot/aloha_sim_transfer_cube_human/blob/40642626a384b9408f39bd40803770a3488ad4b6/README.md))

### 时序和索引字段

v2.0 的标准数据通常还包含以下字段：

| 字段            | 类型      | 含义                        |
| --------------- | --------- | --------------------------- |
| `episode_index` | `int64`   | 该帧所属 episode            |
| `frame_index`   | `int64`   | episode 内的帧序号          |
| `timestamp`     | `float32` | episode 内时间，单位秒      |
| `index`         | `int64`   | 整个数据集中的全局帧索引    |
| `task_index`    | `int64`   | 对应 `tasks.jsonl` 中的任务 |
| `next.done`     | `bool`    | 当前帧之后 episode 是否结束 |

官方 v2.0 数据集中这些字段都被写入 `features`：`episode_index`、`frame_index`、`timestamp`、`next.done`、`index` 和 `task_index`。([Hugging Face](https://huggingface.co/datasets/lerobot/aloha_sim_transfer_cube_human/blob/40642626a384b9408f39bd40803770a3488ad4b6/README.md))

典型值如下：

```text
episode_index = 3
frame_index   = 17
timestamp     = 0.5667
index         = 1247
task_index    = 0
next.done     = false
```

最后一帧：

```text
frame_index = episode_length - 1
next.done   = true
```

### 一致性关系

通常应保证：

```python
timestamp ≈ frame_index / fps
```

以及：

```text
episode_index:
    一个 episode 文件内保持不变

frame_index:
    0, 1, 2, ..., episode_length - 1

index:
    整个数据集范围内连续且唯一

task_index:
    能在 meta/tasks.jsonl 中查到
```

LeRobot 加载器会检查时间戳是否按 `1 / fps` 的间隔同步，并使用一个很小的时间容差。([Hugging Face](https://huggingface.co/joaoocruz00/pi0_model_1/blob/main/lerobot/common/datasets/lerobot_dataset.py))

------

## 3. `meta/info.json`

这是 v2.0 最重要的文件，负责描述整个数据集。

一个简化版本：

```json
{
  "codebase_version": "v2.0",
  "robot_type": "aloha",

  "total_episodes": 50,
  "total_frames": 20000,
  "total_tasks": 1,
  "total_videos": 100,

  "total_chunks": 1,
  "chunks_size": 1000,
  "fps": 50,

  "splits": {
    "train": "0:50"
  },

  "data_path": "data/chunk-{episode_chunk:03d}/episode_{episode_index:06d}.parquet",
  "video_path": "videos/chunk-{episode_chunk:03d}/{video_key}/episode_{episode_index:06d}.mp4",

  "features": {
    "...": {}
  }
}
```

官方 v2.0 示例中包含上述版本、统计数量、FPS、切分和路径模板字段。([Hugging Face](https://huggingface.co/datasets/lerobot/aloha_sim_transfer_cube_human/blob/40642626a384b9408f39bd40803770a3488ad4b6/README.md))

### 顶层字段

| 字段               | 含义                                   |
| ------------------ | -------------------------------------- |
| `codebase_version` | 数据集格式版本，v2.0 为 `"v2.0"`       |
| `robot_type`       | 机器人类型字符串，也可以是 `"unknown"` |
| `total_episodes`   | episode 数量                           |
| `total_frames`     | 所有 episode 的总帧数                  |
| `total_tasks`      | 不同任务数量                           |
| `total_videos`     | MP4 文件总数                           |
| `total_chunks`     | chunk 文件夹数量                       |
| `chunks_size`      | 每个 chunk 最大 episode 数             |
| `fps`              | 数据的控制/采样频率                    |
| `splits`           | episode 级别的数据切分                 |
| `data_path`        | Parquet 路径模板                       |
| `video_path`       | MP4 路径模板；无视频时可以为空         |
| `features`         | 所有逐帧字段的 schema                  |

### `features` 中每个字段的结构

数值向量：

```json
"observation.state": {
  "dtype": "float32",
  "shape": [14],
  "names": {
    "motors": [
      "left_waist",
      "left_shoulder"
    ]
  }
}
```

动作：

```json
"action": {
  "dtype": "float32",
  "shape": [14],
  "names": {
    "motors": [
      "left_waist",
      "left_shoulder"
    ]
  }
}
```

索引标量：

```json
"frame_index": {
  "dtype": "int64",
  "shape": [1],
  "names": null
}
```

视频：

```json
"observation.images.front": {
  "dtype": "video",
  "shape": [480, 640, 3],
  "names": [
    "height",
    "width",
    "channel"
  ],
  "video_info": {
    "video.fps": 50.0,
    "video.codec": "av1",
    "video.pix_fmt": "yuv420p",
    "video.is_depth_map": false,
    "has_audio": false
  }
}
```

对于视觉 feature，v2.0 示例使用 HWC：

```text
[height, width, channel]
```

并在 `video_info` 中记录帧率、编码器、像素格式、是否深度图和是否带音频。([Hugging Face](https://huggingface.co/datasets/lerobot/aloha_sim_transfer_cube_human/blob/40642626a384b9408f39bd40803770a3488ad4b6/README.md))

------

## 4. `meta/episodes.jsonl`

每行描述一个 episode：

```json
{"episode_index": 0, "tasks": ["Pick up the cube."], "length": 400}
{"episode_index": 1, "tasks": ["Pick up the cube."], "length": 397}
```

字段包括：

| 字段            | 含义                              |
| --------------- | --------------------------------- |
| `episode_index` | episode 编号                      |
| `tasks`         | 该 episode 涉及的自然语言任务列表 |
| `length`        | episode 的帧数                    |

官方 v2.0 数据就是以这种三字段 JSONL 结构保存 episode 元数据。([Hugging Face](https://huggingface.co/datasets/lerobot/aloha_sim_insertion_human/commit/913b0b9e64e3327c88c5c649184437de1fdda0e2?utm_source=chatgpt.com))

需要满足：

```text
sum(episode.length) == info.total_frames
```

并且：

```text
episode.length == 对应 Parquet 的行数
```

------

## 5. `meta/tasks.jsonl`

每行把任务文本映射到整数索引：

```json
{"task_index": 0, "task": "Pick up the cube."}
{"task_index": 1, "task": "Open the drawer."}
```

Parquet 中每一行的：

```text
task_index
```

必须能够对应到这里的某一项。官方 v2.0 文件使用的就是 `task_index` 和 `task` 两个字段。([Hugging Face](https://huggingface.co/datasets/lerobot/austin_sirius_dataset/commit/8e1e74bf21456ed578a3a6d606e0ca592a386270?utm_source=chatgpt.com))

注意：

- `episodes.jsonl` 保存的是任务字符串列表；
- Parquet 保存的是逐帧 `task_index`；
- `tasks.jsonl` 提供字符串与索引的映射。

------

## 6. `meta/stats.json`

保存各 feature 的全局统计量，主要用于归一化：

```json
{
  "observation.state": {
    "min": [...],
    "max": [...],
    "mean": [...],
    "std": [...]
  },
  "action": {
    "min": [...],
    "max": [...],
    "mean": [...],
    "std": [...]
  }
}
```

v2.0 的 `stats.json` 通常对各数值字段保存：

```text
min
max
mean
std
```

数组尺寸应与对应 feature 的通道/向量维度一致。官方 v2.0 数据的 action、索引和 `next.done` 等字段均可包含这些统计量。([Hugging Face](https://huggingface.co/datasets/lerobot/xarm_lift_medium_replay_image/commit/cc9ec4e4d1ad64100d536ca3032f20a10134294c?utm_source=chatgpt.com))

对于策略训练，最重要的通常是：

```text
observation.state
action
```

因为策略会用这些统计量做 mean-std 或 min-max normalization。

------

## 7. 图像字段实际如何存储？

使用视频模式时，Parquet 通常不会直接存完整 RGB 数组，而是通过：

```text
timestamp
+
video_path
+
video_key
```

在读取时定位对应视频帧。

例如：

```text
Parquet:
    timestamp = 0.4

info.json:
    fps = 30
    video_path =
      videos/chunk-{episode_chunk:03d}/
      {video_key}/episode_{episode_index:06d}.mp4
```

加载器根据 episode、camera key 和 timestamp 从 MP4 解码图像。v2.0 的源码结构明确将 Parquet 数据和可选视频作为两部分管理。([Hugging Face](https://huggingface.co/joaoocruz00/pi0_model_1/blob/main/lerobot/common/datasets/lerobot_dataset.py))

------

## 8. 哪些是硬性要求，哪些只是惯例？

### 格式层面的必要内容

要被标准 v2.0 loader 正常理解，至少要保持：

- 正确的目录和路径模板；
- `meta/info.json` 及完整 `features` schema；
- Parquet 字段与 `features` 一致；
- episode、frame、timestamp、task 等索引关系一致；
- `episodes.jsonl`、`tasks.jsonl` 与数据内容一致；
- 视频声明、路径、FPS 和实际文件一致；
- dtype 和 shape 与 Parquet 内容一致。

### 机器人任务层面的惯例

这些不是固定维度：

```text
observation.state
action
observation.images.<camera>
```

LeRobot 不会规定：

```text
action 必须是 7 维
state 必须等于 action
必须有 wrist camera
必须使用 joint position
```

但具体模型会有额外要求。例如 VLA/策略代码通常假设：

```text
action
observation.state
observation.images.<camera_name>
task language
```

字段名称、维度和模型配置必须匹配。

------

## 9. 一个最小的 v2.0 帧示例

概念上，一行 Parquet 可以理解为：

```python
{
    "observation.state": np.ndarray((7,), dtype=np.float32),
    "action": np.ndarray((7,), dtype=np.float32),

    "episode_index": np.int64(2),
    "frame_index": np.int64(15),
    "timestamp": np.float32(0.5),
    "index": np.int64(615),
    "task_index": np.int64(0),
    "next.done": False,
}
```

对应：

```json
// episodes.jsonl
{"episode_index": 2, "tasks": ["Pick up the object."], "length": 300}
// tasks.jsonl
{"task_index": 0, "task": "Pick up the object."}
```

最容易出问题的并不是 state/action 本身，而是这几组一致性：

```text
info.features ↔ Parquet schema
fps ↔ timestamp
episode length ↔ Parquet 行数
task_index ↔ tasks.jsonl
camera feature ↔ MP4 文件
total_frames ↔ 所有 episode length 之和
```



## 10. 一致性解释

### info.features ↔ Parquet schema

`meta/info.json` 中的 `features` 是数据集的“接口声明”，Parquet 是实际数据。

例如：

```
"features": {
  "observation.state": {
    "dtype": "float32",
    "shape": [7],
    "names": null
  },
  "action": {
    "dtype": "float32",
    "shape": [7],
    "names": null
  },
  "episode_index": {
    "dtype": "int64",
    "shape": [1],
    "names": null
  }
}
```

那么每个 Parquet 中应当存在：

```
observation.state
action
episode_index
```

并且每行应满足：

```
observation.state：7 个 float32
action：7 个 float32
episode_index：一个 int64 标量
```





### fps ↔ timestamp

这里的“对齐”是指：**Parquet 第 $i$ 行、视频第 $i$ 帧和 `timestamp[i]` 表示同一个控制时刻。**

**最标准的生成方式**

对每个 episode 单独从 0 开始：
$$
\text{timestamp}_i=\frac{\text{frame\_index}_i}{\text{fps}}
$$
例如 `fps = 30`：

| `frame_index` | `timestamp` |
| ------------- | ----------- |
| 0             | 0.000000    |
| 1             | 0.033333    |
| 2             | 0.066667    |
| 3             | 0.100000    |
| …             | …           |



### episode length ↔ Parquet 行数

`meta/episodes.jsonl` 中会记录：

```
{"episode_index": 3, "tasks": ["Pick up the cube"], "length": 420}
```

这表示：

```
episode 3 对应的 Parquet 必须有 420 行
```

对应文件通常是：

```
data/chunk-000/episode_000003.parquet
```

需要满足：

```
len(parquet) == episode_meta["length"]
```





### task_index ↔ tasks.jsonl

`meta/tasks.jsonl` 是任务字典：

```
{"task_index": 0, "task": "Pick up the cube"}
{"task_index": 1, "task": "Open the drawer"}
```

Parquet 每一行通常只保存整数：

```
task_index = 0
```

加载时再将它映射成：

```
"Pick up the cube"
```

最基本的要求：

Parquet 中出现的每一个 `task_index`，都必须能够在 `tasks.jsonl` 中查到：

```
Parquet task_index: {0, 1}
tasks.jsonl indices: {0, 1}
```



### camera feature ↔ MP4 文件

假设 `info.json` 声明：

```
"video_path":
  "videos/chunk-{episode_chunk:03d}/{video_key}/episode_{episode_index:06d}.mp4"
```

以及：

```
"features": {
  "observation.images.front": {
    "dtype": "video",
    "shape": [480, 640, 3]
  },
  "observation.images.wrist": {
    "dtype": "video",
    "shape": [480, 640, 3]
  }
}
```

对于 `episode_index = 12`、`chunks_size = 1000`：

```
episode_chunk = 12 // 1000
              = 0
```

因此必须存在：

```
videos/chunk-000/observation.images.front/episode_000012.mp4
videos/chunk-000/observation.images.wrist/episode_000012.mp4
```



