---
title: 使用 SOAR 审核 SQL
description: 介绍小米 SOAR 的静态 SQL 审核能力、基本用法和使用边界。
---

[SOAR](https://github.com/XiaoMi/soar) 是小米开源的 SQL 分析与审核工具，可以从查询写法、索引使用和可维护性等角度给出建议。它适合作为代码评审和 CI 的辅助检查，不能替代真实数据分布下的执行计划与压测。

下载与当前平台匹配的可执行文件后，可以直接分析单条 SQL：

```bash
./soar -query "SELECT * FROM users WHERE email = 'user@example.com'"
```

也可以通过标准输入批量检查：

```bash
printf '%s\n' "SELECT * FROM users WHERE status = 1;" | ./soar
```

## 使用建议

- 先使用静态规则筛出 `SELECT *`、缺少限制条件、隐式类型转换等明显问题。
- 对关键 SQL 再结合 `EXPLAIN ANALYZE`、慢查询日志和生产数据分布验证。
- 连接测试数据库进行分析时使用只读账号，不要把生产密码写入脚本或 CI 日志。
- 工具规则和 MySQL 新版本特性可能存在差异，采纳建议前应核对项目使用的 MySQL 版本。

SOAR 项目的发布与维护节奏可能变化，引入团队流程前应确认其版本、平台支持和安全维护状态。
