# 使用 count(*) 进行 InnoDB 获取行数

使用 count 获取数据表数量时:

> count(*) > count(1) > count(主键) > count(字段) 


不要使用 count(列名) 或 count(常量) 来替代 count(*), count(*) 是SQL92定义的标准统计行数的语法，跟数据库无关，跟 NULL 和非 NULL 也无关。
