import{_ as a,c as s,b as n,o as t}from"./app-Wa3AeqG9.js";const r={};function l(i,e){return t(),s("div",null,e[0]||(e[0]=[n(`<h1 id="sum-函数-npe-问题" tabindex="-1"><a class="header-anchor" href="#sum-函数-npe-问题"><span>SUM 函数 NPE 问题</span></a></h1><p>当某一列的值全是NULL时，count(col)的返回结果是 0，但是 sum(col) 的返回结果为 NULL。因此使用sum()时需注意NPE问题。可以用以下语法来解决问题：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">SELECT IFNULL(SUM(col),0) FROM table;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div>`,3)]))}const c=a(r,[["render",l],["__file","sum-npe.html.vue"]]),o=JSON.parse('{"path":"/mysql/error/sum-npe.html","title":"SUM 函数 NPE 问题","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1717043518000,"contributors":[{"name":"jump-and-jump","email":"984292420@qq.com","commits":1}]},"filePathRelative":"mysql/error/sum-npe.md"}');export{c as comp,o as data};