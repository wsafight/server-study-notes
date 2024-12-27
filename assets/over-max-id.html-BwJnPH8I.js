import{_ as e,c as t,b as a,o as l}from"./app--XYqrjBE.js";const o={};function r(n,i){return l(),t("div",null,i[0]||(i[0]=[a('<h1 id="处理自增-id-超过最大值" tabindex="-1"><a class="header-anchor" href="#处理自增-id-超过最大值"><span>处理自增 id 超过最大值</span></a></h1><p>数据表主键 int 类型的最大值是 2147483647。也就是说表的数据量大于 21 亿就会出现插入不了的情况。此时数据表再插入就会报错了。我们当然需要在此之前尽快处理问题。</p><p>较快但是对用户有影响的方案</p><ul><li>提取发布功能不可用公告或者找一个较少使用量的时间</li><li>根据当前表建立新表</li><li>把之前的表改成其他名字</li><li>把新的表改为之前表的名字（让数据可以流入）</li><li>把之前表的 id 改为 bigInt</li><li>重新命名两张表，并且将新表的数据传回旧表</li></ul>',4)]))}const d=e(o,[["render",r],["__file","over-max-id.html.vue"]]),m=JSON.parse('{"path":"/mysql/notes/over-max-id.html","title":"处理自增 id 超过最大值","lang":"zh-CN","frontmatter":{},"headers":[],"git":{"updatedTime":1691424102000,"contributors":[{"name":"wsafight","email":"984292420@qq.com","commits":1}]},"filePathRelative":"mysql/notes/over-max-id.md"}');export{d as comp,m as data};
