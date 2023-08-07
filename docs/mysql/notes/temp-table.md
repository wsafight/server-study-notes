# 临时表

MySQL在以下几种情况会创建临时表：

1、UNION查询；
2、用到TEMPTABLE算法或者是UNION查询中的视图；
3、ORDER BY和GROUP BY的子句不一样时；
4、表连接中，ORDER BY的列不是驱动表中的；
5、DISTINCT查询并且加上ORDER BY时；
6、SQL中用到SQL_SMALL_RESULT选项时；
7、FROM中的子查询；
8、子查询或者semi-join时创建的表；