---
title: 排查 Linux 文件描述符耗尽
description: 理解进程与系统文件描述符上限，并定位 socket、文件和管道泄漏。
---

Linux 用文件描述符表示普通文件、socket、管道、eventfd 等内核对象。进程达到上限时，可能出现 `Too many open files`、连接失败、日志无法写入或健康检查异常。

## 区分三个边界

- 进程的 soft limit：当前生效上限，进程可以在 hard limit 内提高。
- 进程的 hard limit：非特权进程可设置的最高值。
- 系统级文件句柄容量：整个内核可分配的总量。

```bash
ulimit -Sn
ulimit -Hn
cat /proc/<pid>/limits
cat /proc/sys/fs/file-nr
cat /proc/sys/fs/file-max
```

在 systemd 管理的服务中，交互 Shell 的 `ulimit` 不代表服务配置，应检查 unit 的 `LimitNOFILE` 和实际 `/proc/<pid>/limits`。容器运行时也可能设置独立限制。

## 统计进程打开对象

```bash
ls -1 /proc/<pid>/fd | wc -l
lsof -nP -p <pid>
```

`lsof` 在打开对象很多时可能产生明显开销和大量输出，应限定 PID 并控制频率。按链接目标或类型聚合 `/proc/<pid>/fd` 可以区分 socket、文件、管道和匿名 inode。

文件描述符数量随正常连接数增长不一定是泄漏。需要观察业务流量下降后是否回落、对象类型是否单调增长，以及创建与关闭速率。

## Socket 与连接问题

```bash
ss -s
ss -tanp
```

大量 established 连接可能来自连接池上限过大、慢客户端或长连接；大量 `CLOSE-WAIT` 通常表示对端已关闭，而本地应用尚未关闭 socket。`TIME-WAIT` 通常不占用应用进程的已打开描述符，不能混为一谈。

还要检查监听 socket、数据库连接、文件监视器和子进程管道。提高 `LimitNOFILE` 不能修复忘记关闭资源的代码。

## 已删除但仍打开的文件

日志轮转或手工删除后，进程仍持有旧 inode，磁盘空间不会释放：

```bash
lsof +L1
```

让应用正确重新打开日志或按受控流程重启。不要直接修改 `/proc/<pid>/fd` 指向的文件来回收空间，除非完全理解应用写入语义和数据风险。

## 修复与容量

1. 为连接池、并发请求、文件缓存和监视对象设置有界上限。
2. 使用语言运行时的资源管理结构，覆盖异常与取消路径。
3. 监控描述符使用率、增长率和创建失败，而不只监控绝对数量。
4. 确认应用真正需要后，再同时调整 systemd、容器和内核边界。
5. 压测峰值、慢客户端、依赖故障和滚动发布，预留管理连接。

上限的作用是把泄漏转化为局部可见失败。盲目提高上限可能让同一问题更晚发生，并耗尽整机资源。
