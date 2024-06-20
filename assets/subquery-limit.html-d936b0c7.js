import{_ as e,o as i,c as n,d as s}from"./app-6f934210.js";const d={},l=s(`<h1 id="mysql-子查询中不能使用-limit" tabindex="-1"><a class="header-anchor" href="#mysql-子查询中不能使用-limit" aria-hidden="true">#</a> MYSQL 子查询中不能使用 LIMIT</h1><p>查询语句如下:</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>select
  *
from
  test
where
  code_ver IN (
    select DISTINCT
      code_ver
    from
      test
    where
      code_ver NOT LIKE &#39;%DevBld%&#39;
    ORDER by
      date DESC
    LIMIT
      10
  );
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>此时，MYSQL 会报错，需要在子查询的外面再包一层就可以了。即：</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>select
  *
from
  test
where
  code_ver IN (
    select
      *
    from
      (
        select DISTINCT
          code_ver
        from
          test
        where
          code_ver NOT LIKE &#39;%DevBld%&#39;
        ORDER by
          date DESC
        LIMIT
          10
      ) as t1
  );
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div>`,5),v=[l];function r(a,c){return i(),n("div",null,v)}const u=e(d,[["render",r],["__file","subquery-limit.html.vue"]]);export{u as default};
