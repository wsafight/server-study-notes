# CPU 性能分析工具 mpstat

mpstat 是一个多核 CPU 性能分析工具，用来实时查看每个 CPU 的性能指标，以及所有 CPU 的平均指标。

它需要在 Linux 系统上安装 sysstat。sysstat 包含了很多工具，用于监控和分析 Linux 系统性能。在使用之前需要安装对应的包。

```bash
apt install sysstat
```

如果你用的不是超级管理员。可能需要使用 sudo 命令来执行。



注：以上所有操作均在虚拟机 Ubuntu 22.04 GUI 系统。