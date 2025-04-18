---
title: 临时表
---

MySQL在以下几种情况会创建临时表：

- UNION查询；
- 用到TEMPTABLE算法或者是UNION查询中的视图；
- ORDER BY和GROUP BY的子句不一样时；
- 表连接中，ORDER BY的列不是驱动表中的；
- DISTINCT查询并且加上ORDER BY时；
- SQL中用到SQL_SMALL_RESULT选项时；
- FROM中的子查询；
- 子查询或者semi-join时创建的表；