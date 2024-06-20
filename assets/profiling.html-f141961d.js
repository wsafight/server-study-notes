import{_ as e,o as i,c as n,d as s}from"./app-6f934210.js";const l={},r=s(`<h1 id="profiling-分析慢-sql-语句" tabindex="-1"><a class="header-anchor" href="#profiling-分析慢-sql-语句" aria-hidden="true">#</a> profiling 分析慢 sql 语句</h1><p>该方案适合开发调试阶段分析，因为它是针对处理进程(process)而不是线程(thread)的，服务器上的其他应用，可能会影响结果。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>-- 查看是否已经启用 profiling
select @@profiling;

-- 启用 profiling
set profiling = 1;

-- 查询时候使用 sql_no_cache ，强制 SELECT 语句不进行 QCACHE 检测。
select sql_no_cache count(*) from system_user;

-- 查询最近一条语句的执行信息
show profile;

-- 查看在服务器上执行语句的列表
show profiles;

-- 根据上面列表查询不同的 id
show profile for query 6;

-- 获取其他信息
show profile all for query 6;
show profile cpu,block io,memory,swaps,context switches,source for query 6;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>SHOW PROFILE 与 SHOW PROFILES 已被弃用。预计它们会在未来的 MySQL 版本中被删除（MySQL 8.3 文档）。MySQL 推荐使用 Performance Schema 来进行分析。</p><p>MySQL 8.3 之前放心使用。</p>`,5),d=[r];function c(a,o){return i(),n("div",null,d)}const u=e(l,[["render",c],["__file","profiling.html.vue"]]);export{u as default};
