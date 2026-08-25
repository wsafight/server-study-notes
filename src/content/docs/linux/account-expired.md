---
title: 排查账号过期导致的定时任务失败
description: 从 PAM、账号有效期和 cron 环境排查定时任务无法执行的问题。
---

在启用了 PAM 账号检查的发行版中，账号到期可能让该账号的 cron 作业被拒绝执行。密码到期、账号到期和账号被锁定是不同状态，不应只凭一条错误信息直接修改安全策略。

## 查看失败日志

Debian 或 Ubuntu 通常使用 `cron` 服务：

```bash
sudo journalctl -u cron --since today
```

RHEL、CentOS 或 Rocky Linux 通常使用 `crond`：

```bash
sudo journalctl -u crond --since today
sudo tail -n 100 /var/log/cron
```

重点查找 `account expired`、`Authentication token is no longer valid`、命令不存在、权限不足等信息。

## 检查账号状态

```bash
sudo chage -l service_user
sudo passwd -S service_user
sudo -u service_user -- /absolute/path/to/job.sh
```

`chage -l` 用于查看密码和账号有效期，`passwd -S` 用于查看密码状态。手动以目标用户运行命令，可以区分账号问题与脚本自身问题。

## 处理原则

- 按组织安全策略延长账号有效期，不要为方便直接永久关闭所有过期策略。
- 非交互服务账号可以锁定密码登录，但账号本身必须保持有效。
- cron 中使用绝对路径，并显式设置需要的环境变量；cron 不会加载完整的交互式 shell 环境。
- 为任务配置标准输出和错误输出，避免失败后没有可诊断日志。
- 对关键任务可评估 systemd timer，它提供更明确的依赖、资源限制和日志管理。

修改账号策略前应确认该账号只用于预期服务，并记录变更原因和回滚方式。
