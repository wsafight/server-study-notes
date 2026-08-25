---
title: 使用 mysqlbinlog 分析二进制日志
description: 介绍 MySQL 二进制日志的用途、解析方式和按时间点恢复时的注意事项。
---

二进制日志（binary log，简称 binlog）记录会改变数据或表结构的事件，主要用于主从复制和按时间点恢复（PITR）。它不是慢查询日志，不能用来判断一条查询为什么执行得慢。

## 确认日志配置

```sql
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'log_bin_basename';
SHOW BINARY LOGS;
```

MySQL 8.0 默认使用 `ROW` 格式。该格式记录行事件，信息完整，但需要使用 `mysqlbinlog` 的详细输出才能看到行数据。

## 解析日志

解析本地日志文件：

```bash
mysqlbinlog --base64-output=DECODE-ROWS -vv mysql-bin.000123
```

按时间范围和数据库缩小输出：

```bash
mysqlbinlog \
  --start-datetime='2026-08-25 10:00:00' \
  --stop-datetime='2026-08-25 10:10:00' \
  --database=app_db \
  --base64-output=DECODE-ROWS \
  -vv mysql-bin.000123
```

`ROW` 格式中常见的 `Table_map`、`Write_rows`、`Update_rows` 和 `Delete_rows` 分别表示表映射及对应的行变更。分析跨库事务时不要只依赖 `--database` 过滤，应该结合事务边界、GTID 或 position 核对完整事件。

## 按时间点恢复

通常先恢复一份全量备份，再重放备份之后、误操作之前的 binlog：

```bash
mysqlbinlog \
  --start-position=154 \
  --stop-position=9821 \
  mysql-bin.000123 | mysql --user=root --password app_db
```

恢复前应先在隔离环境验证范围，并注意以下事项：

- 保持日志文件和事务的原始顺序，不要漏掉轮转后的文件。
- 使用 position 时确认它属于正确的日志文件；使用 GTID 时避免重复执行事务。
- binlog 可能包含业务数据，应限制文件权限并避免把解析结果写入公共日志。
- 生产恢复应先备份当前状态，并由具备数据库恢复经验的人员复核命令。
