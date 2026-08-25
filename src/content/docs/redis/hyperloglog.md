---
title: 使用 HyperLogLog 估算去重数量
description: 使用 Redis HyperLogLog 以固定的小内存估算 UV 等基数，并理解误差与限制。
---

HyperLogLog 用于估算集合的基数，也就是不重复元素的数量。Redis 从 2.8.9 开始提供该结构，标准误差约为 `0.81%`，适合允许少量误差但数据规模很大的统计场景。

典型用例是网站 UV。可以按页面和日期建立 Key，把稳定的用户标识加入 HyperLogLog：

```bash
PFADD uv:home:2026-08-25 user:1001
PFADD uv:home:2026-08-25 user:1002
PFADD uv:home:2026-08-25 user:1001
PFCOUNT uv:home:2026-08-25
```

最后一次 `PFCOUNT` 的估算结果接近 `2`。`PFADD` 返回 `1` 表示至少一个内部寄存器发生变化，返回 `0` 表示内部状态未改变；它不是“命令是否执行成功”的布尔值。

## 合并多个统计周期

`PFMERGE` 可以把多个 HyperLogLog 合并到一个目标 Key：

```bash
PFMERGE uv:home:week \
  uv:home:2026-08-24 \
  uv:home:2026-08-25

PFCOUNT uv:home:week
```

## 空间与误差

Redis HyperLogLog 的稠密表示最多使用约 12 KiB 核心数据空间。基数较小时会使用更紧凑的稀疏表示，增长到一定程度后转换为稠密表示。

它通过元素哈希值中前导零等统计特征估算基数，因此有以下限制：

- 只能返回近似数量，不能用于计费、库存等要求精确的业务。
- 不保存可枚举的成员，无法回答“有哪些用户”。
- 不能删除单个已经加入的元素。
- 输入标识必须稳定；如果同一用户每次请求使用不同 ID，估算会失真。

需要精确去重或成员查询时使用 `SET`、Bitmap、数据库唯一键或离线计算，并根据数据规模评估内存成本。
