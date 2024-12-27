import{_ as s,c as a,b as e,o as i}from"./app--XYqrjBE.js";const l={};function d(r,n){return i(),a("div",null,n[0]||(n[0]=[e(`<h1 id="插入导入数据优化" tabindex="-1"><a class="header-anchor" href="#插入导入数据优化"><span>插入导入数据优化</span></a></h1><p>LOAD DATA 语句以非常高的速度将文本文件中的行读取到表中。该文件可以从服务器主机或客户端主机读取，具体取决于是否 LOCAL 给出修饰符。LOCAL 还影响数据解释和错误处理。</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">LOAD DATA</span>
<span class="line">    [LOW_PRIORITY | CONCURRENT] [LOCAL]</span>
<span class="line">    INFILE &#39;file_name&#39;</span>
<span class="line">    [REPLACE | IGNORE]</span>
<span class="line">    INTO TABLE tbl_name</span>
<span class="line">    [PARTITION (partition_name [, partition_name] ...)]</span>
<span class="line">    [CHARACTER SET charset_name]</span>
<span class="line">    [{FIELDS | COLUMNS}</span>
<span class="line">        [TERMINATED BY &#39;string&#39;]</span>
<span class="line">        [[OPTIONALLY] ENCLOSED BY &#39;char&#39;]</span>
<span class="line">        [ESCAPED BY &#39;char&#39;]</span>
<span class="line">    ]</span>
<span class="line">    [LINES</span>
<span class="line">        [STARTING BY &#39;string&#39;]</span>
<span class="line">        [TERMINATED BY &#39;string&#39;]</span>
<span class="line">    ]</span>
<span class="line">    [IGNORE number {LINES | ROWS}]</span>
<span class="line">    [(col_name_or_user_var</span>
<span class="line">        [, col_name_or_user_var] ...)]</span>
<span class="line">    [SET col_name={expr | DEFAULT}</span>
<span class="line">        [, col_name={expr | DEFAULT}] ...]</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果指定 local 关键词，则表明从客户主机读区文件，否者文件必须在服务器上。</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">LOAD DATA INFILE &#39;data.txt&#39; INTO TABLE db2.my_table;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div>`,5)]))}const p=s(l,[["render",d],["__file","load-data-infile.html.vue"]]),t=JSON.parse('{"path":"/mysql/performance/load-data-infile.html","title":"插入导入数据优化","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1711470462000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":1}]},"filePathRelative":"mysql/performance/load-data-infile.md"}');export{p as comp,t as data};
