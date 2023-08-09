# 存储过程

存储过程是一组为了完成特定功能的 SQL 语句集合。使用存储过程的目的是将常用或复杂的工作预先用 SQL 语句写好并用一个指定名称存储起来，这个过程经编译和优化后存储在数据库服务器中，因此称为存储过程。当以后需要数据库提供与已定义好的存储过程的功能相同的服务时，只需调用 “CALL 存储过程名字” 即可自动完成。

在单机时代，存储过程被大量使用，但在互联网时代，存储过程已经“过时”了。

阿里巴巴的 Java 开发手册明确禁止使用存储过程，因为存储过程难以调试和扩展，同时也没有移植性。

任何技术都要分场景的。对于开发者来说，分表场景下就可以使用存储过程来更新表结构。

例如一下存储语句会更新库中 100 张表。

```SQL
-- 如果在 db_name 库中存在存储过程 procedure_name,直接删除
DROP PROCEDURE IF EXISTS `db_name`.`procedure_name`;

-- DEFINER 为谁有权利执行？
CREATE DEFINER=`useUser`@`%` PROCEDURE `procedure_name`()
BEGIN
    -- 定义 tableName 变量
	DECLARE `@tableName` VARCHAR(50);
    -- 定义 sqlStr 变量
    DECLARE `@sqlStr` VARCHAR(2560);

    -- 定义 i 变量
    DECLARE i int;

    -- 设置 i 为 0
    set i = 0;
    while i < 100 do
        -- 设置表名
        SET `@tableName` = CONCAT("tabel_name_", i);

        -- 拼接修改语句
        SET @sqlStr = CONCAT("ALTER TABLE ", `@tableName` ," ADD COLUMN `col_name` INT(2) NULL COMMENT '注释',ALGORITHM=INPLACE, LOCK=NONE;");
        -- 预处理，避免 sql 注入
        PREPARE stmt FROM @sqlStr;
        -- 执行修改语句
        EXECUTE stmt;

        set i = i + 1;
    END WHILE;
END;
```

直接使用 CALL 即可：

```SQL
CALL procedure_name()
```