---
title: PostgreSQL JSONB 建模与索引
description: 在关系模型与 JSONB 之间划分边界，并使用 GIN、表达式索引和约束优化 JSONB 查询。
---

`jsonb` 适合存储结构存在一定变化、但仍需要在数据库内查询的文档属性。它不是跳过数据建模的捷径：核心标识、关系、状态和频繁过滤字段仍应优先使用有类型的普通列。

## JSON 与 JSONB

`json` 保留输入文本形式，每次处理时解析；`jsonb` 保存分解后的二进制结构，忽略无意义空白和对象键顺序，并支持更多操作符和 GIN 索引。

如果只需原样留存外部报文，可以使用 `json` 或单独保存原始载荷；需要包含、路径、键存在性查询时通常选择 `jsonb`。无论哪种类型，数据库都只验证 JSON 语法，不会自动验证业务 Schema。

## 划分关系边界

适合放入普通列的数据：

- 主键、外键、租户、时间和状态。
- 经常用于过滤、排序、连接或唯一约束的字段。
- 需要严格类型、非空或引用完整性的业务值。

适合放入 `jsonb` 的数据：

- 不同来源拥有少量可选差异的扩展属性。
- 随父记录整体读写的快照或配置。
- 需要保留未知字段以支持协议演进的数据。

不要把持续增长的事件列表或需要独立更新的子实体塞入一个 JSON 数组。

## 查询与更新

```sql
SELECT id,
       attributes ->> 'device_type' AS device_type
FROM event
WHERE attributes @> '{"country":"CN"}'::jsonb
  AND attributes ? 'device_type';

UPDATE event
SET attributes = jsonb_set(
    attributes,
    '{reviewed}',
    'true'::jsonb,
    true
)
WHERE id = 42;
```

`->` 返回 JSON，`->>` 返回文本。比较数字或时间时应显式转换并处理非法值。更新一个嵌套属性仍会产生新的行版本和新的 JSONB 值，大文档的频繁局部更新会放大 WAL、TOAST 和 Vacuum 压力。

## 选择索引

```sql
CREATE INDEX event_attributes_gin
ON event USING gin (attributes);

CREATE INDEX event_country_idx
ON event ((attributes ->> 'country'));
```

默认 `jsonb_ops` 支持更广泛的键、存在性和包含查询。`jsonb_path_ops` 索引通常更小，适合以包含和 JSONPath 为主的场景，但支持的操作范围更窄。只查询少数稳定路径时，表达式 B-tree 索引通常更精确，也能支持排序和普通比较。

索引整个文档会增加写放大。应从实际查询日志提取操作符和路径，用 `EXPLAIN (ANALYZE, BUFFERS)` 验证候选索引。

## 增加结构约束

```sql
ALTER TABLE event
ADD CONSTRAINT event_attributes_object
CHECK (jsonb_typeof(attributes) = 'object');

ALTER TABLE event
ADD CONSTRAINT event_country_string
CHECK (
    NOT (attributes ? 'country')
    OR jsonb_typeof(attributes -> 'country') = 'string'
) NOT VALID;
```

对于关键路径，可以通过 Check Constraint、Generated Column 或写入前验证收紧结构。先使用 `NOT VALID` 增加约束，再清理历史数据并执行 `VALIDATE CONSTRAINT`，可以把存量扫描与短暂元数据操作分开。

## 生产检查

监控单行和 JSONB 列大小、TOAST 访问、GIN 索引增长、更新频率和 Vacuum 压力。准备包含缺字段、显式 JSON `null`、SQL `NULL`、错误类型和超大文档的测试数据，确保应用能区分这些状态。

当查询越来越依赖固定路径、跨文档连接和强约束时，应将稳定字段迁回关系列或子表，而不是继续叠加 JSONPath 和表达式索引。
