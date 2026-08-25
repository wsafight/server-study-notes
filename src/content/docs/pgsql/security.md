---
title: PostgreSQL 角色、权限与行级安全
description: 使用角色分层、对象所有权、默认权限、search_path 和 RLS 收紧 PostgreSQL 访问边界。
---

数据库安全的目标是让每个工作负载只拥有完成任务所需的能力，并让对象创建、函数解析和租户隔离保持可审计。不要让应用长期使用超级用户或对象所有者连接。

## 分离登录与权限角色

把可登录身份和权限集合分开，便于轮换凭据和复用授权：

```sql
CREATE ROLE app_readonly NOLOGIN;
CREATE ROLE app_readwrite NOLOGIN;
CREATE ROLE orders_service LOGIN PASSWORD 'managed-outside-sql';

GRANT app_readwrite TO orders_service;
GRANT CONNECT ON DATABASE appdb TO app_readwrite;
GRANT USAGE ON SCHEMA app TO app_readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA app TO app_readwrite;
GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA app TO app_readwrite;
```

示例密码不能进入真实迁移脚本或版本库。生产中使用密钥管理、短期凭据或受控认证服务，并验证连接池能正确轮换。

## 管理所有权与默认权限

对象所有者可以修改和删除对象。使用专门的 `NOLOGIN` Owner Role 持有 Schema 和表，迁移身份通过受控方式切换角色；应用身份只获得 DML 权限。

`ALTER DEFAULT PRIVILEGES` 只影响指定创建角色未来创建的对象，不会修改已有对象，也不会自动覆盖其他创建者：

```sql
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_readwrite;
```

迁移后应从系统目录验证实际 Owner、Grantor 和 Grantee，而不是只检查脚本是否执行成功。

## 收紧 Schema 与 search_path

可写 Schema 会影响未限定对象名和函数解析。移除不需要的 `public` 创建权限，为应用设置受控 `search_path`，安全敏感 SQL 和 `SECURITY DEFINER` 函数中使用 Schema 限定名称。

`SECURITY DEFINER` 函数以所有者权限执行，必须固定安全的 `search_path`、限制可执行角色，并避免动态拼接 SQL。否则普通用户可能通过同名对象劫持解析。

## 行级安全

RLS 可以在共享表上按租户或主体限制行：

```sql
ALTER TABLE app.invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON app.invoice
USING (tenant_id = current_setting('app.tenant_id')::bigint)
WITH CHECK (tenant_id = current_setting('app.tenant_id')::bigint);
```

每次从连接池借出连接都必须设置并验证租户上下文，归还时清理状态。表所有者和拥有绕过能力的角色可能不受普通策略约束，测试必须使用真实应用角色。

RLS 是纵深防御，不替代所有查询显式携带租户条件。策略表达式还会参与查询规划，应建立匹配索引并测试典型数据倾斜。

## 网络与审计

通过 `pg_hba.conf` 或云服务访问策略限制来源、数据库、角色和认证方式；跨不可信网络启用并验证 TLS。定期审查长期闲置角色、超级用户、复制权限、绕过 RLS 权限和过宽的 Membership。

记录登录失败、权限变更、DDL 和敏感管理操作，但控制语句与参数中的隐私数据。审计日志需要防篡改存储、访问控制和保留策略。

## 验证清单

为只读、读写、迁移、备份和复制身份分别运行允许与拒绝测试。验证跨 Schema、序列、函数、分区、未来新表和故障切换后的权限，并确认撤销 Membership 后现有连接何时失效。
