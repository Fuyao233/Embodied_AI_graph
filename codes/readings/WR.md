# 数据处理 & 部署

仓库结构：

| 目录        | 文件数 | 主要职责                       |
| ----------- | ------ | ------------------------------ |
| `sim_res`   | 196    | 仿真、控制器、内嵌 Unitree SDK |
| `inference` | 11     | 在线、异步、离线和批量评估     |
| `scripts`   | 9      | 数据采集、预处理、转换、可视化 |
| `serve_res` | 8      | GR00T/PI 通信协议与客户端      |
| `data_res`  | 6      | DDS、相机、坐标变换、数据工具  |
| `config`    | 1      | 相机配置                       |







## 数据处理

### scripts

处理数据的主要流程是 `collect_data -> preprocess_data -> convert_to_lerobot`



**collect _data.py**

这个是数采同时执行的

```bash
python scripts/collect_data.py --root-path ./data --task <task_name>
```

运行后弹出 UI 窗口，键盘操作：

| 按键 | 功能                                     |
| ---- | ---------------------------------------- |
| `1`  | 开始 / 停止当前 episode 采集             |
| `2`  | 删除上一条 episode（仅在停止状态下可用） |
| `3`  | 退出程序                                 |
| `l`  | 切换 UI 语言（中/英）                    |

采集完成后数据保存至 `./data/<task_name>/episode_*/data.json`。

> 运行前需确认相机、动捕系统、机器人 SDK 及网络连接均正常。



**preprocess_data.py**

这里的 `cfg` 只有两个参数，一个是 `input_dirs` 对应上一步输出的数据，另一个是 `downsample_rate`

1. 读取 `input_dirs` 目录下 `data.json`

2. `load_mocap_imu_data`：获取路径下 `mocap`（动捕） 和 `imu`（惯性测量单元，用于描述设备的运动状态和姿态变化）数据

   1. 初始加载：
      1. 从头找到第一帧完整数据。
      2. 删除第一帧完整数据之前的所有帧。
      3. 从完整数据开始：
         - 某字段缺失 → 复制该字段上一帧最近的有效值。
         - 某字段存在 → 将其记录为新的最近有效值。
      4. 返回处理后的数据(`records`)和缺失字段计数。
   2. 遍历 `records`：
      1. 根据 `downsample_rate` 进行间隔采样
      2. 读取 `mocap` 和 `imu` 字段，并将 `mocap` 转 `ndarray`
      3. 返回

3. 对 `mocap` 和 `imu` 数据标准化：

   1. `standardize_mocap`：mocap `(T, 15, 7)`：以首帧根节点位姿为参考，整体 `compute_relative` 到该参考系。
   2. `standardize_imu`：imu `(T, 4)`：去掉 yaw（这个是机器人在世界中的朝向），保留四元数。

4. 四元数转 6D（`quaternion_to_rotation_6d`）：

   - mocap `(T, 15, 7)` → `(T, 15, 9)`（每关节 `xyz(3) + rot_6d(6)`）。
   - imu `(T, 4)` → `(T, 6)`（纯 [6D旋转](https://arxiv.org/pdf/1812.07035)）

5. **mocap 转根相对**（`mocap_to_root_relative`， 把mocap采的关键点世界坐标转成相对于根节点的）：mocap `(T, 15, 9)` → `(T, 138)`，即 `[根节点位移增量 root_delta_xyz(3), 展平的 15×9 mocap(135)]`；其中各关节 xyz 减去根节点 xyz，6D 旋转保持不变，`root_delta[t] = root_xyz[t+1] − root_xyz[t]`（末帧为 0）。

   



标准化之前，`mocap` size 是 $15 \times 7$，15 个关键点，每个关键点前 3 维是世界坐标，后 4 维是四元数；`imu` size 是 $4$, 表示机器人根部/基座朝向四元数







**convert_to_lerobot.py**

[LeRobot_v2.0](../../common_knowledge/LeRobot v2.0.md)

将预处理后的 `data_root_relative_6D.json` 转换为可用于训练的 LeRobot v2 数据集：

```bash
python scripts/convert_to_lerobot.py \
    --input-dirs ./data/task_A ./data/task_B \
    --output-dir /path/to/lerobot_dataset
```





**record_mocap.py**: 单独录制 DDS （数据分发服务）原始 mocap，用于排查动捕。

DDS是面向实时系统和分布式系统的通信中间件标准，采用**发布—订阅（Publish–Subscribe）**模型。发送方发布某类数据，接收方订阅对应 Topic，不需要彼此直接建立业务层连接。DDS 还提供可靠性、传输延迟、历史缓存等 QoS 配置。

放到你的 mocap 场景中，大致通信流程是：

```
动捕设备 / 动捕程序
        │
        │ 发布 mocap 数据
        ▼
   DDS Topic
        │
   ┌────┴─────────┐
   ▼              ▼
record_mocap.py   机器人控制程序
保存原始数据       实时使用动作数据
```

因此：

```
record_mocap.py：单独录制 DDS 原始 mocap
```

通常表示该脚本：

1. 连接 DDS 网络；
2. 订阅某个 mocap Topic；
3. 接收动捕系统持续发布的数据；
4. 不经过后续标准化、坐标转换等处理；
5. 将原始消息直接保存，用于检查数据源和通信链路。



**show_cameras.py**: 采集前检查相机



**stitch_videos.py**: 



**visualized_mocap.py**: 实时可视化动捕数据（3D 火柴人，从 DDS 订阅）





### data_res

**camera.py**: 用于 `collect_data`



**dds.py**: DDS 是**Data Distribution Service（数据分发服务）**。它是一种面向实时系统的通信中间件，常用于机器人、自动驾驶、工业控制、航空航天等场景。多个程序不直接互相调用，而是围绕某个“主题 Topic”交换数据。

结构：

```
              ┌── Subscriber A
Publisher ── Topic
              ├── Subscriber B
              └── Subscriber C
```

Topic 规定了信息交换的格式



| Topic               | 消息类型              | 文件内发布端 | 文件内订阅端 | 主要用途                 |
| ------------------- | --------------------- | ------------ | ------------ | ------------------------ |
| `MocapUE5G115Topic` | `MocapUE5G115Msg`     | 有           | 有           | 15 关节全身动捕数据      |
| `MocapUEHand`       | `MocapUEHandData_Msg` | 有           | 有           | 动捕/UE 手部数据         |
| `MocapHandsCmd`     | `MocapUEHandData_Msg` | 有           | 有           | 灵巧手控制命令           |
| `RobotHandState`    | `MocapUEHandData_Msg` | 有           | 有           | 机器人手状态反馈         |
| `WR/BodyPose`       | BodyPose V1 或 V2     | 无           | 有           | 机器人全身姿态和关节状态 |



通信线路：

```
┌──────────────────┐
│ UE / 动捕系统     │
└────────┬─────────┘
         │
         ├── MocapUE5G115Topic ──→ 全身动捕消费者
         │
         └── MocapUEHand ─────────→ 手部数据消费者


┌──────────────────┐
│ 遥操作/控制程序   │
└────────┬─────────┘
         │
         └── MocapHandsCmd ───────→ 机器人手驱动
                                           │
                                           │
                                           ▼
                                     ┌──────────┐
                                     │ 机器人手 │
                                     └────┬─────┘
                                          │
                                          └── RobotHandState
                                                   │
                                                   ▼
                                          控制/监控程序


┌────────────────────────┐
│ GAE / 仿真器 / 机器人端 │
└────────────┬───────────┘
             │
             └── WR/BodyPose ──────→ BodyPoseSubscriber
```





## 部署

#### Inference



| 模式                | 输入             | 模型服务 | 真实相机 | DDS/执行端 | 可能涉及真机 |
| ------------------- | ---------------- | -------: | -------: | ---------: | -----------: |
| `eval`              | 原始 `data.json` |       是 |       否 |         否 |   基本不涉及 |
| `offline open_eval` | 录制数据         |       是 |       否 |         是 |           是 |
| `offline replay`    | 预处理数据       |       否 |       否 |         是 |           是 |
| `sync`              | 实时状态和相机   |       是 |       是 |         是 |           是 |
| `async`             | 实时状态和相机   |       是 |       是 |         是 |           是 |



**eval**

`eval` 读取原始 episode：

```text
data.json
├── imu
├── body_joint
├── hand_state
├── mocap
├── hand_cmd
└── 三路图片
```

然后：

```text
录制状态和图片
  → 请求模型服务
  → 得到预测动作
  → 与录制的真实 mocap/hand_cmd 比较
  → 输出 RMSE、旋转误差、图表和汇总报告
```



**offline**

`offline_mode=open_eval`：

流程：

```text
离线状态和图片
  → 请求 GR00T 服务
  → 恢复模型动作
  → 通过 DDS 发布动作
```





`offline_mode=replay`：

流程：

```text
data_root_relative_6D.json 中的记录动作
  → 坐标恢复
  → DDS 发布
```



DDS发布然后GAE接收这个不需要模型参与，就是单纯 replay



**sync 和 async：在线执行模式**

它们都会：

- 订阅实时 `WR/BodyPose`。
- 打开配置中的三路相机。
- 请求 GR00T 或 PI 模型服务。
- 将模型动作恢复成 `(15,7)` mocap。
- 通过 DDS 发布身体和手部动作。

因此它们属于在线部署脚本。

但“在线”并不等于一定连接真机：

- DDS topic 接仿真器 → 在线仿真。
- DDS topic 接可视化程序 → 在线可视化。
- DDS topic 接机器人控制链 → 真机部署。

sync

```text
采集 observation
 → 等模型完成推理
 → 发送完整 action chunk
 → 再进行下一次推理
```

优点是容易理解和调试；缺点是推理期间可能停止发送动作。



async

```text
后台持续发送动作
       ↕
主线程并行请求下一批动作
       ↓
跳过已经过时的部分并替换 buffer
```

优点是动作更连续；缺点是更依赖推理延迟、buffer 和重规划参数。

推荐顺序：

```text
eval sync
→ eval async
→ 在线 sync + 仿真
→ 在线 async + 仿真
→ 真机
```



#### serve_res

分为 gr00t 和 pi 两种，负责链接模型和推理，主要功能是 `get_action`



`get_action` 流程：

```
observation
    │
    ├─ 提取 instruction `self._extract_instruction(observation)`
    ├─ 提取三路图像 `self._extract_frame_bytes(observation)`
    ├─ 提取 body_state / hand_state `self._extract_history_state(observation)`
    └─ 读取 options.delay (涉及RTC)
            │
            ▼
构造 multipart/form-data 请求
            │
            ▼
POST 到 self.predict_url
            │
            ├─ 非 200：抛出 ConnectionError
            │
            └─ 200：解析动作与附加信息
                        │
                        ▼
返回 {"mocap": [action_np]}, info_dict
```



1. 异步手状态处理？
2. 历史帧？会发送。会处理吗？





# 训练 & 调优

