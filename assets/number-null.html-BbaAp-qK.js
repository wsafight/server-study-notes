import{_ as s,c as e,b as l,o as a}from"./app--XYqrjBE.js";const i={};function t(d,n){return a(),e("div",null,n[0]||(n[0]=[l(`<h1 id="整数减去-null-得到是-null" tabindex="-1"><a class="header-anchor" href="#整数减去-null-得到是-null"><span>整数减去 null 得到是 null</span></a></h1><div class="language-MYSQL line-numbers-mode" data-highlighter="prismjs" data-ext="MYSQL" data-title="MYSQL"><pre><code><span class="line">select</span>
<span class="line">	id,</span>
<span class="line">	total,</span>
<span class="line">	used,</span>
<span class="line">	(total - used) as have</span>
<span class="line">from test_table;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>使用 ifnull 函数处理</p><div class="language-MYSQL line-numbers-mode" data-highlighter="prismjs" data-ext="MYSQL" data-title="MYSQL"><pre><code><span class="line">select</span>
<span class="line">	id,</span>
<span class="line">	ifnull(total,0) as total,</span>
<span class="line">	ifnull(used,0) as used,</span>
<span class="line">	(ifnull(total,0) - ifnull(used,0)) as have</span>
<span class="line">from test_table;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,4)]))}const c=s(i,[["render",t],["__file","number-null.html.vue"]]),u=JSON.parse('{"path":"/mysql/error/number-null.html","title":"整数减去 null 得到是 null","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1691424102000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":1}]},"filePathRelative":"mysql/error/number-null.md"}');export{c as comp,u as data};
