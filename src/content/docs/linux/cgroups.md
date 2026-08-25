---
title: 理解 cgroup 资源限制与 PSI
description: 使用 cgroup v2 诊断 CPU、内存、I/O 和进程数限制，并通过 PSI 识别资源停顿。
---

cgroup 把进程组织为层级，并对 CPU、内存、I/O 和进程数进行统计与控制。容器通常依赖 cgroup 实施资源限制，因此主机仍有空闲资源时，容器也可能因为自己的配额发生排队或 OOM。

本文以 cgroup v2 为主。先确认目标系统挂载和进程所属组：

```bash
stat -fc %T /sys/fs/cgroup
cat /proc/<pid>/cgroup
systemd-cgls
```

实际文件路径由 systemd、容器运行时和编排平台决定，不能假设所有进程都直接位于 `/sys/fs/cgroup/` 根目录。

## CPU 限制

```bash
cat <cgroup>/cpu.max
cat <cgroup>/cpu.stat
cat <cgroup>/cpu.pressure
```

`cpu.max` 表示配额与周期，`max` 代表没有带宽上限。`cpu.stat` 中 throttling 相关计数持续增长，说明组内任务因配额被节流。

CPU 使用率看似不高但延迟和运行队列上升时，检查是否在每个周期快速用完配额。提高配额前先判断是持续容量不足、并发突发还是单线程热点。

## 内存限制

```bash
cat <cgroup>/memory.current
cat <cgroup>/memory.max
cat <cgroup>/memory.high
cat <cgroup>/memory.events
cat <cgroup>/memory.pressure
```

`memory.high` 产生回收压力，`memory.max` 是硬上限。`memory.events` 的 `high`、`oom` 和 `oom_kill` 帮助确认限制事件，但仍要结合内核日志和平台状态判断被杀原因。

页缓存也计入 cgroup 内存。应用堆限制需要为运行时、线程栈、直接内存、页缓存和 Copy-on-Write 留出空间。

## I/O 与进程数

```bash
cat <cgroup>/io.stat
cat <cgroup>/io.pressure
cat <cgroup>/pids.current
cat <cgroup>/pids.max
```

I/O 控制依赖底层设备和控制器是否启用。设备号需要映射到实际块设备，虚拟卷和网络存储的统计可能只反映部分路径。

达到 `pids.max` 后无法创建新进程或线程，应用可能表现为线程创建失败而不是传统的 CPU/内存告警。

## PSI 如何解读

Pressure Stall Information 统计任务因为等待 CPU、内存或 I/O 而无法推进的时间：

- `some`：至少有部分任务停顿。
- `full`：所有非空闲任务同时停顿；CPU pressure 没有 `full`。
- `avg10`、`avg60`、`avg300`：不同窗口的停顿比例。
- `total`：累计停顿微秒数。

PSI 表示饱和与停顿，不直接给出根因。需要结合配额事件、宿主机资源、进程指标和应用延迟。

## 生产原则

- request 用于调度与容量承诺，limit 用于故障隔离，两者不应机械设成相同值。
- 为在线和批处理工作负载设置独立 cgroup，避免争抢同一预算。
- 修改限制前记录当前值、父级约束和平台期望，手工修改可能被编排器覆盖。
- 告警同时覆盖使用量、节流/回收事件、PSI 和用户 SLI。
- 通过 CPU 突发、内存增长、I/O 压力和线程爆炸验证限制后的失败方式。

cgroup 能限制故障范围，但不能替代应用内部的队列、并发和数据量上限。
