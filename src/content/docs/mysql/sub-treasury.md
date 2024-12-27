---
title: 分库
---

按照功能进行分库。常见的分成6大库：

- 用户类库：用于保存了用户的相关信息。例如：db_user,db_system,db_company等。
- 业务类库：用于保存主要业务的信息。比如主要业务是笑话，用这个库保存笑话业务。例如：db_joke,db_temp_joke等。
- 内存类库：主要用Mysql的内存引擎。前台的数据从内存库中查找，速度快。例如：heap。
- 图片类库：主要保存图片的索引以及关联。例如：db_img_index，db_img_res。
- 日志类库：记录点击,刷新,登录等日志信息。例如：db_log_click,db_log_fresh,db_log_login。
- 统计类库：对业务的统计，比如点击量,刷新量等等。例如db_stat。

如果是像外卖等全国性业务，我们可以在每一个城市做相同结构的库,可以使用城市名称为后缀。比如db_log_click_bj,db_log_click_tj,db_log_click_sh。
分表