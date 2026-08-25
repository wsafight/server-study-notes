---
title: 使用 GROUP_CONCAT 聚合分组内容
description: 说明 GROUP_CONCAT 的排序、去重、长度限制以及适用边界。
---

`GROUP_CONCAT()` 可以把同一分组中的多行值拼接为一个字符串，适合生成标签列表、展示摘要等结果。

```sql
SELECT
  department_id,
  GROUP_CONCAT(
    DISTINCT user_name
    ORDER BY user_name
    SEPARATOR ', '
  ) AS user_names
FROM users
GROUP BY department_id;
```

## 使用要点

- 默认逗号分隔，可以通过 `SEPARATOR` 修改。
- 不指定函数内部的 `ORDER BY` 时，拼接顺序没有保证。
- `NULL` 会被忽略；分组内全部为 `NULL` 时，结果也是 `NULL`。
- `DISTINCT` 可以去重，但会增加排序或临时结果处理成本。
- 返回值受 `group_concat_max_len` 限制，结果超长时会被截断并产生警告。

查看并调整当前会话的限制：

```sql
SHOW SESSION VARIABLES LIKE 'group_concat_max_len';
SET SESSION group_concat_max_len = 1024 * 1024;
```

`GROUP_CONCAT()` 适合展示层聚合，不适合替代规范化的数据关系，也不应作为可靠的数据交换格式。数据量较大时，应返回明细行并在应用层分页或组装。
