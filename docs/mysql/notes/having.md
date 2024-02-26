# 使用 having 进行业务统计处理

在 SQL 中增加 HAVING 子句原因是，WHERE 关键字无法与合计函数一起使用。

如：从 table_name 中聚合用户 id，然后分析数据大于 10000 的用户

```SQL
SELECT userId,count(*) AS total
FROM table_name
where get_time > '2024-01-01 00:00:00'
group by userId
having count(*) > 10000
limit 100
```

注意索引！