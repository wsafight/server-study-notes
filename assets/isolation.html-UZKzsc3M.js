import{_ as i,c as l,b as a,o as s}from"./app--XYqrjBE.js";const n={};function t(p,e){return s(),l("div",null,e[0]||(e[0]=[a(`<h1 id="sql-事务隔离级别" tabindex="-1"><a class="header-anchor" href="#sql-事务隔离级别"><span>SQL 事务隔离级别</span></a></h1><p>SQL-92 标准中定义了 4 种事务隔离级别，由低到高分别是：</p><ul><li>未提交读(Read uncommitted)</li><li>提交读(Read committed)</li><li>可重复读(Repeatable reads)</li><li>串行化(Serializable)</li></ul><p>不同的事务隔离级别可以让开发者权衡性能与问题（脏读，幻读，不可重复读）的权重。以便开发者根据不同的业务指定不同的隔离级别。</p><p>脏读是指当前事务获取了其他事务还没有提交（可能会发生回滚）的数据。那么当前事务基于这条数据所做的操作可能就有问题。即：读到其他事务没有提交的数据。</p><p>不可重复读是指在一个事务内多次读取同一条数据却返回了不同的结果，这是由于在多次读取的过程中另一个事务操作了这一条数据。即：事务在两次读取数据的过程中有其他事务对数据进行了修改（update,delete）。导致两次读取数据的结果不同。</p><p>幻读是指一个事务在进行范围查询的过程中。其他事务写入(delete,insert，update)了符合当前事务的查询条件的数据。当前事务没有感知继续执行操作，但是用户会发现对应范围内的数据没有被全部处理，就像发生了幻觉一样。一般解决的方法是增加范围锁，锁定检测范围为只读。</p><p>根据上述问题和隔离级别，可以排一下问题的严重性：</p><p>脏读 &gt; 不可重复读 &gt; 幻读</p><ul><li>未提交读(Read uncommitted) 啥都没解决，但并发非常好</li><li>提交读(Read committed) 不会出现脏读（大型互联网企业用的级别）</li><li>可重复读(Repeatable reads) 不会出现脏读和不可重复读（MySQL 默认级别）</li><li>串行化(Serializable) 啥都解决了</li></ul><p>既然有脏读，那么就应该会有脏写（一个事务修改另外一个未提交事务修改的数据），那么为什么 SQL-92 标准中并没有指出脏写现象呢？这是因为脏写现象对于一致性的影响太严重了，必须要解决这个问题，所以无论哪一个隔离级别都不允许脏写的情况发生。</p><p>查看隔离级别的语法如下：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">--  查看系统变量</span>
<span class="line">SHOW VARIABLES LIKE &#39;transaction_isolation&#39;</span>
<span class="line"></span>
<span class="line">SHOW @@transaction_isolation;</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>注： transaction_isolation 是 MySQL 5.7.20 版本引入的，再此之前的版本使用的变量是 tx_isolation。</p><p>设置隔离级别的语法如下：</p><div class="language-SQL line-numbers-mode" data-highlighter="prismjs" data-ext="SQL" data-title="SQL"><pre><code><span class="line">-- 全局设置</span>
<span class="line">SET GLOBAL TRANSACTION ISOLATION LEVEL level</span>
<span class="line"></span>
<span class="line">-- 会话设置</span>
<span class="line">SET SESSION TRANSACTION ISOLATION LEVEL level</span>
<span class="line"></span>
<span class="line">-- 仅适用于下一个开启的事务</span>
<span class="line">SET TRANSACTION ISOLATION LEVEL level</span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div><div class="line-number"></div></div></div><p>其中 level 有 4 个可选值：</p><ul><li>READ UNCOMMITTED</li><li>READ COMMITTED</li><li>REPEATABLE READ</li><li>SERIALIZABLE</li></ul>`,18)]))}const r=i(n,[["render",t],["__file","isolation.html.vue"]]),c=JSON.parse('{"path":"/mysql/performance/isolation.html","title":"SQL 事务隔离级别","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1735277348000,"contributors":[{"name":"jump-and-jump","email":"984292420@qq.com","commits":1}]},"filePathRelative":"mysql/performance/isolation.md"}');export{r as comp,c as data};
