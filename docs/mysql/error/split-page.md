# 分页负数攻击

```MYSQL
select * from user_login_log order by id desc limit -40,20"
```