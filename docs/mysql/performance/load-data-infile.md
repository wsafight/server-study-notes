# 插入导入数据优化

LOAD DATA 语句以非常高的速度将文本文件中的行读取到表中。该文件可以从服务器主机或客户端主机读取，具体取决于是否 LOCAL 给出修饰符。LOCAL 还影响数据解释和错误处理。

```SQL
LOAD DATA
    [LOW_PRIORITY | CONCURRENT] [LOCAL]
    INFILE 'file_name'
    [REPLACE | IGNORE]
    INTO TABLE tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [CHARACTER SET charset_name]
    [{FIELDS | COLUMNS}
        [TERMINATED BY 'string']
        [[OPTIONALLY] ENCLOSED BY 'char']
        [ESCAPED BY 'char']
    ]
    [LINES
        [STARTING BY 'string']
        [TERMINATED BY 'string']
    ]
    [IGNORE number {LINES | ROWS}]
    [(col_name_or_user_var
        [, col_name_or_user_var] ...)]
    [SET col_name={expr | DEFAULT}
        [, col_name={expr | DEFAULT}] ...]
```


如果指定 local 关键词，则表明从客户主机读区文件，否者文件必须在服务器上。

```SQL
LOAD DATA INFILE 'data.txt' INTO TABLE db2.my_table;
```