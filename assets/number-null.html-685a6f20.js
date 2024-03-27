import{_ as e,o as l,c as n,d as i}from"./app-3aae6edf.js";const s={},a=i(`<h1 id="整数减去-null-得到是-null" tabindex="-1"><a class="header-anchor" href="#整数减去-null-得到是-null" aria-hidden="true">#</a> 整数减去 null 得到是 null</h1><div class="language-MYSQL line-numbers-mode" data-ext="MYSQL"><pre class="language-MYSQL"><code>select
	id,
	total,
	used,
	(total - used) as have
from test_table;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>使用 ifnull 函数处理</p><div class="language-MYSQL line-numbers-mode" data-ext="MYSQL"><pre class="language-MYSQL"><code>select
	id,
	ifnull(total,0) as total,
	ifnull(used,0) as used,
	(ifnull(total,0) - ifnull(used,0)) as have
from test_table;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,4),d=[a];function t(u,r){return l(),n("div",null,d)}const v=e(s,[["render",t],["__file","number-null.html.vue"]]);export{v as default};
