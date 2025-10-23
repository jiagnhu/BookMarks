# 简单插入用户（MySQL）

关闭注册功能后，手动插入一个用户的最简流程如下。

步骤 1：生成密码哈希（bcrypt，12 轮）

```bash
cd server
node -e "console.log(require('bcryptjs').hashSync('Taich@2022', 12))"  
得到 - $2a$12$e6BxRRLSToTnovS/Nrj7WeozweNeowEgUdJKerUs3JEcKuq96nuW2
``|

步骤 2：执行插入 SQL（按当前 Prisma 模型）

```sql
INSERT INTO `User` (username, passwordHash, email, phone, avatar, userType, createdAt, updatedAt, linksJsonA, linksJsonB)
VALUES ('admin', '$2a$12$e6BxRRLSToTnovS/Nrj7WeozweNeowEgUdJKerUs3JEcKuq96nuW2', NULL, NULL, NULL, 'normal', NOW(), NOW(), NULL, NULL);
```
