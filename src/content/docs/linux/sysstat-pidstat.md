---
title: 使用 pidstat 分析进程性能
description: 按进程观察 CPU、内存、I/O 和上下文切换，定位系统异常的来源。
---

`pidstat` 来自 `sysstat` 软件包，用于把系统级指标进一步归因到进程或线程。

```bash
sudo apt install sysstat
pidstat -u 1 5
```

上面的命令每秒输出一次进程 CPU 数据，共采样五次。

## 常用视图

```bash
# 内存和缺页
pidstat -r 1

# 磁盘 I/O
pidstat -d 1

# 主动与被动上下文切换
pidstat -w 1

# 指定进程，并展开线程
pidstat -u -r -d -w -t -p <pid> 1
```

## 关键指标

- `%usr`、`%system` 和 `%CPU` 用于判断进程消耗 CPU 的位置与总量。
- `minflt/s` 表示不需要磁盘 I/O 的次缺页，`majflt/s` 表示需要读取存储的主缺页。
- `kB_rd/s`、`kB_wr/s` 表示进程读写吞吐。
- `cswch/s` 是主动上下文切换，`nvcswch/s` 是被调度器抢占等原因造成的被动切换。

一次瞬时峰值不足以得出结论。应让采样窗口覆盖故障时段，并与 `mpstat`、`vmstat`、`iostat` 和应用请求指标对齐。
