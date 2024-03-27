import{_ as e,o as n,c as i,d as a}from"./app-3aae6edf.js";const d={},s=a(`<h1 id="插入导入数据优化" tabindex="-1"><a class="header-anchor" href="#插入导入数据优化" aria-hidden="true">#</a> 插入导入数据优化</h1><p>LOAD DATA 语句以非常高的速度将文本文件中的行读取到表中。该文件可以从服务器主机或客户端主机读取，具体取决于是否 LOCAL 给出修饰符。LOCAL 还影响数据解释和错误处理。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>LOAD DATA
    [LOW_PRIORITY | CONCURRENT] [LOCAL]
    INFILE &#39;file_name&#39;
    [REPLACE | IGNORE]
    INTO TABLE tbl_name
    [PARTITION (partition_name [, partition_name] ...)]
    [CHARACTER SET charset_name]
    [{FIELDS | COLUMNS}
        [TERMINATED BY &#39;string&#39;]
        [[OPTIONALLY] ENCLOSED BY &#39;char&#39;]
        [ESCAPED BY &#39;char&#39;]
    ]
    [LINES
        [STARTING BY &#39;string&#39;]
        [TERMINATED BY &#39;string&#39;]
    ]
    [IGNORE number {LINES | ROWS}]
    [(col_name_or_user_var
        [, col_name_or_user_var] ...)]
    [SET col_name={expr | DEFAULT}
        [, col_name={expr | DEFAULT}] ...]
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果指定 local 关键词，则表明从客户主机读区文件，否者文件必须在服务器上。</p><div class="language-SQL line-numbers-mode" data-ext="SQL"><pre class="language-SQL"><code>LOAD DATA INFILE &#39;data.txt&#39; INTO TABLE db2.my_table;
</code></pre><div class="line-numbers" aria-hidden="true"><div class="line-number"></div></div></div>`,5),l=[s];function r(c,v){return n(),i("div",null,l)}const t=e(d,[["render",r],["__file","load-data-infile.html.vue"]]);export{t as default};
