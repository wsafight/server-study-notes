# 公用表表达式 CTE

在 MySQL 8.0 后版本后可以使用公用表表达式 CTE（Common Table Expressions）。通过 CTE 可以多次引用以及自引用。比子查询更加强大。

对应的语法如下所示：

```SQL
WITH [RECURSIVE]
    cte_name [(col_name [, col_name] ...)] AS (subQuery)
    [, cte_name [(col_name [, col_name] ...)] AS (subQuery)]
    ...
SELECT  * FROM cte_name
```

写一下对应的查询语句测试看看：

```SQL
WITH hero (name, age) AS   -- 命名表和列名
(
  SELECT '白牛', 20
  UNION ALL
  SELECT '隐刺', 20
)
SELECT name, age FROM hero;
```

数据如下所示：

| name | age |
| ---- | --- |
| 白牛 | 20  |
| 隐刺 | 20  |

可以多次引用

```SQL
WITH hero (name, age) AS   -- 命名表和列名
(
  SELECT '白牛', 20
  UNION ALL
  SELECT '隐刺', 20
)
SELECT name, age FROM hero -- 第一次使用
  UNION ALL 
SELECT name, age FROM hero -- 第二次使用
;
```

数据如下所示：

| name | age |
| ---- | --- |
| 白牛 | 20  |
| 隐刺 | 20  |
| 白牛 | 20  |
| 隐刺 | 20  |

CTE 还可以递归调用，下面使用递归生成多条数据：

```SQL
WITH RECURSIVE num as ( -- 使用 RECURSIVE 声明可以递归调用
	SELECT 1 AS count
	UNION ALL
	SELECT count + 1 FROM num -- 这里引用了自身
		WHERE count < 2  -- 当 count 大于 1 就结束
)
SELECT * FROM num
```

| count |
| ----- |
| 1     |
| 2     |

如此，开发者就可以使用 CTE 递归调用表获取部门等树形结构了（注：全部获取在业务中处理更好，兼容更强）。

部门表结构如下所示：

```SQL
CREATE TABLE `departments` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `parent_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `path` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

表数据如下所示

| id  | parent_id | name        | path |
| --- | --------- | ----------- | ---- |
| 1   | 0         | 销售组      |      |
| 2   | 1         | 销售 1 组   | 1    |
| 3   | 2         | 销售 1 小组 | 1,2  |
| 4   | 1         | 销售 2 组   | 1    |
| 5   | 0         | 采购组      |      |

```SQL
WITH RECURSIVE department_tmp ( id, parent_id, `name` ) AS (
	SELECT
		id,
		parent_id,
		`name`
	FROM
		departments
	WHERE
     -- 下面开始递归查找所有数据
		parent_id = 0 UNION ALL
	SELECT
		a.id,
		a.parent_id,
		a.`name`
	FROM
		departments a
         -- 找到 parent_id 和 id 的对应
		JOIN department_tmp b ON a.parent_id = b.id
	)
SELECT
	*
FROM
	department_tmp
```

返回的结果如下所示:

| id  | parent_id | name        |
| --- | --------- | ----------- |
| 1   | 0         | 销售组      |
| 5   | 0         | 采购组      |
| 2   | 1         | 销售 1 组   |
| 4   | 1         | 销售 2 组   |
| 3   | 2         | 销售 1 小组 |

如果改为只获取销售组的数据，可以将

```SQL
WHERE parent_id = 0
-- 改为
WHERE parent_id = 1
```

| id  | parent_id | name        |
| --- | --------- | ----------- |
| 2   | 1         | 销售 1 组   |
| 4   | 1         | 销售 2 组   |
| 3   | 2         | 销售 1 小组 |

对应的[官方文档 CTE](https://dev.mysql.com/doc/refman/8.2/en/with.html) .