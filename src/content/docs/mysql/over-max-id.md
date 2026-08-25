---
title: 处理自增主键即将耗尽
description: 介绍 MySQL 整数主键容量评估、提前告警和在线扩容方案。
---

有符号 `INT` 的最大值是 `2147483647`，`INT UNSIGNED` 的最大值是 `4294967295`。自增值接近类型上限时，新插入会失败；删除旧行不会让 InnoDB 自动安全复用这些 ID。

## 提前监控

同时检查列类型和当前自增值：

```sql
SELECT
  table_schema,
  table_name,
  auto_increment
FROM information_schema.tables
WHERE table_schema = 'app_db'
  AND auto_increment IS NOT NULL
ORDER BY auto_increment DESC;
```

告警阈值应按剩余可用 ID 和当前增长速度计算，而不是只看已使用百分比。例如按照峰值写入速度估算剩余天数，并为 DDL 演练和回滚预留足够时间。

## 扩大字段类型

常见处理方式是把主键扩展为 `BIGINT UNSIGNED`：

```sql
ALTER TABLE orders
  MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT;
```

该操作是否原地完成、是否重建表以及会持有多久的锁，取决于 MySQL 版本和表结构。大表应先在同等数据量的环境中演练，并考虑 `gh-ost` 或 `pt-online-schema-change` 等在线变更工具。

扩容时还必须同步检查：

- 引用该主键的所有外键列和应用数据类型。
- ORM、序列化协议、消息体和下游数仓是否支持 64 位整数。
- 变更期间的双写、复制延迟、磁盘空间和回滚方案。

不要等到 ID 完全耗尽后再通过换表和回灌数据抢修。提前扩容通常比紧急切表更安全，也更容易验证数据一致性。
