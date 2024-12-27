import{_ as s,c as e,b as a,o as t}from"./app--XYqrjBE.js";const d={};function i(l,n){return t(),e("div",null,n[0]||(n[0]=[a(`<h1 id="公用表表达式-cte" tabindex="-1"><a class="header-anchor" href="#公用表表达式-cte"><span>公用表表达式 CTE</span></a></h1><p>在 MySQL 8.0 后版本后可以使用公用表表达式 CTE（Common Table Expressions）。通过 CTE 可以多次引用以及自引用。比子查询更加强大。</p><p>对应的语法如下所示：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WITH [RECURSIVE]</span>
<span class="line">    cte_name [(col_name [, col_name] ...)] AS (subQuery)</span>
<span class="line">    [, cte_name [(col_name [, col_name] ...)] AS (subQuery)]</span>
<span class="line">    ...</span>
<span class="line">SELECT  * FROM cte_name</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>写一下对应的查询语句测试看看：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WITH hero (name, age) AS   -- 命名表和列名</span>
<span class="line">(</span>
<span class="line">  SELECT &#39;白牛&#39;, 20</span>
<span class="line">  UNION ALL</span>
<span class="line">  SELECT &#39;隐刺&#39;, 20</span>
<span class="line">)</span>
<span class="line">SELECT name, age FROM hero</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>数据如下所示：</p><table><thead><tr><th>name</th><th>age</th></tr></thead><tbody><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr></tbody></table><p>可以多次引用</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WITH hero (name, age) AS   -- 命名表和列名</span>
<span class="line">(</span>
<span class="line">  SELECT &#39;白牛&#39;, 20</span>
<span class="line">  UNION ALL</span>
<span class="line">  SELECT &#39;隐刺&#39;, 20</span>
<span class="line">)</span>
<span class="line">SELECT name, age FROM hero -- 第一次使用</span>
<span class="line">  UNION ALL </span>
<span class="line">SELECT name, age FROM hero -- 第二次使用</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>数据如下所示：</p><table><thead><tr><th>name</th><th>age</th></tr></thead><tbody><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr><tr><td>白牛</td><td>20</td></tr><tr><td>隐刺</td><td>20</td></tr></tbody></table><p>CTE 还可以递归调用，下面使用递归生成多条数据：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WITH RECURSIVE num as ( -- 使用 RECURSIVE 声明可以递归调用</span>
<span class="line">	SELECT 1 AS count</span>
<span class="line">	UNION ALL</span>
<span class="line">	SELECT count + 1 FROM num -- 这里引用了自身</span>
<span class="line">		WHERE count &lt; 2  -- 当 count 大于 1 就结束</span>
<span class="line">)</span>
<span class="line">SELECT * FROM num</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><table><thead><tr><th>count</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table><p>如此，开发者就可以使用 CTE 递归调用表获取部门等树形结构了（注：全部获取在业务中处理更好，兼容更强）。</p><p>部门表结构如下所示：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">CREATE TABLE \`departments\` (</span>
<span class="line">  \`id\` int unsigned NOT NULL AUTO_INCREMENT,</span>
<span class="line">  \`parent_id\` int NOT NULL,</span>
<span class="line">  \`name\` varchar(255) NOT NULL,</span>
<span class="line">  \`path\` varchar(255) DEFAULT NULL,</span>
<span class="line">  PRIMARY KEY (\`id\`)</span>
<span class="line">) ENGINE = InnoDB AUTO_INCREMENT = 6 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>表数据如下所示</p><table><thead><tr><th>id</th><th>parent_id</th><th>name</th><th>path</th></tr></thead><tbody><tr><td>1</td><td>0</td><td>销售组</td><td></td></tr><tr><td>2</td><td>1</td><td>销售 1 组</td><td>1</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td><td>1,2</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td><td>1</td></tr><tr><td>5</td><td>0</td><td>采购组</td><td></td></tr></tbody></table><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WITH RECURSIVE department_tmp ( id, parent_id, \`name\` ) AS (</span>
<span class="line">	SELECT</span>
<span class="line">		id,</span>
<span class="line">		parent_id,</span>
<span class="line">		\`name\`</span>
<span class="line">	FROM</span>
<span class="line">		departments</span>
<span class="line">	WHERE</span>
<span class="line">     -- 下面开始递归查找所有数据</span>
<span class="line">		parent_id = 0 UNION ALL</span>
<span class="line">	SELECT</span>
<span class="line">		a.id,</span>
<span class="line">		a.parent_id,</span>
<span class="line">		a.\`name\`</span>
<span class="line">	FROM</span>
<span class="line">		departments a</span>
<span class="line">         -- 找到 parent_id 和 id 的对应</span>
<span class="line">		JOIN department_tmp b ON a.parent_id = b.id</span>
<span class="line">	)</span>
<span class="line">SELECT</span>
<span class="line">	*</span>
<span class="line">FROM</span>
<span class="line">	department_tmp</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>返回的结果如下所示:</p><table><thead><tr><th>id</th><th>parent_id</th><th>name</th></tr></thead><tbody><tr><td>1</td><td>0</td><td>销售组</td></tr><tr><td>5</td><td>0</td><td>采购组</td></tr><tr><td>2</td><td>1</td><td>销售 1 组</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td></tr></tbody></table><p>如果改为只获取销售组的数据，可以将</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">WHERE parent_id = 0</span>
<span class="line">-- 改为</span>
<span class="line">WHERE parent_id = 1</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><table><thead><tr><th>id</th><th>parent_id</th><th>name</th></tr></thead><tbody><tr><td>2</td><td>1</td><td>销售 1 组</td></tr><tr><td>4</td><td>1</td><td>销售 2 组</td></tr><tr><td>3</td><td>2</td><td>销售 1 小组</td></tr></tbody></table><p>对应的<a href="https://dev.mysql.com/doc/refman/8.2/en/with.html" target="_blank" rel="noopener noreferrer">官方文档 CTE</a> .</p>`,27)]))}const p=s(d,[["render",i],["__file","cte.html.vue"]]),c=JSON.parse('{"path":"/mysql/notes/cte.html","title":"公用表表达式 CTE","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1700669695000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":3}]},"filePathRelative":"mysql/notes/cte.md"}');export{p as comp,c as data};
