---
title: 使用 systemd 与 Journal 排查服务
description: 通过 unit 状态、退出原因、启动依赖和结构化日志定位 Linux 服务异常。
---

systemd 管理服务生命周期和依赖，Journal 记录 unit 输出、内核消息与结构化元数据。排查服务重启时，应先确认是应用主动退出、健康检查触发、资源限制、信号终止还是 systemd 策略。

## 查看服务状态

```bash
systemctl status app.service
systemctl show app.service \
  -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p NRestarts
systemctl cat app.service
```

`status` 只显示有限日志。`show` 适合读取机器可解析的运行结果，`cat` 用于确认最终合并后的 unit 和 drop-in 配置。

修改 unit 后需要重新加载定义：

```bash
systemctl daemon-reload
systemctl restart app.service
```

重启是有状态变更，生产执行前要确认流量摘除、依赖顺序和回滚方式。

## 精确查询日志

```bash
journalctl -u app.service --since "2026-08-25 10:00:00" --until "2026-08-25 10:30:00"
journalctl -u app.service -p warning..alert
journalctl -u app.service -f
journalctl -b -1 -u app.service
journalctl -k --since "-1h"
```

- `-u` 按 unit 过滤。
- `--since`、`--until` 限定事故窗口。
- `-p` 按优先级过滤，但应用必须正确标注级别。
- `-b -1` 查看上一次启动周期。
- `-k` 只看内核日志，适合查 OOM、设备和网络事件。

日志时间可能受时区和时钟同步影响。导出事故证据时同时记录主机启动 ID、当前时间与时区。

## 分析启动失败

```bash
systemd-analyze critical-chain app.service
systemctl list-dependencies app.service
```

依赖启动成功不代表依赖已经能接受业务请求。应用仍需实现带退避的连接重试和明确的 readiness 检查。

常见失败包括路径或用户错误、环境变量缺失、权限、端口占用、`ExecStart` 返回非零、启动超时和依赖顺序错误。不要只增加 `Restart=always`，否则配置错误会形成高速重启循环并淹没日志。

## 资源限制与退出原因

unit 可以通过 cgroup 限制内存、CPU 和进程数。排查时检查 `MemoryMax`、`CPUQuota`、`TasksMax` 及对应 cgroup 事件。退出码 `137` 常表示进程收到 `SIGKILL`，但信号来源可能是 OOM、管理员、容器平台或超时策略，必须结合内核和管理平面日志确认。

## 日志保留

确认 Journal 是内存还是持久化存储，并设置空间、轮转与集中采集策略。日志中不得输出密码、Token 和完整个人信息。高频错误应限速，但不能因此丢失第一次错误、最终状态和关联请求标识。

服务恢复后，保留故障窗口的 unit 配置、状态和日志。它们应与应用监控、发布记录及[系统化故障排查](../troubleshooting/)中的资源快照一起分析。
