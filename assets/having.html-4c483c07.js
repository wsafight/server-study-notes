import{_ as e,o as n,c as a,d as i}from"./app-3aae6edf.js";const d={},s=i(`<h1 id="使用-having-进行业务统计处理" tabindex="-1"><a class="header-anchor" href="#使用-having-进行业务统计处理" aria-hidden="true">#</a> 使用 having 进行业务统计处理</h1><p>在 SQL 中增加 HAVING 子句原因是，WHERE 关键字无法与合计函数一起使用。</p><p>如：从 table_name 中聚合用户 id，然后分析数据大于 10000 的用户</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>SELECT userId,count(*) AS total
FROM table_name
where get_time &gt; &#39;2024-01-01 00:00:00&#39;
group by userId
having total &gt; 10000
limit 100
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注意索引！</p>`,5),t=[s];function l(r,c){return n(),a("div",null,t)}const v=e(d,[["render",l],["__file","having.html.vue"]]);export{v as default};
