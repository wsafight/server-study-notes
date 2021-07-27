# 整数减去 null 得到是 null

```MYSQL
select
	id,
	total,
	used,
	(total - used) as have
from test_table;
```
使用 ifnull 函数处理
```MYSQL
select
	id,
	ifnull(total,0) as total,
	ifnull(used,0) as used,
	(ifnull(total,0) - ifnull(used,0)) as have
from test_table;
```