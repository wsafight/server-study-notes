---
title: 在应用中嵌入 DuckDB
description: 管理 DuckDB 连接、数据库文件、Arrow 与 DataFrame 数据交换、并发和应用发布生命周期。
---

DuckDB 作为库运行在应用进程内，不需要独立数据库服务。这减少了网络和部署成本，也意味着数据库的 CPU、内存、崩溃和文件权限都与宿主应用共享。

## 选择数据库生命周期

- **内存数据库：** 适合临时计算，进程退出后数据消失。
- **临时文件任务：** 输入来自数据湖，结果写回文件，不长期维护内部表。
- **持久数据库文件：** 保存表、视图和元数据，适合单应用管理的本地分析状态。

数据库文件应放在支持本地文件系统语义的持久卷上。不要默认把它放在网络文件系统或多个容器共享写入，文件锁、缓存一致性和故障行为可能不受支持。

## Python 示例

```python
import duckdb

with duckdb.connect("analytics.duckdb") as connection:
    result = connection.execute(
        """
        SELECT region, sum(amount) AS total_amount
        FROM read_parquet(?)
        WHERE created_at >= ?
        GROUP BY region
        """,
        ["data/orders/*.parquet", "2026-08-01"],
    ).fetchall()
```

对值使用参数绑定，不能把用户输入直接插入 SQL。表名、列名和文件路径不能总是作为普通值参数处理，应使用固定映射或严格白名单。

大量结果不要一次 `fetchall()` 到内存。优先使用 Arrow、分批读取或直接 `COPY` 到目标文件，让数据交换保持列式和有上界。

## 选择结果接口

结果接口应由下游消费方式决定：

| 接口 | 适合场景 | 主要风险 |
| --- | --- | --- |
| `fetchone()`、`fetchmany()` | 少量控制数据或逐批处理 | 按 Python 行和对象转换，大结果开销高 |
| Arrow Record Batch | 列式计算、流式传递给 Arrow 生态 | 必须控制批大小和消费者背压 |
| Pandas DataFrame | 已有 Pandas 分析流程、中小结果 | 一次物化可能耗尽内存，类型可能变化 |
| Polars DataFrame | 列式 DataFrame 处理 | 仍需确认是否一次物化及版本类型映射 |
| `COPY` | 大结果直接发布为文件 | 需要额外的临时路径、验证和发布协议 |

Arrow 分批读取可以避免把完整结果同时转换成 Python 对象：

```python
import duckdb

with duckdb.connect("analytics.duckdb", read_only=True) as connection:
    reader = connection.execute(
        """
        SELECT customer_id, ordered_at, amount
        FROM orders
        WHERE ordered_at >= ? AND ordered_at < ?
        ORDER BY ordered_at, customer_id
        """,
        ["2026-08-01", "2026-09-01"],
    ).fetch_record_batch(rows_per_batch=100_000)

    for batch in reader:
        consume_batch(batch)
```

批大小是吞吐、延迟和峰值内存之间的折中。消费者处理速度慢时，应用必须提供有界队列或同步背压，不能一边读取一边无限缓存 Batch。Record Batch Reader、查询结果和底层连接存在生命周期关系，应在连接关闭或执行下一条查询前消费完成；具体行为以锁定的 Python 客户端版本测试。

Arrow 允许 DuckDB 与其他列式工具复用部分缓冲区，但“使用 Arrow”不等于整个查询零复制。类型转换、过滤、连接、排序和结果所有权都可能分配新内存，仍要监控宿主进程 RSS。

## 输入 Arrow、Pandas 与 Polars

对应用已有的 Arrow Table 或 Record Batch，优先显式注册或创建 Relation，而不是依赖 Python 变量名的隐式 Replacement Scan：

```python
import duckdb

with duckdb.connect() as connection:
    connection.register("incoming_orders", orders_arrow)
    try:
        result = connection.execute(
            """
            SELECT region, sum(amount) AS total_amount
            FROM incoming_orders
            GROUP BY region
            ORDER BY region
            """
        ).fetch_record_batch()

        for batch in result:
            consume_batch(batch)
    finally:
        connection.unregister("incoming_orders")
```

显式名称便于审计 SQL 的数据来源，也能明确对象何时可以释放。不要把外部请求提供的名称直接作为表名；名称使用应用固定映射，值继续使用参数绑定。

Pandas 和 Polars 可以作为输入或结果接口，但需要特别验证：

- Pandas `object` 列可能混合字符串、数字和 Python 对象，先转成明确的扩展类型或 Arrow Schema。
- 可空整数、布尔值、Categorical、Decimal 和时区列在不同库间可能映射成不同类型。
- Polars 与 Arrow 更接近列式表示，但嵌套类型、时区和 Decimal 仍要按客户端版本回归。
- DataFrame 索引通常不是业务列；需要保留时应显式重置并命名。
- 导出到 DataFrame 可能一次物化完整结果，不能用它替代大结果的分批或文件发布。

在接口边界记录输入和输出的 Arrow Schema 或 DuckDB `DESCRIBE` 结果，并用空表、全空列、边界数值、带时区时间和嵌套列做契约测试。

## 控制 UDF 边界

能够用 DuckDB SQL、内置函数或列式表达式完成的转换，不应逐行调用 Python 函数。标量 Python UDF 会跨越执行引擎与解释器边界，常常失去向量化优势，并引入 `NULL`、异常和线程行为差异。

必须使用自定义逻辑时，优先选择目标版本支持的批量或 Arrow 形式，明确输入输出类型、空值策略和异常策略。先用代表性数据比较纯 SQL、批量 UDF 与逐行实现的耗时和峰值内存；不要只用几十行样本得出结论。

## 连接与线程

连接对象是否可跨线程使用取决于客户端绑定，不要未经验证共享同一连接。常见做法是为任务创建独立连接或 cursor，并由应用限制同时运行的重查询数量。

DuckDB 可以在单进程内协调并发，但它不是大量远程请求共享的数据库服务器。多个进程可以只读访问持久文件；多个独立进程持续写同一文件不是主要支持模式。需要服务化时，应由单个受控进程拥有数据库，并明确排队、超时和内存预算，或改用客户端/服务端数据库。

## 扩展与安全

DuckDB 扩展运行在应用进程中，具有相同的数据和文件权限。生产环境应锁定 DuckDB 与扩展版本，限制自动安装来源，并预先验证离线启动。

读取本地文件、HTTP 和对象存储的 SQL 能力很强，不应直接暴露给不可信用户。隔离允许目录和网络目标，使用最小权限凭据，并为查询设置资源和持续时间上限。

## 发布与恢复

- 在升级库版本前复制数据库文件，并用新旧版本分别执行兼容性测试。
- 单个文件副本只有在一致性边界明确时才是备份；活跃写入期间不要随意复制底层文件。
- 报表任务使用临时输出加完成标记，失败时可以幂等重跑。
- 记录查询版本、输入文件清单和 DuckDB 版本，保证结果可追溯。
- 监控宿主进程的 RSS、CPU、临时磁盘和任务队列，因为 DuckDB 没有独立服务边界替你隔离资源。

当分析工作负载开始要求多节点扩展、跨服务共享写入、细粒度租户隔离或独立故障域时，应重新评估架构，而不是继续把所有请求压进一个嵌入式文件。

## 继续阅读

连接与写入冲突参见[并发与事务边界](./concurrency-transactions/)；持久文件的升级和备份参见[数据库文件运维](./database-operations/)。
