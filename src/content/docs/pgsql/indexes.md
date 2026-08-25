---
title: PostgreSQL 索引类型与设计
description: 对比 B-tree、GIN、GiST、BRIN 等索引，并使用部分、表达式和覆盖索引匹配查询模式。
---

索引的目标是减少查询需要读取和处理的数据，同时维持可接受的写入、存储与维护成本。应从真实查询谓词、排序、返回列和数据分布设计，而不是为每一列单独建索引。

## 主要索引类型

| 类型 | 典型用途 | 特点 |
| --- | --- | --- |
| B-tree | 等值、范围、排序、前缀匹配 | 默认选择，适合可排序标量 |
| Hash | 等值比较 | 只支持特定等值操作，适用面较窄 |
| GIN | 数组、`jsonb`、全文检索 | 查询灵活，更新和构建成本通常较高 |
| GiST | 几何、范围、近邻和可扩展操作类 | 支持多种领域索引策略 |
| SP-GiST | 可自然分区的数据，如前缀或空间结构 | 适合特定非平衡分布 |
| BRIN | 与物理顺序高度相关的超大表 | 索引很小，但只能排除页面范围 |

能否使用某个操作取决于索引访问方法和操作符类。例如 `jsonb` 的不同 GIN 操作符类支持的查询范围与索引大小不同。

## 联合索引

```sql
CREATE INDEX idx_orders_tenant_created
ON orders (tenant_id, created_at DESC);
```

它适合按租户过滤并按时间范围或顺序读取。列顺序应基于实际谓词、排序和数据分布验证。PostgreSQL 也可能使用 Skip Scan 或组合多个索引，但不应依赖未验证的计划替代合适索引。

## 部分与表达式索引

部分索引只覆盖满足固定条件的行：

```sql
CREATE INDEX idx_jobs_ready
ON jobs (priority DESC, created_at)
WHERE status = 'ready';
```

只有优化器能证明查询条件蕴含索引谓词时才能使用它。参数化查询和写法差异可能影响匹配，应通过执行计划验证。

表达式索引适合稳定的计算条件：

```sql
CREATE UNIQUE INDEX idx_users_lower_email
ON users (lower(email));
```

它同时可以约束大小写不敏感的唯一性，但更新相关列时要维护表达式结果。

## 覆盖查询

`INCLUDE` 可以保存只用于返回、不用于搜索或排序的列：

```sql
CREATE INDEX idx_orders_customer
ON orders (customer_id) INCLUDE (status, total_amount);
```

Index-Only Scan 还依赖 Visibility Map；表更新频繁或 VACUUM 不及时，即使列都在索引中也可能需要访问堆表。

## 上线检查

- 使用 `EXPLAIN (ANALYZE, BUFFERS)` 对代表性参数验证扫描行数与 Buffer。
- 检查新索引是否重复、是否增加写放大和 VACUUM 成本。
- 大表使用 `CREATE INDEX CONCURRENTLY` 降低对写入的阻塞，但它耗时更长、资源开销仍在，并可能留下无效索引需要处理。
- 删除索引前覆盖完整业务周期，确认约束、外键和低频任务没有依赖。

索引使用统计只能证明“观察窗口内是否被计数”，不能单独证明索引永远无用。重启、统计重置和副本查询都会影响判断。
