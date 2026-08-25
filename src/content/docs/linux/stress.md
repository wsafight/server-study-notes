---
title: 使用 stress-ng 进行系统压力测试
description: 通过受控的 CPU、内存和磁盘负载验证监控与故障处理流程。
---

`stress-ng` 可以生成可控的系统负载，适合学习性能指标、验证告警和演练容量边界。它会真实消耗资源，不应直接在未隔离的生产节点运行。

## 安装

```bash
sudo apt install stress-ng
```

RHEL 系发行版可通过系统支持的软件仓库安装。较早的 `stress` 工具功能更少，新实验优先使用 `stress-ng`。

## 常见场景

使用两个 CPU worker 持续 60 秒：

```bash
stress-ng --cpu 2 --timeout 60s --metrics-brief
```

分配并持续触碰 512 MiB 内存：

```bash
stress-ng --vm 1 --vm-bytes 512M --timeout 60s --metrics-brief
```

在明确指定的测试目录产生磁盘写入：

```bash
stress-ng \
  --hdd 1 \
  --hdd-bytes 1G \
  --temp-path /mnt/test-data \
  --timeout 60s \
  --metrics-brief
```

运行前确认目录所在磁盘、可用容量和清理策略，避免写满系统盘。

## 配合观测

```bash
uptime
mpstat -P ALL 1
pidstat -u -r -d 1
iostat -xz 1
```

一次只改变一个主要变量，并记录压力参数、监控时间和结果。实验结束后确认 worker 已退出，系统指标已经恢复到基线。
