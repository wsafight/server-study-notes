---
title: DuckDB 入门
description: 从安装、第一条分析 SQL 和 Parquet 查询开始，理解 DuckDB 的使用方式、适用场景和边界。
---

DuckDB 是一个直接运行在本机程序里的分析型数据库。它不要求先部署数据库服务器，也没有必须配置的端口和账号；安装 CLI 或语言库后就能查询表、CSV、JSON 和 Parquet 文件。

可以先把它理解成：**像 SQLite 一样容易启动，擅长的却是数据分析。**

| 工具 | 更擅长的事情 |
| --- | --- |
| DuckDB | 在单机上扫描、连接、聚合和转换大量数据 |
| PostgreSQL、MySQL | 支撑许多客户端并发读写和在线事务 |
| Pandas | 在 Python 中灵活操作 DataFrame |

这不是严格的能力边界，而是选择工具时最先考虑的工作负载差异。

## 安装并打开第一个数据库

macOS 可以通过 Homebrew 安装 CLI：

```bash
brew install duckdb
duckdb --version
```

其他平台参见[官方安装说明](https://duckdb.org/docs/stable/installation/)，也可以直接安装 Python、Java、Node.js 等语言绑定。示例以 CLI 为主，因为它最容易观察 SQL 和结果。

在一个可丢弃目录中创建数据库文件：

```bash
mkdir -p duckdb-playground
cd duckdb-playground
duckdb practice.duckdb
```

提示符出现后，当前会话已经连接到 `practice.duckdb`。不需要再启动服务。输入 `.quit` 可以退出；下次执行同一条 `duckdb practice.duckdb`，之前保存的表仍然存在。

只执行 `duckdb` 而不指定文件时，数据默认位于内存中，进程退出后不会保留。这适合临时分析和测试。

## 创建第一张表

在 CLI 中执行：

```sql
CREATE TABLE orders (
    order_id BIGINT,
    ordered_at DATE,
    region VARCHAR,
    status VARCHAR,
    amount DECIMAL(12, 2)
);

INSERT INTO orders VALUES
    (1, DATE '2026-08-01', 'east',  'paid',    89.00),
    (2, DATE '2026-08-01', 'west',  'paid',   120.50),
    (3, DATE '2026-08-02', 'east',  'pending', 35.00),
    (4, DATE '2026-08-03', 'north', 'paid',   210.00),
    (5, DATE '2026-08-03', 'west',  'paid',    60.00);
```

查看表和结构：

```sql
.tables
.schema orders

SELECT * FROM orders ORDER BY order_id;
```

以 `.` 开头的是 CLI 命令，不是 SQL；通过 Python 或其他客户端连接时不能使用 `.tables`。SQL 中的分号表示一条语句结束。

## 完成第一次分析

现在回答一个具体问题：每个地区已支付订单有多少笔，总金额是多少？

```sql
SELECT
    region,
    count(*) AS order_count,
    sum(amount) AS total_amount
FROM orders
WHERE status = 'paid'
GROUP BY region
ORDER BY total_amount DESC;
```

预期结果是：

| region | order_count | total_amount |
| --- | ---: | ---: |
| north | 1 | 210.00 |
| west | 2 | 180.50 |
| east | 1 | 89.00 |

可以按下面的顺序读这条 SQL：

1. `FROM` 决定数据来自 `orders`。
2. `WHERE` 只留下已支付订单。
3. `GROUP BY` 把订单按地区分组。
4. `count` 和 `sum` 为每组计算订单数与金额。
5. `SELECT` 定义输出列，`ORDER BY` 按金额从高到低排列。

这类“读取许多行，最终返回少量汇总结果”的任务正是 DuckDB 擅长的分析型工作负载。

## 直接分析文件

DuckDB 的一个重要特点是：文件可以直接出现在 `FROM` 中，不必先导入数据库。先把刚才的表导出为 Parquet：

```sql
COPY orders TO 'orders.parquet'
    (FORMAT parquet, COMPRESSION zstd);
```

再像查询表一样查询文件：

```sql
SELECT
    region,
    sum(amount) AS total_amount
FROM read_parquet('orders.parquet')
WHERE status = 'paid'
GROUP BY region
ORDER BY total_amount DESC;
```

`read_parquet` 返回的关系可以参与过滤、连接、聚合和窗口计算，与普通表的使用方式接近。对多个同结构文件，也可以使用受控的文件列表或通配路径：

```sql
SELECT count(*)
FROM read_parquet('data/orders/*.parquet');
```

生产任务不应让活动目录中的文件集合在查询过程中随意变化。先固定输入文件清单，才能保证失败重试读取的仍是同一批数据。

## 在 Python 中使用

安装 Python 包：

```bash
python -m pip install duckdb
```

退出 CLI 后，可以从 Python 打开同一个数据库文件：

```python
import duckdb

with duckdb.connect("practice.duckdb", read_only=True) as connection:
    result = connection.execute(
        """
        SELECT region, sum(amount) AS total_amount
        FROM orders
        WHERE status = ?
        GROUP BY region
        ORDER BY total_amount DESC
        """,
        ["paid"],
    ).fetchall()

print(result)
```

DuckDB 在 Python 进程内执行查询，不需要通过网络访问另一个数据库服务。这里使用参数绑定传入状态值，避免自己拼接 SQL 字符串。

`fetchall()` 会把完整结果转换为 Python 对象，适合这里的小结果。大结果应分批读取、转为 Arrow Batch，或直接由 DuckDB 写出 Parquet，避免在 Python 中再复制一份完整数据。

## 为什么分析通常很快

不需要先理解数据库内核，只要建立两个直觉：

第一，DuckDB 面向列处理。查询只使用 `region`、`status` 和 `amount` 时，Parquet 等列式文件可以避免读取无关列。宽表里只取少量列时，这会显著减少读取量。

第二，DuckDB 分批处理一组值，而不是让解释器为每一行重复执行完整流程。这叫向量化执行。扫描、过滤、聚合和连接可以在紧凑的数据块上运行，也能利用多个 CPU 核心。

这些优化不是“任何 SQL 都一定快”。全量排序、高基数分组、多对多连接或一次返回海量结果，仍会消耗大量内存和临时磁盘。

## 一次分析的基本流程

面对真实文件时，可以先沿着固定顺序工作：

1. 查看 DuckDB 版本、输入文件和 Schema。
2. 用 `count(*)`、空值数量、最小值和最大值了解数据边界。
3. 写出过滤与聚合，并检查每一步的行数是否符合预期。
4. 只选择需要的列，把最终结果写入新的输出文件或表。
5. 保存输入清单、SQL、版本和结果校验，使任务能够重跑。

例如先检查文件结构，而不是立即查询所有数据：

```sql
DESCRIBE SELECT * FROM read_parquet('orders.parquet');

SELECT
    count(*) AS rows,
    count(*) FILTER (WHERE order_id IS NULL) AS missing_order_ids,
    min(ordered_at) AS first_date,
    max(ordered_at) AS last_date,
    sum(amount) AS total_amount
FROM read_parquet('orders.parquet');
```

## 初学时容易忽略的边界

- `read_csv_auto` 通过样本推断类型，样本外的异常值可能让生产任务失败；稳定任务应显式声明 Schema。
- `NULL` 表示未知或缺失，不等于 `0` 或空字符串，普通比较也不会把它当作相等。
- `TIMESTAMP` 与 `TIMESTAMPTZ` 的含义不同，跨时区数据不能只看显示出来的时间文本。
- `SELECT *` 方便探索，但宽表会读取和返回许多无关数据；稳定查询应写明确列名。
- 通配路径匹配到的文件可能变化，重复运行不一定读取同一输入。
- 数据库事务不能回滚已经写出的外部 Parquet 文件，需要单独设计临时目录和发布步骤。

## 适用场景

- 本地或 Notebook 中的交互式数据分析。
- 在应用中嵌入报表、数据转换和轻量分析功能。
- 对 Parquet 数据湖执行临时查询。
- ETL/ELT 流程中的格式转换、清洗和聚合。
- 单机范围内替代部分 Pandas 处理，利用 SQL 和磁盘溢写处理更大数据集。

## 使用边界

DuckDB 是进程内数据库，不是面向大量远程客户端的独立数据库服务。它不适合高并发、小事务、持续更新的典型 OLTP 工作负载。

- 同一进程可以并行读取和执行查询，但多进程并发写入同一数据库文件受到限制。
- 查询仍受 CPU、内存和临时磁盘约束，大数据集需要规划溢写目录和磁盘空间。
- 远程对象存储的性能取决于网络、文件布局和过滤下推效果。
- 对长期运行的共享服务，应评估 PostgreSQL、ClickHouse 等客户端/服务端系统。

选择 DuckDB 的关键不是“数据是否很大”，而是工作负载是否适合单机、嵌入式、批量分析。

## 继续阅读

接下来通过[查询与转换数据文件](./data-files/)处理 CSV、JSON 和 Parquet，再用[分析 SQL 模式](./analytical-sql/)练习窗口、去重和时序连接。遇到转换、金额或时区问题时，阅读[类型、NULL 与时间语义](./types-and-time/)；能够独立完成一次文件分析后，再进入[执行引擎与查询成本](./execution-engine/)。
