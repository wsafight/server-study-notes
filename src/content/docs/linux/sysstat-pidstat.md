---
title: 进程性能分析工具 pidstat
---

pidstat 是一个进程性能分析工具，用来实时查看进程的 CPU、内存、I/O 以及上下文切换等性能指标。。

它需要在 Linux 系统上安装 sysstat。sysstat 包含了很多工具，用于监控和分析 Linux 系统性能。在使用之前需要安装对应的包。

```bash
apt install sysstat
```


注：以上所有操作均在虚拟机 Ubuntu 22.04 GUI 系统。