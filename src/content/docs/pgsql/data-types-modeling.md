---
title: PostgreSQL 数据类型与约束设计
description: 根据数值精度、时间语义、标识生成和完整性边界选择 PostgreSQL 数据类型与约束。
---

类型和约束不只是存储格式，它们决定允许进入系统的数据集合。应用校验可以改善错误信息，但数据库约束才是并发写入、脚本和多个服务共同遵守的最终边界。

## 数值与标识

- 计数和内部标识通常使用 `bigint`，避免在业务成熟后迁移主键宽度。
- 金额和需要十进制定点精度的数据使用 `numeric(p, s)`，不要用浮点数表示账务金额。
- `real` 和 `double precision` 适合允许舍入误差的测量或科学计算。
- 新表优先使用 `GENERATED ... AS IDENTITY` 表达数据库生成的整数标识。
- UUID 便于跨系统生成，但索引更宽，写入局部性取决于生成算法；应根据版本和客户端支持选择方案。

业务编号和内部主键可以分离。业务编号需要唯一约束，但不一定适合作为所有子表的连接键。

## 文本、枚举与布尔值

PostgreSQL 中无长度限制的 `text` 与无长度限制的 `varchar` 性能语义接近。只有业务协议确实限制字符数时才声明长度，并明确限制的是字符还是编码后的字节。

固定且很少变化的状态可以使用枚举类型；跨团队频繁增加、合并或废弃的状态，通常更适合引用表加外键。不要使用字符串承载多个状态或用 `NULL` 同时表达未知、未设置和不适用。

## 时间语义

- 表示真实时间线上的时刻时，使用 `timestamptz`，输入会归一化后存储，显示受会话时区影响。
- 表示不绑定时区的本地日历时间时，才使用 `timestamp without time zone`。
- 生日、结算日等只需要日期的数据使用 `date`。
- 持续时间使用 `interval`，但月和日并不总能换算成固定秒数。

服务间传输时同时约定时区和格式。不要仅根据列名猜测一个时间戳代表发生时间、计划时间还是处理时间。

## 约束表达不变量

```sql
CREATE TABLE payment (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id uuid NOT NULL,
    account_id bigint NOT NULL REFERENCES account(id),
    amount numeric(18, 2) NOT NULL CHECK (amount > 0),
    currency text NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
    status text NOT NULL CHECK (status IN ('pending', 'settled', 'failed')),
    occurred_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (account_id, request_id)
);
```

`NOT NULL`、`CHECK`、`UNIQUE` 和外键应对应真实业务不变量。约束名称应稳定可读，便于应用将违反约束映射成明确错误，而不是解析数据库错误文本。

## 复杂类型的边界

数组、范围、复合类型和 `jsonb` 能让模型更贴近领域，但也会改变查询、更新和索引方式。需要独立引用、频繁修改或执行复杂关联的集合通常应规范化为子表。只随父记录整体读写且结构稳定的数据，才适合内嵌。

使用 Domain 可以复用跨表标量约束，但修改 Domain 会影响所有依赖对象。Generated Column 适合从同一行确定性计算的值，不应承担跨行或跨表一致性。

## 变更前验证

1. 统计现有值域、空值、长度、精度和异常格式。
2. 在影子表或可丢弃副本上验证类型转换表达式。
3. 评估转换是否重写整表、产生多少 WAL、持有什么锁。
4. 先增加可验证约束，再让应用依赖新的不变量。
5. 验证 ORM、驱动和序列化层是否保留精度、时区与空值语义。

类型设计应从查询、生命周期和不变量出发，而不是从某种编程语言的字段类型机械映射。
