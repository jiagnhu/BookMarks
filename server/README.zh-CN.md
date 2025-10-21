# 书签后台服务（Express + Prisma + MySQL)

为 BookMarks 前端提供后端 API：鉴权、页面（A/B）、书签、皮肤、外观设置与上传配额等。

## 快速开始

1) 复制环境变量文件

```bash
cp .env.example .env
# 编辑 .env，设置 DATABASE_URL（MySQL 连接串）、JWT_SECRET、PORT（可选）
```

2) 安装依赖

```bash
npm i
```

3) 生成 Prisma 客户端并执行迁移

```bash
npm run prisma:generate
npm run prisma:migrate
```

4) 启动开发服务

```bash
npm run dev
```

- 默认监听 `http://localhost:${PORT || 4000}`
- API 前缀：`/api/v1`

## 常用脚本

- `npm run dev` — 开发模式（热重载）
- `npm run build` — 编译 TypeScript 到 `dist/`
- `npm start` — 运行编译后的产物
- `npm run prisma:generate` — 生成 Prisma Client
- `npm run prisma:migrate` — 开发数据库迁移
- `npm run prisma:deploy` — 生产环境应用迁移

## 环境变量

- `DATABASE_URL` — MySQL 连接串，例如：`mysql://user:pass@localhost:3306/bookmarks`
- `PORT` — 服务端口（默认 4000）
- `JWT_SECRET` — JWT 签名密钥

## 数据模型（Prisma）

- `User` — 用户
- `Page (A|B)` — 每个用户的 A/B 页面（标题、座右铭、B 页独立密码）
- `Bookmark` — 每页的书签（有序）
- `Skin` — 预设/自定义皮肤与当前选择
- `UserSettings` — 外观设置
- `Quota` — 皮肤上传配额与用量

详情见 `prisma/schema.prisma`。

## 鉴权

- 注册：`POST /api/v1/auth/register`
  - body: `{ username, password }`
  - 201 → `{ token, user }`
- 登录：`POST /api/v1/auth/login`
  - body: `{ username, password }`
  - 200 → `{ token, user }`
- 当前用户：`GET /api/v1/auth/me`（需 Bearer Token）

请求头：`Authorization: Bearer <token>`

## 页面（A/B）

- `GET /api/v1/pages` → 列出 A/B 基本信息
- `GET /api/v1/pages/:code` → 获取单页信息（`A` 或 `B`）
- `PUT /api/v1/pages/:code` → 更新 `{ title?, motto? }`
- `POST /api/v1/pages/B/password` → 设置/清空 B 页密码 `{ password? }`
- `POST /api/v1/pages/B/verify` → 校验 `{ password }` → `{ ok }`

## 书签

- `GET /api/v1/pages/:code/bookmarks`
- `PUT /api/v1/pages/:code/bookmarks` → 批量保存 `{ items:[{ id?, order, name, url }] }`
- `POST /api/v1/pages/:code/bookmarks`
- `PATCH /api/v1/bookmarks/:id`
- `DELETE /api/v1/bookmarks/:id`

## 皮肤

- `GET /api/v1/skins/preset` → 预设皮肤列表
- `GET /api/v1/skins/custom`（鉴权）→ 用户自定义皮肤列表
- `POST /api/v1/skins/current`（鉴权）→ 设为当前皮肤
- `GET /api/v1/skins/current`（鉴权）→ 获取当前皮肤

## 外观设置

- `GET /api/v1/settings`
- `PUT /api/v1/settings`

## 配额

- `GET /api/v1/quotas/skin-upload`

## 版本信息

- `GET /api/v1/meta/version`

## 说明

- 默认不自动种子用户。请先通过 `/auth/register` 注册；创建成功后会自动初始化该用户的 A/B 页面、默认外观设置与上传配额。
- 自定义皮肤上传（multipart + 对象存储）后续可扩展，目前仅提供预设清单与当前皮肤设置接口。
- 错误返回格式：`{ error: string }`；错误会记录到服务端日志。

