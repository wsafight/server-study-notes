---
title: PostgreSQL 在线 Schema 变更
description: 使用锁超时、并发索引、分批回填和 Expand-Contract 模式安全执行 PostgreSQL Schema 迁移。
---

DDL 是否“快速”与是否“无风险”不是一回事。即使元数据操作只需几毫秒，也可能等待旧事务并阻塞后续查询。迁移设计必须同时考虑锁模式、表扫描、重写、WAL、应用兼容和失败恢复。

## 上线前识别影响

在目标大版本和近似数据量的副本上确认：

- 命令需要的表锁以及锁持有到何时。
- 是否扫描或重写整表，是否重建索引。
- 预计产生的 WAL、复制延迟和额外磁盘空间。
- 旧版与新版应用能否同时读写迁移中的 Schema。
- 命令被取消后是否留下无效索引或中间对象。

设置较短 `lock_timeout` 防止 DDL 长时间排队后突然获得锁，并为实际执行设置独立的 `statement_timeout`。

```sql
BEGIN;
SET LOCAL lock_timeout = '2s';
SET LOCAL statement_timeout = '15min';
-- 经过验证的 DDL
COMMIT;
```

## Expand-Contract

跨版本发布通常分为：

1. Expand：增加新列、表或兼容能力，不破坏旧应用。
2. Migrate：双写或分批回填，并持续校验新旧表示一致。
3. Switch：读流量切换到新结构，保留快速回退能力。
4. Contract：确认旧版本不会再运行后，再删除旧结构。

不要在一次部署中同时重命名列并要求所有实例原子切换。滚动发布和任务重试会让新旧代码短时间并存。

## 增加非空列

先增加可空列或带合适常量默认值的列，再分批回填。为避免直接长时间验证 `NOT NULL`，可以先建立可延后验证的 Check Constraint：

```sql
ALTER TABLE orders
ADD CONSTRAINT orders_region_not_null
CHECK (region IS NOT NULL) NOT VALID;

ALTER TABLE orders
VALIDATE CONSTRAINT orders_region_not_null;

ALTER TABLE orders
ALTER COLUMN region SET NOT NULL;
```

不同版本对带默认值加列和 `SET NOT NULL` 的优化不同，必须在目标版本验证。回填应使用稳定批次键、限制事务大小，并根据复制延迟和存储压力节流。

## 并发创建索引

```sql
CREATE INDEX CONCURRENTLY orders_created_at_idx
ON orders (created_at);
```

`CREATE INDEX CONCURRENTLY` 降低对正常写入的阻塞，但耗时更长、工作量更大，而且不能放在普通事务块内。失败后可能留下 Invalid Index，需要检测并按验证流程清理或重建。

并发唯一索引建立成功后，可以在合适场景将其附加为约束。创建前先检查重复数据，避免把长时间扫描变成必然失败的操作。

## 删除和类型变更

删除列前先停止所有读取和写入，并观察至少一个完整发布与回滚窗口。大范围类型转换可能重写整表，更安全的方案通常是增加新列、双写、分批转换、校验后切换。

对于大对象重命名、外键增加、分区调整和 Enum 变化，应分别研究其版本行为，不能套用同一模板。

## 运行与验收

迁移脚本应记录开始时间、对象、批次进度和终止条件，并能够从已完成批次继续。运行期间监控锁等待、查询延迟、WAL、复制延迟、Autovacuum 和磁盘空间。

完成后验证约束、索引有效性、应用错误率、主副 Schema、一致性抽样和查询计划。Schema 版本成功写入迁移表不等于业务迁移已经完成。
