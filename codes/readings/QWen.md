# QWen2

**在结构之外**：

```python
    _tied_weights_keys = {"lm_head.weight": "model.embed_tokens.weight"}
    _tp_plan = {"lm_head": "colwise_allgather"}
    _sp_plan = {"lm_head": "colwise_loss_parallel"}
    _pp_plan = {"lm_head": (["hidden_states"], ["logits"])}
    _fsdp_plan = {"lm_head": "keep_full_weight"}
    # _tied_weights_keys  = 权重共享规则
    # _tp_plan            = 张量并行规则
    # _sp_plan            = 序列并行规则
    # _pp_plan            = 流水线并行接口说明
    # _fsdp_plan          = FSDP 分片策略
```

<img src="./QWen.assets/ChatGPT Image 2026年5月25日 15_51_56.png" alt="ChatGPT Image 2026年5月25日 15_51_56" style="zoom:50%;" />

**类结构**：

- `Qwen2ForCausalLM`：

  - `Qwen2Model`：
    - 输入：
      - inputs_id（经过tokenizer映射的词典id）
      - attention_mask
      - （可选）input_embedding，没有此输入会在内部自动调用self.embed_tokens
      - （可选）position_ids，每个 token 的位置编号，没有的话Qwen2 会自己生成。并且如果有 cache，会从“已经生成过的长度”继续往后编号
      - （可选）past_key_values，kv cache
    - 输出：hidden states

  - `lm_head`：输入hidden_state，输出logits
  - forward：
    - 输入：比`QWen2Model`多labels
    - 链路：`QWen2Model.forward` -> hidden_states -> `lm_head.forward` -> logits，如果有label则用`self.loss_function`计算loss，然后传给`CausalLMOutputWithPast`（通用返回值数据结构）
    - 输出：`CausalLMOutputWithPast`



- `QWen2Model`：
  - `self.embed_tokens = nn.Embedding`
  - `self.layers`：多个 `Qwen2DecoderLayer` 垒叠
  - `self.norm = Qwen2RMSNorm`：每层的正则化
  - `self.rotary_emb = Qwen2RotaryEmbedding`：RoPE，只在最开始计算一次，后续直接复用
  - `forward`：
    - 预计算`position_embeddings`
    - 遍历每层，迭代输出
    - 最后对输入再做一次norm：`hidden_states = self.norm(hidden_states)`



- `Qwen2DecoderLayer`
  - `self.self_attn = Qwen2Attention`
  - `self.mlp = Qwen2MLP`
  - `self.input_layernorm = Qwen2RMSNorm`
  - `self.post_attention_layernorm = Qwen2RMSNorm`



- `Qwen2RMSNorm`
  $$
  \mathrm{RMSNorm}(x) = \gamma \odot \frac{x}{\mathrm{RMS}(x)}
  \quad \text{where} \quad
  \mathrm{RMS}(x) = \sqrt{\frac{1}{d}\sum_{x_i \in x} x_i^2 + \epsilon}
  $$

  - $\gamma$ 是可学习参数
  - 这个方法比layernorm好在计算效率高，且效果相近
  - 平均是在一个batch的平均



- `Qwen2Attention`：多头注意力+GQA
  - `self.head_dim=config.hidden_size // config.num_attention_heads`：QKV运算是在维度为 hidden // num_Q 上进行的
  - `self.num_key_value_groups = config.num_attention_heads // config.num_key_value_heads`：num_group计算
  - K和V映射到 hidden_size // num_group 维度上，Q正常
  - `forward`：
    - 对输入做QKV映射并reshape
    - 对QK进行旋转`apply_rotary_pos_emb`：因为RoPE的目的是让attention score对位置敏感，而这个score只由 `QK^T` 决定，而不是由 V 决定
    - `past_key_values.update`：更新 kv_cache
    - 计算自注意力 `eager_attention_forward`：先用`repeat_kv`扩展kv，然后再按公式计算
    - 再过一个 hidden_size -> hidden_size 的映射（和naive transformer一致）





- `apply_rotary_pos_emb`：RoPE
  $$
  R_{\Theta,m}^{d}
  =
  \underbrace{
  \begin{pmatrix}
  \cos m\theta_0 & -\sin m\theta_0 & 0 & 0 & \cdots & 0 & 0 \\
  \sin m\theta_0 & \cos m\theta_0 & 0 & 0 & \cdots & 0 & 0 \\
  0 & 0 & \cos m\theta_1 & -\sin m\theta_1 & \cdots & 0 & 0 \\
  0 & 0 & \sin m\theta_1 & \cos m\theta_1 & \cdots & 0 & 0 \\
  \vdots & \vdots & \vdots & \vdots & \ddots & \vdots & \vdots \\
  0 & 0 & 0 & 0 & \cdots & \cos m\theta_{d/2-1} & -\sin m\theta_{d/2-1} \\
  0 & 0 & 0 & 0 & \cdots & \sin m\theta_{d/2-1} & \cos m\theta_{d/2-1}
  \end{pmatrix}
  }_{W_m}
  
  
  
  \\
  \Theta
  =
  \left\{
  \theta_i = 10000^{-2(i-1)/d},
  \ i \in [1, 2, \ldots, d/2]
  \right\}
  $$

  - m 是 position_id，d 是 head_dim 方向的维度
  - 但是QWen并不是严格按照上面这个公式旋转的，而是上半维度cos，下半维度 -sin，xi 和 xi+d/2 交互。不影响本质

  

- `Qwen2RotaryEmbedding`：输入 position_id 输出 R 的元素





- `Qwen2MLP`：经典的 SwiGLU 架构。用很小的结构改动，让 Transformer FFN 在同参数的情况下获得更强的表达能力。FFN是Transformer 里主要的非线性容量来源。

  - 激活函数：$x \cdot \sigma(x)$，结合了 ReLU 和 Sigmoid 的优点，具备平滑、非单调以及无上界但有下界的特性，能够有效缓解梯度消失问题，提升模型收缩和表达能力

  - ```
    Linear -> Activation
                       × -> Linear
    Linear ------------
    ```





**如何用decoder-only的架构做classification?**

decoder-only的架构和Bert类的区别就在于casual mask，所以可以取 hidden_states 中除了<pad\>之外的最后一个token的表示作为整个句子的表示