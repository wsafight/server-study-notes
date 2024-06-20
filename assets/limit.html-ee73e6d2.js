import{_ as a,r as l,o as t,c as d,a as e,b as n,e as s,d as r}from"./app-6f934210.js";const o={},c=e("h1",{id:"优化深度分页",tabindex:"-1"},[e("a",{class:"header-anchor",href:"#优化深度分页","aria-hidden":"true"},"#"),n(" 优化深度分页")],-1),u={href:"https://segmentfault.com/a/1190000022549636",target:"_blank",rel:"noopener noreferrer"},m=e("p",null,"深度查询的问题在于开发者使用 limit 10000,10 时候，是先查询 10010 条记录后抛弃前 10000 条数据，结果最终返回给用户。",-1),_=e("p",null,"如果能在体验上提升查询功能，优先提升查询功能。让用户无需深度查询。",-1),v=e("p",null,"如果可以使用其他技术，则使用 ES 来处理查询。",-1),p={href:"https://segmentfault.com/a/1190000022549636",target:"_blank",rel:"noopener noreferrer"},h=r(`<p>上述条件都走不通的情况下，《高性能的 MYSQL》介绍了一种优化方法：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>SELECT id, desc FROM book ORDER BY title LIMIT 50, 5
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div><p>优化为</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>SELECT id, desc FROM book
  INNER JOIN (
    SELECT id FROM book
    ORDER BY
      title
    limit
      50, 5
  ) AS lim USING (id)
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>这种方法被称为“延迟连接”，它允许服务器再不访问行的情况下检查索引中尽可能少的数据（覆盖索引）。一旦找到所需的行，则让他们与整个表联接，从当前行再进行检索。</p><p>同时，代码中写分页查询逻辑时，若 count 为 0 应直接返回，避免执行后面的分页语句。</p>`,6);function b(f,S){const i=l("ExternalLinkIcon");return t(),d("div",null,[c,e("p",null,[n("如果目前是移动端的话，建议使用 "),e("a",u,[n("移动端列表查询最佳实践"),s(i)]),n("。")]),m,_,v,e("p",null,[n("如果依次查询下一页或在 PC 端也采取下拉加载的方式。通过记住上一次的查询条件，也可以大大优化查询。可以参考 "),e("a",p,[n("移动端列表查询最佳实践"),s(i)]),n("。同时也要考虑在前端使用虚拟列表以避免卡顿。")]),h])}const L=a(o,[["render",b],["__file","limit.html.vue"]]);export{L as default};
