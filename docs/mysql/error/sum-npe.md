# SUM 函数 NPE 问题

当某一列的值全是NULL时，count(col)的返回结果是 0，但是 sum(col) 的返回结果为 NULL。因此使用sum()时需注意NPE问题。可以用以下语法来解决问题：

```SQL
SELECT IFNULL(SUM(col),0) FROM table;
```