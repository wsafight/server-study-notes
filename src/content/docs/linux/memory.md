---
title: 排查 Linux 内存与 OOM
description: 区分页缓存、进程内存、Swap 和 cgroup 限额，并定位 OOM Killer 或内存泄漏。
---

Linux 会尽量把空闲内存用于页缓存，因此 `free` 很小并不等于内存不足。判断内存压力应同时观察可回收空间、换页活动、内存压力停顿、进程增长和 cgroup 限额。

## 读取全局状态

```bash
free -h
cat /proc/meminfo
vmstat 1 10
cat /proc/pressure/memory
```

重点关注：

- `MemAvailable`：内核估算的不触发明显换页即可用于新负载的内存。
- `SwapFree` 与 `vmstat` 的 `si`、`so`：Swap 已使用不代表当前仍在频繁换页，持续换入换出才说明活跃压力。
- `Active`、`Inactive`、`Cached`、`Slab`：帮助区分匿名内存、页缓存和内核对象。
- PSI `some`、`full`：任务因内存回收而停顿的时间比例，适合观察趋势。

不同内核版本的字段和统计口径可能变化，应以运行环境文档为准。

## 定位进程

```bash
ps -eo pid,ppid,user,rss,vsz,comm --sort=-rss | head
pidstat -r 1 10
cat /proc/<pid>/smaps_rollup
```

RSS 包含进程当前驻留在内存中的页面，但共享页面会在多个进程中重复出现。需要精确归因时使用 PSS 口径的工具或 `smaps`，并区分堆、匿名映射、文件映射和共享内存。

VSZ 只是虚拟地址空间大小，不能直接当作物理内存占用。数据库和 JVM 等程序还需要结合自身堆、Buffer Pool、直接内存和 GC 指标判断。

## 容器与 cgroup 限额

容器可能在主机仍有大量可用内存时达到自己的 cgroup 上限。cgroup v2 可检查：

```bash
cat /sys/fs/cgroup/memory.current
cat /sys/fs/cgroup/memory.max
cat /sys/fs/cgroup/memory.events
cat /sys/fs/cgroup/memory.pressure
```

实际路径取决于进程所属 cgroup 和容器运行时。`memory.events` 中的 `oom`、`oom_kill` 可以帮助判断是否在该组内触发 OOM。

## 查找 OOM 证据

```bash
journalctl -k --since "-2h" | rg -i 'out of memory|oom|killed process'
systemctl status <service>
```

记录被杀进程、当时内存、cgroup、调用栈和约束。OOM Killer 选择的受害者不一定是最初泄漏内存的进程。

## 处理原则

- 先限制异常流量、任务并发或单请求数据量，再考虑扩容。
- 发现持续增长时使用应用级堆分析器定位保留对象，不能只靠操作系统 RSS 猜测泄漏。
- 谨慎清理页缓存；它会扰动整机性能，通常不能解决匿名内存不足。
- 调整 Swap、`vm.overcommit_*` 或 OOM 分值前，明确工作负载和失败模式。
- 为内存使用量、PSI、换页、OOM 和进程重启建立联合告警。

内存问题常由无上限队列、批处理、缓存、连接数或单请求放大引起。修复时应给工作量设置上界，而不只是提高机器内存。
