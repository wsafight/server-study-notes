# 使用 gh-ost 修改 schema

[gh-ost](https://github.com/github/gh-ost) 是 GitHub 团队开发的，作为管理 schema 更改过程中的解决方案。该方案不会影响线上服务，同时它不像 pt-online-schema-change 一样使用触发器来进行迁移，而是以副本的形式链接到集群中，并将基于行的复制日志作为更改日志使用。所以，我们不必担心运行的 MySQL 版本。

如何使用： TODO

需要注意的是：gh-ost 不支持外键的表迁移。如果外键无法删除， pt-online-schema-change 则是更好的选择。