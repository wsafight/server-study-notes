---
title: 尽量避免存储 NULL
---

针对表的设计，最好指定列为 NOT NULL,除非明确需要存储 NULL 值。

如果查询中包含可为 NULL 的列，对 MySQL 来说更难优化。

- 可为 NULL 的列使得索引，索引统计和值比较都更复杂。
- 可为 NULL 的列会使用更多的存储空间，在 MySQL 中需要特殊处理。

但把可为 NULL 的列改为 NOT NULL 带来的提升也非常小，所以（调优时）没有必要在现有 schema 中修改为 NOT NULL，除非确定这会导致问题。

还有一个相关的细节：MySQL 会对 NULL 进行索引，而 Oracle 则不会。
