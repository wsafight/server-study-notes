---
title: MYSQL 子查询中不能使用 LIMIT
---

查询语句如下:

```SQL
select
  *
from
  test
where
  code_ver IN (
    select DISTINCT
      code_ver
    from
      test
    where
      code_ver NOT LIKE '%DevBld%'
    ORDER by
      date DESC
    LIMIT
      10
  );
```

此时，MYSQL 会报错，需要在子查询的外面再包一层就可以了。即：

```SQL
select
  *
from
  test
where
  code_ver IN (
    select
      *
    from
      (
        select DISTINCT
          code_ver
        from
          test
        where
          code_ver NOT LIKE '%DevBld%'
        ORDER by
          date DESC
        LIMIT
          10
      ) as t1
  );
```