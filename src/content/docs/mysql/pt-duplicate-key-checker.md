---
title: 使用 pt-duplicate-key-checker 检查重复索引
description: 使用 Percona Toolkit 查找 MySQL 中重复或被其他索引覆盖的索引。
---

重复索引会增加磁盘占用，并放大 `INSERT`、`UPDATE` 和 `DELETE` 的维护成本。Percona Toolkit 中的 `pt-duplicate-key-checker` 可以读取表结构，找出完全重复或可能冗余的索引。

## 基本用法

```bash
pt-duplicate-key-checker \
  --host=127.0.0.1 \
  --user=reviewer \
  --ask-pass \
  --databases=app_db
```

工具会输出判断依据和建议的 `ALTER TABLE ... DROP INDEX ...` 语句，默认不会修改表结构。不要未经复核直接执行建议。

## 如何判断是否真的冗余

例如同时存在 `INDEX idx_a (a)` 和 `INDEX idx_a_b (a, b)` 时，前者通常能被后者的最左前缀覆盖，但仍需检查：

- 两个索引是否具有不同的 `UNIQUE` 约束。
- 列顺序、前缀长度、排序方向和表达式是否一致。
- 索引是否被外键约束使用。
- 较短索引是否因体积更小而被高频查询采用。
- 线上查询是否存在索引提示或固定执行计划。

删除前应结合 `performance_schema`、慢查询日志和 `EXPLAIN` 确认使用情况，并在测试环境评估 DDL 的锁表与重建成本。
