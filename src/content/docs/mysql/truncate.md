---
title: TRUNCATE TABLE 与 DELETE 的区别
description: 对比 MySQL 清空表时 TRUNCATE TABLE 和 DELETE 的事务、锁与副作用。
---

`TRUNCATE TABLE` 用于快速清空整张表，但它不是无条件更快的 `DELETE`。在 MySQL 中，`TRUNCATE TABLE` 属于 DDL，会隐式提交当前事务，执行后不能通过 `ROLLBACK` 恢复。

```sql
TRUNCATE TABLE staging_events;
```

## 主要差异

| 行为 | `TRUNCATE TABLE` | `DELETE FROM table` |
| --- | --- | --- |
| 删除范围 | 只能清空整表 | 可以使用 `WHERE` |
| 事务回滚 | 不支持 | InnoDB 中支持 |
| `DELETE` 触发器 | 不触发 | 逐行触发 |
| 自增计数器 | 通常重置 | 通常保留 |
| 权限 | 需要 `DROP` 权限 | 需要 `DELETE` 权限 |
| 执行方式 | 重新创建或快速清空表空间 | 删除匹配的行并记录事务变化 |

`TRUNCATE TABLE` 需要获取元数据锁；存在长事务或未结束查询时可能等待。被其他表通过外键引用时也可能无法执行。

应用代码中应优先明确删除范围，并为误操作保留事务或备份保护。只有在确认整表数据都可丢弃、外键与锁影响可控时，才使用 `TRUNCATE TABLE`。
