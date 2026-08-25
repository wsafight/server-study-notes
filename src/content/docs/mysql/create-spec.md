---
title: MySQL 建表设计检查清单
description: 从命名、数据类型、约束、索引和生命周期建立可执行的建表规范。
---

建表规范应服务于数据正确性和可维护性，不应把某个团队的命名偏好或固定行数阈值当作数据库定律。

## 基础定义

- 默认使用 InnoDB，并显式选择 `utf8mb4` 字符集和适合业务的排序规则。
- 表、列和索引使用一致的命名风格，避免 MySQL 保留字。
- 每张业务表定义稳定主键；不要默认把可变业务字段作为聚簇主键。
- 用 `NOT NULL`、`DEFAULT`、`UNIQUE`、`CHECK` 和外键表达真实约束，而不只依赖应用校验。
- 为表和含义不直观的列添加注释，枚举状态同时维护状态说明。

## 数据类型

- 整数选择能够覆盖增长周期的最小安全类型，并统一外键列类型。
- 金额使用最小货币单位的整数或 `DECIMAL`，不要使用 `FLOAT`、`DOUBLE` 保存精确金额。
- 根据时区、范围和自动初始化需求选择 `DATETIME` 或 `TIMESTAMP`，不存在所有时间列都必须用同一种类型的规则。
- `VARCHAR` 长度按业务上限设计；大文本是否拆表取决于访问模式、行宽和索引需求，而不是固定的 5000 字符阈值。
- 结构稳定且需要约束/索引的属性优先使用独立列，不要全部塞入 JSON。

## 索引

- 从实际查询的过滤、连接、排序和分组方式反推联合索引。
- 唯一业务规则使用唯一索引保护，避免并发下只靠“先查后插”。
- 控制重复和低收益索引，因为每个索引都会增加写入与存储成本。
- 索引命名应在团队内保持一致，例如 `uk_<columns>` 和 `idx_<columns>`。

## 生命周期与运维

- 明确数据保留、归档、删除和空间回收策略。
- 预估单表增长、DDL 时间、备份窗口和恢复时间，而不是达到固定 500 万行后才机械分表。
- 记录表的负责人、数据敏感级别和上下游依赖。

示例：

```sql
CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_no VARCHAR(32) NOT NULL,
  customer_id BIGINT UNSIGNED NOT NULL,
  amount DECIMAL(18, 2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
    ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_orders_order_no (order_no),
  KEY idx_orders_customer_created (customer_id, created_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;
```
