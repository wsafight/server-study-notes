import{_ as i,c as n,b as a,o as s}from"./app-Wa3AeqG9.js";const l={};function p(t,e){return s(),n("div",null,e[0]||(e[0]=[a(`<h1 id="解读-uptime-命令和平均负载" tabindex="-1"><a class="header-anchor" href="#解读-uptime-命令和平均负载"><span>解读 uptime 命令和平均负载</span></a></h1><p>如果发现系统运行速度变慢时，通常需要使用 top 或者 uptime 命令。先看一下 uptime 命令。</p><p>在命令行中输入</p><div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre><code><span class="line"><span class="token function">uptime</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>可以得到如下结果</p><div class="language-bash line-numbers-mode" data-highlighter="prismjs" data-ext="sh" data-title="sh"><pre><code><span class="line">08:16:48  up <span class="token number">5</span> min, <span class="token number">1</span> user, load averages: <span class="token number">0.34</span>, <span class="token number">0.49</span>, <span class="token number">0.27</span></span>
<span class="line"></span></code></pre><div class="line-numbers" aria-hidden="true" style="counter-reset:line-number 0;"><div class="line-number"></div></div></div><p>解读一下每一行的含义</p><ul><li>【08:16:48】 这是当前时间</li><li>【up 5 min】 意味着系统运行了 5 分钟</li><li>【1 user】是正在登录的用户数</li><li>【load averages: 0.34, 0.49, 0.27】 这里是过去时间的平均负载，分别是过去 1 分钟、5 分钟、15 分钟的数据。</li></ul><p>前面三个指标都非常好理解。那么平均负载是什么意思呢？</p><p>平均负载是指当前机器的“活跃”进程数。</p><p>简单来说，平均负载是指单位时间内，系统处于可运行状态和不可中断状态的平均进程数，也就是平均活跃进程数。</p><p>通过上面的描述我们看到两个新鲜的词汇。</p><ul><li>可运行状态（正在运行 Running 的进程以及可以进入运行状态 Runnable 的进程）</li><li>不可中断状态（Disk Sleep，正处于操作系统内核关键流程的进程，一般是磁盘处理）</li></ul><p>除了上述对应的两种状态。其实操作系统还有几个状态。</p><ul><li>睡眠状态（对应进程在等待事件完成，也叫做可中断睡眠。一般情况下系统大部分进程都在此状态）</li><li>停止状态 (通过发送 SIGSTOP 信号给进程来停止对应进程。这个被暂停的进程可以通过发送 SIGCONT 信号让进程继续运行。注：对应程序压根没有写对应的信号处理是没有用滴。就像杀死一个进程 kill 命令也只是给对应的程序发送一个信号而已。)</li><li>僵尸状态 (当子进程退出且父进程没有读取到子进程退出的返回代码时，就会产生僵尸进程。会造成内存泄漏)</li><li>死亡状态（只是一个返回状态，不会在任务列表里看到这个状态。当父进程读取子进程的返回结果时，子进程立刻释放资源。死亡状态是非常短暂的，几乎不可能通过 ps 命令捕捉到。）</li></ul><p>简单理解，平均负载代表了平均的活跃进程数。在最理想状态下，就是 CPU 和进程一一对应。这样每一个 CPU 都被充分利用。如果平均负载大于当前 CPU 数量，意味着有一些进程竞争不到 CPU。如果平均负载小于当前 CPU 数量，就意味着有 CPU 在空闲状态。</p><p>uptime 命令给了开发者 3 个数据。开发者可以利用对应的 3 个节点来判断当前系统负载的趋势。</p><p>一般来说：如果平均负载高于了 CPU 数量 70% 的时候就需要分析一下原因了。也就是说。如果当前机器 10 个 CPU。平均负载一直在 17 以上，开发者就需要去分析与调查。但这也不是绝对的。</p><p>那么平均负载和 CPU 使用率是不是一一对应的呢？如果当前系统平均负载很高。是不是 CPU 使用率也很高？答案是不一定。回到平均负载对应进程的 3 个状态。Running，Runnable 以及 Disk Sleep。</p><ul><li><p>如果当前应用是 CPU 密集型应用。CPU 使用率一定很高。</p></li><li><p>如果当前应用是 IO 密集型应用，进程大部分时间都处于 Disk Sleep 状态。这时候 CPU 使用率不一定很高。</p></li><li><p>大量进程在 Runnable 状态时，平均负载很高，CPU 需要进程调度。CPU 使用率也会比较高。</p></li></ul><p>通过 uptime 命令可以分析系统平均活跃进程数的趋势。但要分析具体问题时候，仅仅依靠 uptime 是远远不够的，我们还需要学习其他命令。</p><p>注：以上所有操作均在虚拟机 Ubuntu 22.04 GUI 系统。</p>`,22)]))}const r=i(l,[["render",p],["__file","uptime.html.vue"]]),m=JSON.parse('{"path":"/linux/performance/uptime.html","title":"解读 uptime 命令和平均负载","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1699490588000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":3}]},"filePathRelative":"linux/performance/uptime.md"}');export{r as comp,m as data};