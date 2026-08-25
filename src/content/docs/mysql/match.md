---
title: 使用 MATCH AGAINST 进行全文检索
description: 介绍 MySQL 全文索引的创建、检索模式、中文分词和使用限制。
---

`MATCH ... AGAINST` 基于 `FULLTEXT` 索引执行全文检索，比在长文本上使用 `LIKE '%keyword%'` 更适合关键词搜索。

## 创建全文索引

```sql
CREATE TABLE articles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  PRIMARY KEY (id),
  FULLTEXT KEY ft_title_body (title, body)
) ENGINE = InnoDB;
```

自然语言模式会计算相关度：

```sql
SELECT
  id,
  title,
  MATCH(title, body) AGAINST('database index') AS score
FROM articles
WHERE MATCH(title, body) AGAINST('database index')
ORDER BY score DESC
LIMIT 20;
```

布尔模式支持必须包含、排除和前缀匹配等操作：

```sql
SELECT id, title
FROM articles
WHERE MATCH(title, body)
      AGAINST('+mysql +index -oracle' IN BOOLEAN MODE);
```

## 中文检索

中文文本通常需要使用 MySQL 的 `ngram` 全文解析器，并根据业务调整 token 大小和停用词配置：

```sql
CREATE FULLTEXT INDEX ft_title_body
ON articles (title, body) WITH PARSER ngram;
```

全文索引受最小/最大词长、停用词和分词方式影响，修改相关配置后通常需要重建索引。对于复杂的多语言检索、同义词、拼写纠错和高亮需求，应评估专用搜索引擎。
