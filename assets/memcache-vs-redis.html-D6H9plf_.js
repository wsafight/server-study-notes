import{_ as a,c as s,b as c,o as d}from"./app-Wa3AeqG9.js";const i={};function h(t,e){return d(),s("div",null,e[0]||(e[0]=[c('<h1 id="为什么要选择-redis" tabindex="-1"><a class="header-anchor" href="#为什么要选择-redis"><span>为什么要选择 Redis</span></a></h1><h2 id="redis-vs-memcached" tabindex="-1"><a class="header-anchor" href="#redis-vs-memcached"><span>Redis VS Memcached</span></a></h2><p>既然都是内存数据库，为什么要用 Redis，而不是 Memcached 呢？</p><h2 id="复杂数据类型" tabindex="-1"><a class="header-anchor" href="#复杂数据类型"><span>复杂数据类型</span></a></h2><p>Memcached 只支持字符串，也就是说它的 value 值只能是字符串。在面对一些复杂需求的时候，会增加业务代码的复杂度。</p><p>举个简单的例子，你要存储一个集合类型，比如说存个 Hash 结构，你就要把它先序列化成一个 JSON 或是别的字符串结构，才能存进去。然后在修改 Hash 里面的一个值的时候，就要把整个集合读到 Java 服务里边，反序列化之后才能完成修改。在修改完成之后，还要序列化整个集合，再通过网络 IO 写回到 Memcached 里面。这样的话，整个集合在网络上就走了一遍，在目标集合比较大的场景中，如果只修改里面的一个元素，网络 IO 基本都在传输那些没变的数据，有效负载很低。</p><p>而 Redis 就不一样了，Redis 天生就支持 Set、Hash、ZSet、List 这些结构，要修改 Hash 集合中的一个值的话，只需要传输目标值就可以了。要用到这些复杂结构的话，那基本上就可以把 Memcached 淘汰了。</p><h2 id="对持久化的支持。" tabindex="-1"><a class="header-anchor" href="#对持久化的支持。"><span>对持久化的支持。</span></a></h2><p>Memcached 本身不支持持久化，也就是说进程退出的时候，Memcached 里面存储的数据就全没了。而 Redis 本身则支持多种持久化方式。这样看来，如果需要数据持久存储，那 Memcached 也就被淘汰了。</p><h2 id="线程模型的设计。" tabindex="-1"><a class="header-anchor" href="#线程模型的设计。"><span>线程模型的设计。</span></a></h2><p>Memcached 是多线程的，在多核机器上，Memcached 会比 Redis 的性能好一点，尤其是在碰到大 Key 的时候，因为大 Key 直接会把 Redis 的单线程堵死。但是 Redis 的单线程能帮我们实现一些原子操作，这个在很多场景下是很有用的。</p><p>因此，这个就需要根据业务场景进行选择了，如果有原子操作的需求，可以优先考虑 Redis。</p><h2 id="是否支持集群。" tabindex="-1"><a class="header-anchor" href="#是否支持集群。"><span>是否支持集群。</span></a></h2><p>Memcached 采用了伪分布式的方案，服务端各实例之间是不通信的，Memcached 是依赖客户端对 Key 进行一致性哈希，然后请求到 Memcached 集群的单台实例上。在出现故障的时候，Memcached 本身不做处理，没有自动故障转移的能力，需要我们自己进行二次开发来提高 Memcached 的高可用。</p><p>Redis 天生就支持了很多种分布式的模式，例如，前面提到的主从模式、Sentinel 模式还有 Redis Cluster，而且 Sentinel 模式和 Redis Cluster 模式都有自动故障转移的能力。</p><p>这样看来，在集群以及高可用方面，Redis 又胜 Memcached 一筹。</p>',16)]))}const l=a(i,[["render",h],["__file","memcache-vs-redis.html.vue"]]),r=JSON.parse('{"path":"/redis/notes/memcache-vs-redis.html","title":"为什么要选择 Redis","lang":"zh-CN","frontmatter":{},"headers":[{"level":2,"title":"Redis VS Memcached","slug":"redis-vs-memcached","link":"#redis-vs-memcached","children":[]},{"level":2,"title":"复杂数据类型","slug":"复杂数据类型","link":"#复杂数据类型","children":[]},{"level":2,"title":"对持久化的支持。","slug":"对持久化的支持。","link":"#对持久化的支持。","children":[]},{"level":2,"title":"线程模型的设计。","slug":"线程模型的设计。","link":"#线程模型的设计。","children":[]},{"level":2,"title":"是否支持集群。","slug":"是否支持集群。","link":"#是否支持集群。","children":[]}],"git":{"updatedTime":1699405135000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":1}]},"filePathRelative":"redis/notes/memcache-vs-redis.md"}');export{l as comp,r as data};