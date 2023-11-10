# 磁盘分析工具 iostat

iostat 是系统的磁盘操作分析工具，用来动态查看系统的磁盘操作。

它需要在 Linux 系统上安装 sysstat。sysstat 包含了很多工具，用于监控和分析 Linux 系统性能。在使用之前需要安装对应的包。

```bash
apt install sysstat
```

安装完成后，执行一下对应的命令。

```bash
iostat
```