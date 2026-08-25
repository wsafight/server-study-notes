---
title: MySQL 存储过程的使用边界
description: 介绍存储过程的事务封装、权限、错误处理和版本维护成本。
---

存储过程把一组 SQL 保存在数据库中，并通过 `CALL` 执行。它可以减少多次客户端往返，并让靠近数据的事务逻辑由数据库统一执行，但会增加部署、调试、权限和跨数据库迁移成本。

## 事务示例

下面的过程在两个账户间转移额度，并在任何 SQL 异常时回滚：

```sql
DELIMITER //

CREATE PROCEDURE transfer_quota(
  IN p_from_id BIGINT UNSIGNED,
  IN p_to_id BIGINT UNSIGNED,
  IN p_amount DECIMAL(18, 2)
)
SQL SECURITY INVOKER
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'amount must be positive';
  END IF;

  START TRANSACTION;

  UPDATE accounts
  SET quota = quota - p_amount
  WHERE id = p_from_id
    AND quota >= p_amount;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'insufficient quota';
  END IF;

  UPDATE accounts
  SET quota = quota + p_amount
  WHERE id = p_to_id;

  IF ROW_COUNT() = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'target account not found';
  END IF;

  COMMIT;
END//

DELIMITER ;
```

调用方式：

```sql
CALL transfer_quota(1001, 1002, 10.00);
```

调用方仍需处理死锁或连接中断，并根据业务幂等键决定是否重试。

## 适合与不适合的场景

适合：

- 边界明确、数据密集且需要一个本地事务完成的操作。
- 多个客户端必须共享同一段数据库逻辑。
- 运维团队具备存储程序的版本、测试和观测能力。

不适合：

- 经常变化、依赖外部服务或需要复杂领域测试的业务逻辑。
- 需要同时支持多种数据库的应用。
- 批量执行大量 DDL。DDL 会隐式提交，不能依靠一个存储过程原子回滚所有表结构变更。

避免硬编码个人账号的 `DEFINER`。根据权限模型选择 `SQL SECURITY INVOKER` 或受控的定义者账号，并把过程定义纳入和应用代码相同的迁移、评审与回滚流程。
