import{_ as i,r as n,o as d,c as s,a as l,b as e,e as r,w as c,d as t}from"./app-6f934210.js";const v={},m=t(`<h1 id="清理过期数据" tabindex="-1"><a class="header-anchor" href="#清理过期数据" aria-hidden="true">#</a> 清理过期数据</h1><p>通常来说，如果当前表存储的是日志或时效信息。往往涉及到归档并删除过期数据的问题。</p><p>这时候我们需要定时任务删除。例如晚上 2 点多开始任务。</p><h2 id="创建时间有索引" tabindex="-1"><a class="header-anchor" href="#创建时间有索引" aria-hidden="true">#</a> 创建时间有索引</h2><p>如果当前表中的数据有关于时间的索引，直接删除数据即可。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>DELETE FROM table_name
WHERE
  \`create_time\` &lt; date_format(
    date_add(now(), interval -90 DAY),
    &#39;%Y-%m-%d 00:00:00&#39;
  )
LIMIT
  10000;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>以上语句是删除数据表 90 天以前的 10000 条记录。开发者可以酌情修改以上的数字。循环执行语句即可。</p><h2 id="创建时间无索引" tabindex="-1"><a class="header-anchor" href="#创建时间无索引" aria-hidden="true">#</a> 创建时间无索引</h2><p>但如果当前表格中没有 create_time 没有索引。那我们只能根据 id 查询并删除数据了。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>SELECT id, create_time FROM table_name WHERE id &gt; -1 LIMIT 2000;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>然后在内存中过滤 create_time 大于当前数据的数据，并将当前最大的 id 记录下来，以便下次替换 -1 使用。</p><p>然后执行 DELETE 语句。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>DELETE FROM table_name WHERE id in (?)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>循环执行，直到当前查询出语句没有可清楚的数据为止。</p><p>当然，上述方案也有一定问题，如果前两千行的数据均大于 90 天前的数据，或者中间的 2000 行数据出现了 大于 90 天前的数据，但后面又出现了当前数据小于 90 天前的数据。这样的话就无法正常的删除数据了。</p><p>但实际上 id 是自增的，出现这样的数据可能性也比较小。可以忽略不计。</p><p>清除完成后开发者就需要重建表。此时我们 information_schema.TABLES 得到对应库的已经分配但并未使用的数据大小。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>SELECT
  TABLE_NAME,
  DATA_FREE
FROM
  information_schema.TABLES
WHERE
  TABLE_SCHEMA = &#39;lib_name&#39;
  AND DATA_FREE &gt; 104857600
ORDER BY
  DATA_FREE DESC;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,18);function u(o,p){const a=n("RouterLink");return d(),s("div",null,[m,l("p",null,[e("根据当前的表，我们再去执行重建表即可。具体执行可参考 "),r(a,{to:"/mysql/performance/re-building.html"},{default:c(()=>[e("重建表优化空间与查询速度")]),_:1}),e("。")])])}const E=i(v,[["render",u],["__file","clear.html.vue"]]);export{E as default};
