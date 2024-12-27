import{_ as s,c as e,b as a,o as i}from"./app--XYqrjBE.js";const l={};function t(d,n){return i(),e("div",null,n[0]||(n[0]=[a('<h1 id="使用数据库排他锁处理并发问题" tabindex="-1"><a class="header-anchor" href="#使用数据库排他锁处理并发问题"><span>使用数据库排他锁处理并发问题</span></a></h1><p>排他锁又称写锁，如果事务 T 对数据 A 加上排他锁后，则其他事务不能再对 A 加任任何类型的锁。获得排他锁的事务既能读数据，又能修改数据。</p><p>对比以下两个代码操作：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">SELECT `quota` FROM `table_name` WHERE `id` = &#39;xxx&#39;</span>\n<span class="line"></span>\n<span class="line">-- 添加判断 quota &gt;= 10 ，直接返回额度不足</span>\n<span class="line">-- 执行数据操作 newQuota = quota - 10</span>\n<span class="line"></span>\n<span class="line">UPDATE `table_name` SET `quota` = newQuota WHERE `id` = &#39;xxx&#39;</span>\n<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">-- 开启事务</span>\n<span class="line">START TRANSACTION;</span>\n<span class="line"></span>\n<span class="line">SELECT `quota` FROM `table_name` WHERE `id` = &#39;xxx&#39; FOR UPDATE</span>\n<span class="line"></span>\n<span class="line">-- 添加判断 quota &gt;= 10 ，直接返回额度不足</span>\n<span class="line">-- 执行数据操作 newQuota = quota - 10</span>\n<span class="line"></span>\n<span class="line">UPDATE `table_name` SET `quota` = newQuota WHERE `id` = &#39;xxx&#39;</span>\n<span class="line"></span>\n<span class="line">-- 提交事务</span>\n<span class="line">COMMIT;</span>\n<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>如果当前用户量请求较少的情况下，上述两个代码都没有问题。但是如果用户量稍微大一点，第一个代码就会出现异常，由于多个请求同一时间都会获取到相同额度，减少额度后更新都是相同的数据。从而导致实际的额度远远小于数据库额度。</p><p>第二个代码不会出现上述问题，使用了 FOR UPDATE 后其余的 SELECT FOR UPDATE 会等待前一个事务提交后才能获取（普通的 SELECT 查询不会被影响）到对应的数据。</p><p>排他锁有可能使用行级锁（只对该用户锁定），但也有可能会锁表（针对整个业务锁定，业务可能会发生异常）。</p><ul><li>WHERE 条件中明确指定主键/索引，查无记录，无锁</li><li>WHERE 条件中明确指定主键/索引，查有记录，行锁</li><li>WHERE 条件中无主键/索引，表锁</li><li>WHERE 条件中主键/索引不明确(如使用 &lt;&gt; 获取 LIKE)，表锁</li></ul><p>大家注意，有时候，即使开发者加了索引，也不一定最终查询语句就能用上索引，因为 InnoDB 要不要使用索引，该使用哪个索引是优化器决定的，它是根据成本（代价）预估来选择的，它会倾向于选择一个成本最低的方式进行查询。</p><p>也就是说在某些特殊情况下（如表数据较少）， InnoDB 有可能走全表扫描，此时 SELECT FOR UPDATE 查询条件中虽然携带了索引，但仍会锁表。开发者需要使用强制索引（FORCE INDEX）。通过这，大家也差不多能看出来，行锁其实是通过索引记录来进行数据锁定的。</p><p>注：当前也可以使用乐观锁（注意业务）和分布式锁来处理，但不要使用对应编程语言或操作系统的锁机制处理，因为对应处理只会对单机系统有效。</p>',12)]))}const p=s(l,[["render",t],["__file","exclusive-lock.html.vue"]]),r=JSON.parse('{"path":"/mysql/notes/exclusive-lock.html","title":"使用数据库排他锁处理并发问题","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1702269121000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":2}]},"filePathRelative":"mysql/notes/exclusive-lock.md"}');export{p as comp,r as data};
