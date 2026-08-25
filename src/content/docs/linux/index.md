---
title: Linux 运维与性能排查路径
description: 从故障范围、系统资源和进程证据出发，建立可重复的 Linux 排查顺序。
---

Linux 排障的核心不是背命令，而是在尽量少扰动现场的前提下回答三个问题：什么时候开始、影响哪些请求、哪个资源或依赖发生了变化。

## 推荐学习顺序

1. 从[系统化故障排查](./troubleshooting/)建立时间线、影响范围和证据意识。
2. 用 [uptime](./uptime/) 判断负载趋势，再通过 [mpstat](./sysstat-mpstat/)、[vmstat](./vmstat/)区分 CPU、运行队列、I/O 等待和换页。
3. 使用 [pidstat](./sysstat-pidstat/)把系统异常定位到进程或线程，需要函数级证据时再使用 [perf](./perf/)。
4. 分别深入[内存与 OOM](./memory/)、[磁盘 I/O](./disk-io/)和[网络问题](./network/)。
5. 结合 [systemd 与 Journal](./systemd-journal/)还原服务启动、退出和系统事件。

## 常见排查入口

| 现象 | 第一组证据 | 继续阅读 |
| --- | --- | --- |
| 请求延迟升高 | 应用分位延迟、`uptime`、`vmstat 1` | [系统化故障排查](./troubleshooting/) |
| 单核打满 | `mpstat -P ALL 1`、`pidstat -u -t 1` | [perf](./perf/) |
| 进程被杀 | `journalctl -k`、cgroup 内存事件 | [内存与 OOM](./memory/) |
| 磁盘变慢 | `iostat -xz 1`、`pidstat -d 1` | [磁盘 I/O](./disk-io/) |
| 连接超时 | `ss`、`ip -s link`、`sar -n` | [网络问题](./network/) |
| 服务重启 | `systemctl status`、`journalctl -u` | [systemd 与 Journal](./systemd-journal/) |

## 生产操作原则

- 先记录时间、命令和原始输出，再执行重启、清缓存或调参。
- 观察一段连续时间，避免用单个瞬时指标下结论。
- 把主机指标与应用延迟、发布记录、依赖状态放在同一时间线上。
- 对 `perf`、抓包、压力测试和大量日志查询设置持续时间与输出上限。
- 任何参数修改都应说明假设、预期指标、回滚方式和观察窗口。

工具展示的是不同层面的结果。高负载不一定是 CPU 不足，`%util` 接近 100% 也不必然代表现代 NVMe 饱和；必须结合队列、等待时间、吞吐和业务 SLO 判断。
