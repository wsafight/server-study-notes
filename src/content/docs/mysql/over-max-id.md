---
title: 处理自增 id 超过最大值
---

数据表主键 int 类型的最大值是 2147483647。也就是说表的数据量大于 21 亿就会出现插入不了的情况。此时数据表再插入就会报错了。我们当然需要在此之前尽快处理问题。

较快但是对用户有影响的方案

- 提取发布功能不可用公告或者找一个较少使用量的时间
- 根据当前表建立新表
- 把之前的表改成其他名字
- 把新的表改为之前表的名字（让数据可以流入）
- 把之前表的 id 改为 bigInt
- 重新命名两张表，并且将新表的数据传回旧表