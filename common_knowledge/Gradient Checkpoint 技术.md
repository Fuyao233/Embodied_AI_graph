# Gradient Checkpoint 技术

一个使用 `checkpoint` 的示范：

```python
from torch.utils.checkpoint import checkpoint

for block in transformer_blocks: 
	def block_forward(x): 
		return block(x) 
	x = checkpoint(block_forward, x)
```



在正向传播过程中，只需要用 `checkpoint` 包裹，反向传播的时候 `pytroch` 内部会自动重新启用这个 `forward` 函数：

```python
def checkpoint_backward(saved_forward_fn, saved_x, grad_output):
    # 重新建立需要求梯度的输入
    recompute_x = saved_x.detach()
    recompute_x.requires_grad_(True)

    # 再次执行正向函数，恢复中间激活
    with torch.enable_grad():
        recompute_y = saved_forward_fn(recompute_x)

    # 使用重新建立的计算图计算梯度
    recompute_y.backward(grad_output)

    return recompute_x.grad
```

（以上是伪代码）



所以这就很容易导致一个问题，在 backward 的时候会重新执行 `block_forward` 但是由于使用 `checkpoint` 的时候没有保存 `block`，forward的时候依赖动态查询可以保证 `block` 的正确性，但是 `backward` 的时候 `block` 不再遍历，一直是 `transformer_blocks[-1]`. 解决方法也很简单，把 `def block_forward(x)` 改成 `def block_forward(x, block=block)`，这样  `checkpoint` 的时候会同时把对应的 ` block` 保存下来，`backward` 的时候就不会进行动态外部查询了。

