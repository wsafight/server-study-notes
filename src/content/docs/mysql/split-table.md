---
title: 分表
---

 水平分割。解决表行数过大问题
2.1.1 按照用户或业务的编号分表

对与用户或业务可以按照编号%n，进行分成n表。

例如：笑话表。

tb_joke_01,tb_joke_02,tb_joke_03,tb_joke_04........

2.1.2 按照日期分表
对于日志或统计类等的表。可以按照年,月，日，周分表。

例如 点击量统计。

tb_click_stat_201601，tb_click_stat_201602，tb_click_stat_201603

2.2 垂直分割。解决列过长问题。
1）经常组合查询的列放在一张表中。常用字段的表可以考虑用Memory引擎。
2）把不常用的字段单独放在一张表。

3）把text，blob等大字段拆分出来放在附表中。