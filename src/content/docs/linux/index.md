---
title: Linux 运维与性能排查路径
description: 从故障范围、系统资源和进程证据出发，建立可重复的 Linux 排查顺序。
---

Linux 排障的核心不是背命令，而是在尽量少扰动现场的前提下回答三个问题：什么时候开始、影响哪些请求、哪个资源、进程或依赖发生了变化。

## 1. 建立排查方法

- [系统化故障排查](./troubleshooting/)：先建立时间线、影响范围和证据层级，再提出可证伪假设。
- [使用 perf 定位 CPU 热点](./perf/)：从采样、调用栈和符号定位函数级成本，并控制生产采样开销。

先用低开销系统指标缩小范围，只有在证据指向具体进程或函数时才进入详细 Profiling、抓包或大量日志查询。

## 2. 收集资源证据

1. 用 [uptime](./uptime/)查看负载趋势，再通过 [mpstat](./sysstat-mpstat/)和 [pidstat](./sysstat-pidstat/)区分 CPU、运行队列、进程和线程成本。
2. 使用 [vmstat](./vmstat/)关联运行队列、内存、换页、I/O 等待和上下文切换。
3. 从[内存与 OOM](./memory/)判断可用内存、缓存、回收和进程被杀原因。
4. 在容器环境检查 [cgroup 与 PSI](./cgroups/)，区分主机空闲和容器自身受限。
5. 使用 [iostat](./sysstat-iostat/)观察设备延迟、队列和吞吐，再按[磁盘 I/O 排查](./disk-io/)关联进程与文件。
6. 从 [Linux 网络问题](./network/)检查接口、Socket、重传、路由和 DNS，并与[网络与 HTTP](../network/)章节结合。

## 3. 系统与服务运维

- [systemd 与 Journal](./systemd-journal/)：还原启动、退出、依赖、重启和内核事件。
- [文件描述符耗尽](./file-descriptors/)：区分进程限制、系统限制、Socket 和已删除文件。
- [账号过期导致定时任务失败](./account-expired/)：检查身份、PAM、Shell 和非交互执行环境。
- [估算服务实例数量](./instance-quota/)：从到达率、服务时间、利用率和容错余量计算，而不是固定按 CPU 核数。
- [使用 stress-ng 验证资源告警](./stress/)：只在隔离环境施压，并为持续时间和资源范围设置硬上限。

## 常见排查入口

| 现象 | 第一组证据 | 继续阅读 |
| --- | --- | --- |
| 请求延迟升高 | 应用分位延迟、`uptime`、`vmstat 1` | [系统化故障排查](./troubleshooting/) |
| 单核打满 | `mpstat -P ALL 1`、`pidstat -u -t 1` | [perf](./perf/) |
| 进程被杀 | `journalctl -k`、cgroup 内存事件 | [内存与 OOM](./memory/) |
| 磁盘变慢 | `iostat -xz 1`、`pidstat -d 1` | [iostat](./sysstat-iostat/)、[磁盘 I/O](./disk-io/) |
| 连接超时 | `ss`、`ip -s link`、`sar -n` | [网络问题](./network/) |
| 服务重启 | `systemctl status`、`journalctl -u` | [systemd 与 Journal](./systemd-journal/) |
| `Too many open files` | `/proc/<pid>/limits`、`lsof`、`ss` | [文件描述符耗尽](./file-descriptors/) |
| 定时任务突然失败 | 账号状态、PAM、环境变量和 Journal | [账号过期](./account-expired/) |
| 容量规划 | 到达率、服务时间、利用率和故障余量 | [实例数量估算](./instance-quota/) |

## 生产操作原则

- 先记录时间、命令和原始输出，再执行重启、清缓存或调参。
- 观察一段连续时间，避免用单个瞬时指标下结论。
- 把主机指标与应用延迟、发布记录、依赖状态放在同一时间线上。
- 对 `perf`、抓包、压力测试和大量日志查询设置持续时间与输出上限。
- 压力测试只在明确隔离、可终止且有资源配额的环境运行。
- 任何参数修改都应说明假设、预期指标、回滚方式和观察窗口。

工具展示的是不同层面的结果。高负载不一定是 CPU 不足，`%util` 接近 100% 也不必然代表现代 NVMe 饱和；必须结合队列、等待时间、吞吐和业务 SLO 判断。
