import{_ as n,r as i,o as a,c as r,a as t,b as d,e as s,d as l}from"./app-6f934210.js";const v={},c=l(`<h1 id="公用表表达式-cte" tabindex="-1"><a class="header-anchor" href="#公用表表达式-cte" aria-hidden="true">#</a> 公用表表达式 CTE</h1><p>在 MySQL 8.0 后版本后可以使用公用表表达式 CTE（Common Table Expressions）。通过 CTE 可以多次引用以及自引用。比子查询更加强大。</p><p>对应的语法如下所示：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WITH [RECURSIVE]
    cte_name [(col_name [, col_name] ...)] AS (subQuery)
    [, cte_name [(col_name [, col_name] ...)] AS (subQuery)]
    ...
SELECT  * FROM cte_name
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>写一下对应的查询语句测试看看：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WITH hero (name, age) AS   -- 命名表和列名
(
  SELECT &#39;白牛&#39;, 20
  UNION ALL
  SELECT &#39;隐刺&#39;, 20
)
SELECT name, age FROM hero
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>数据如下所示：</p><table><thead><tr><th>name</th><th>age</th></tr></thead><tbody><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr></tbody></table><p>可以多次引用</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WITH hero (name, age) AS   -- 命名表和列名
(
  SELECT &#39;白牛&#39;, 20
  UNION ALL
  SELECT &#39;隐刺&#39;, 20
)
SELECT name, age FROM hero -- 第一次使用
  UNION ALL 
SELECT name, age FROM hero -- 第二次使用
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>数据如下所示：</p><table><thead><tr><th>name</th><th>age</th></tr></thead><tbody><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr></tbody></table><p>CTE 还可以递归调用，下面使用递归生成多条数据：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WITH RECURSIVE num as ( -- 使用 RECURSIVE 声明可以递归调用
	SELECT 1 AS count
	UNION ALL
	SELECT count + 1 FROM num -- 这里引用了自身
		WHERE count &lt; 2  -- 当 count 大于 1 就结束
)
SELECT * FROM num
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><table><thead><tr><th>count</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table><p>如此，开发者就可以使用 CTE 递归调用表获取部门等树形结构了（注：全部获取在业务中处理更好，兼容更强）。</p><p>部门表结构如下所示：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>CREATE TABLE \`departments\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`parent_id\` int NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`path\` varchar(255) DEFAULT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>表数据如下所示</p><table><thead><tr><th>id</th><th>parent_id</th><th>name</th><th>path</th></tr></thead><tbody><tr><td>1</td><td>0</td><td>销售组</td><td></td></tr><tr><td>2</td><td>1</td><td>销售 1 组</td><td>1</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td><td>1,2</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td><td>1</td></tr><tr><td>5</td><td>0</td><td>采购组</td><td></td></tr></tbody></table><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WITH RECURSIVE department_tmp ( id, parent_id, \`name\` ) AS (
	SELECT
		id,
		parent_id,
		\`name\`
	FROM
		departments
	WHERE
     -- 下面开始递归查找所有数据
		parent_id = 0 UNION ALL
	SELECT
		a.id,
		a.parent_id,
		a.\`name\`
	FROM
		departments a
         -- 找到 parent_id 和 id 的对应
		JOIN department_tmp b ON a.parent_id = b.id
	)
SELECT
	*
FROM
	department_tmp
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>返回的结果如下所示:</p><table><thead><tr><th>id</th><th>parent_id</th><th>name</th></tr></thead><tbody><tr><td>1</td><td>0</td><td>销售组</td></tr><tr><td>5</td><td>0</td><td>采购组</td></tr><tr><td>2</td><td>1</td><td>销售 1 组</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td></tr></tbody></table><p>如果改为只获取销售组的数据，可以将</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>WHERE parent_id = 0
-- 改为
WHERE parent_id = 1
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><table><thead><tr><th>id</th><th>parent_id</th><th>name</th></tr></thead><tbody><tr><td>2</td><td>1</td><td>销售 1 组</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td></tr></tbody></table>`,26),m={href:"https://dev.mysql.com/doc/refman/8.2/en/with.html",target:"_blank",rel:"noopener noreferrer"};function u(b,o){const e=i("ExternalLinkIcon");return a(),r("div",null,[c,t("p",null,[d("对应的"),t("a",m,[d("官方文档 CTE"),s(e)]),d(" .")])])}const p=n(v,[["render",u],["__file","cte.html.vue"]]);export{p as default};
