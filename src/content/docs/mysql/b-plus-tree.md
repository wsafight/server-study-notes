---
title: 实现 B+ 树
---

我们都知道，InnoDB 引擎使用了 B+ 树作为索引。而数据在不断插和删除的过程会变化高度。那么 B+ 树在层级变化时候为什么不会出现性能呢问题？

先说结论，按照主键自增的情况。B+ 树层级变化只会影响上层索引和对应叶子结点的数据。而 B+ 树索引的上层是常驻内存的，所以不会出现性能问题。当前分析不会涉及 MySQL 源码。

我们可以先看一下对应示例的 [B+tree visualization](https://visual-algo.firebaseapp.com/),通过不断模拟增加减少，我们就可以看出修改的结点数据。

![B+ +tree visualization](./B+treevisualization.png)

代码实现在 [b-plus-tree](https://github.com/wsafight/b-plus-tree) 中，完成后会进行源码解读。




