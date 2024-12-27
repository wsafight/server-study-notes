import{_ as n,c as e,b as i,o as l}from"./app--XYqrjBE.js";const a={};function r(p,s){return l(),e("div",null,s[0]||(s[0]=[i(`<h1 id="profiling-分析慢-sql-语句" tabindex="-1"><a class="header-anchor" href="#profiling-分析慢-sql-语句"><span>profiling 分析慢 sql 语句</span></a></h1><p>该方案适合开发调试阶段分析，因为它是针对处理进程(process)而不是线程(thread)的，服务器上的其他应用，可能会影响结果。</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">-- 查看是否已经启用 profiling</span>
<span class="line">select @@profiling;</span>
<span class="line"></span>
<span class="line">-- 启用 profiling</span>
<span class="line">set profiling = 1;</span>
<span class="line"></span>
<span class="line">-- 查询时候使用 sql_no_cache ，强制 SELECT 语句不进行 QCACHE 检测。</span>
<span class="line">select sql_no_cache count(*) from system_user;</span>
<span class="line"></span>
<span class="line">-- 查询最近一条语句的执行信息</span>
<span class="line">show profile;</span>
<span class="line"></span>
<span class="line">-- 查看在服务器上执行语句的列表</span>
<span class="line">show profiles;</span>
<span class="line"></span>
<span class="line">-- 根据上面列表查询不同的 id</span>
<span class="line">show profile for query 6;</span>
<span class="line"></span>
<span class="line">-- 获取其他信息</span>
<span class="line">show profile all for query 6;</span>
<span class="line">show profile cpu,block io,memory,swaps,context switches,source for query 6;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>SHOW PROFILE 与 SHOW PROFILES 已被弃用。预计它们会在未来的 MySQL 版本中被删除（MySQL 8.3 文档）。MySQL 推荐使用 Performance Schema 来进行分析。</p><p>MySQL 8.3 之前放心使用。</p>`,5)]))}const d=n(a,[["render",r],["__file","profiling.html.vue"]]),o=JSON.parse('{"path":"/mysql/performance/profiling.html","title":"profiling 分析慢 sql 语句","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1711504899000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":2}]},"filePathRelative":"mysql/performance/profiling.md"}');export{d as comp,o as data};
