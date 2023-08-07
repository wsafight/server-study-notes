# 热点更新

在秒杀等业务场景中，减少库存是一个常见的需要高并发，同时也需要串行化的任务模型。如果一定要在 MySQL 层面扛住并发的 update 是较为困难的。

如果有公司有此类业务，建议使用改造的 MySQL，让大量的并发 update 排队执行。

腾讯阿里都有对应的云数据库 TXSQL 和 AliSQL。

[阿里云数据库 AliSQL Inventory Hint](https://www.alibabacloud.com/help/zh/apsaradb-for-rds/latest/inventory-hint)

[腾讯云数据库 热点更新](https://cloud.tencent.com/document/product/236/63239)