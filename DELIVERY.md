# BookMarks 交付文档（基于实际代码）

本文档紧贴仓库当前实现，描述真实存在的交互、功能、接口、部署方式。

- 前端：原生 HTML/CSS/JS + PWA（Service Worker）
  - 关键文件：`index.html`, `styles.css`, `api.js`, `js/*.js`, `sw.js`
- 后端：Node.js + Express + Prisma（MySQL）
  - 关键文件：`server/src/**/*.ts`, `server/prisma/schema.prisma`, `server/prisma/seed.ts`
- 运行要求：Node v20.19.5；MySQL 8+；现代浏览器（支持 Service Worker）

## 1. 产品概述（真实功能）

- A/B 页面切换：通过 `?page=A|B` 或界面按钮切换两套链接位。
- 顶部文案可编辑：页面标题与副标题可在前端直接编辑并保存（登录后保存到个人页）。
- 链接位编辑：共 20 个位置，支持名称与 URL 编辑（无标签/搜索/分组）。
- B 页独立密码：B 页可设置访问密码并在进入时校验。
- 皮肤/壁纸：
  - 预设 3 张壁纸（前端内置）。
  - 登录用户可上传或选择自定义皮肤，受上传配额限制。
- 外观设置：看板透明度、卡片透明度、暗角强度、展示区宽度、对比度开关。
- 登录/注册/修改密码：登录后显示头像占位并开启用户专属数据读写。
- PWA：核心静态资源离线缓存；支持“立即更新”刷新到最新版本。

## 2. 前端结构与交互

- 页面骨架：`index.html`
  - 顶部：品牌标题、副标题（均可编辑）、登录/头像、设置按钮。
  - 主体：左右两列链接卡片（最多 20 项）。
  - 右侧抽屉：设置面板（外观、皮肤、账户等）。
  - 底部：A/B 切换。
- 主要前端模块：
  - `js/main.js`：入口初始化与模块装配。
  - `js/headers.js`：标题/副标题的内联编辑与保存。
  - `js/links.js`：链接位的读取与保存（游客/用户两套来源）。
  - `js/ab.js`：A/B 切换与历史记录管理。
  - `js/bpass.js`：B 页密码设置与校验弹窗。
  - `js/skin.js`：预设皮肤渲染、自定义皮肤上传/选择、配额提示。
  - `js/appearance.js`：外观滑块与对比度等设置应用与保存。
  - `js/auth.js`：登录、注册、修改密码、登录态检测。
  - `js/drawer.js`：右侧设置抽屉交互。
  - `js/serviceWorker.js` / `sw.js`：PWA 注册与缓存策略。
  - `api.js`：统一的 API 客户端封装为 `window.BMApi`。

说明：
- 未登录（游客）模式读取公共页面与公共书签；
- 登录后读取/保存用户专属页面与书签；
- 预设皮肤在前端写死 3 项，自定义皮肤需登录且计入配额。

## 3. 后端接口（按路由文件整理）

以下路径均带前缀 `/api/v1`（前端在 `index.html` 通过 `window.API_BASE` 配置为 `http://localhost:4000/api/v1`）。

- 认证 `server/src/routes/auth.ts`
  - POST `/auth/register` { username, password } → { token, user }
  - POST `/auth/login` { username, password } → { token, user }
  - GET `/auth/me` → { id, username, avatar }
  - POST `/auth/change-password` { oldPassword, newPassword } → 204

- 页面与标题 `server/src/routes/pages.ts`
  - GET `/pages/public/:code` → 公共 A/B 页信息（标题、副标题等）
  - GET `/pages/:code`（登录）→ 用户 A/B 页信息
  - PUT `/pages/:code`（登录）{ title?, motto? } → 204
  - POST `/pages/B/verify` { password } → { ok: boolean }
  - POST `/pages/B/password`（登录）{ password } → 204

- 书签/链接 `server/src/routes/bookmarks.ts`, `server/src/routes/links.ts`
  - GET `/public/pages/:code/bookmarks` → 公共 A/B 页书签列表（字段：id, order, name, url）
  - GET `/pages/:code/bookmarks`（登录）→ 用户 A/B 页书签列表
  - PUT `/pages/:code/bookmarks`（登录）{ items: [{ name, url, order? }, ...] } → 204（整体覆盖保存）
  - POST `/pages/:code/bookmarks`（登录）{ name, url, order? } → 201 { id, order, name, url }
  - PATCH `/bookmarks/:id`（登录）{ name?, url?, order? } → 更新后的对象
  - DELETE `/bookmarks/:id`（登录）→ 204
  - GET `/links?page=A|B`（登录）→ 返回简化的 20 项数组形式
  - PUT `/links?page=A|B`（登录）→ 体为数组 `[{ name, url }, ...]`，整体保存 → 204

- 外观设置 `server/src/routes/settings.ts`
  - GET `/settings/public` → { boardAlpha, cardAlpha, vignette, showcaseWidth, contrast, skinUrl }
  - GET `/settings`（登录）→ { boardAlpha, cardAlpha, vignette, showcaseWidth, contrast }
  - PUT `/settings`（登录）→ 同上字段，204

- 皮肤/壁纸 `server/src/routes/skins.ts`
  - GET `/skins/public/current` → 公共当前皮肤
  - GET `/skins/current`（登录） → 用户当前皮肤
  - POST `/skins/current`（登录）{ url } → 新增/设置自定义皮肤（计入配额）
  - PUT `/skins/current`（登录）{ type:'preset', url } | { type:'custom', id } → 标记当前（不计配额）
  - GET `/skins/custom`（登录）→ 自定义皮肤清单
  - GET `/skins/preset` → 预设清单（如启用）；当前前端预设写死，不依赖该接口

- 配额 `server/src/routes/quotas.ts`
  - GET `/quotas/skin-upload`（登录）→ { used, quota, left }

- 元信息 `server/src/routes/meta.ts`
  - GET `/meta/version` → { version, buildAt }

说明：所有“登录”标注的接口需要 `Authorization: Bearer <token>`；游客仅可访问公共接口。

## 4. 数据与种子（`server/prisma/seed.ts`）

- 初始化公共设置：透明度、暗角、展示区宽度、默认皮肤 URL。
- 为公共 A/B 页面填充 20 个链接位，前 6 个写入示例链接，其余留空（名称为“链接 N”）。
- 用户注册时自动创建：个人 A/B 页面、用户设置、皮肤上传配额（依用户类型）。

## 5. PWA 与离线策略（`sw.js` / `js/serviceWorker.js`）

- 预缓存：`index.html`, `styles.css`, `api.js`, `js/*.js`, 以及 `/images/p1.jpeg|p2.jpeg|p3.jpeg`。
- 策略：
  - HTML：Network-First，失败回退缓存的 `index.html`；
  - JS/CSS：Network-First，失败回退缓存；
  - 图片/字体：Stale-While-Revalidate；
  - API（同源且 GET）：Network-First，失败回退缓存。
- 更新：前端可向 SW 发送 `postMessage('SKIP_WAITING')` 立即切换到新版本。

## 6. 部署与运行

- 前端静态资源
  - 部署 `index.html`, `styles.css`, `api.js`, `js/`, `images/`, `sw.js`, `favicon.ico` 至站点根目录。
  - 确保 `sw.js` 位于站点根（与注册路径一致），MIME 为 JS。
  - 如前后端不同域名：在 `index.html` 设置 `window.API_BASE`；后端开启 CORS；Service Worker 作用域以前端域为准。

- 后端服务
  - 配置环境变量：`server/.env` 示例包含 `DATABASE_URL`, `PORT`, `JWT_SECRET`。
  - 安装依赖（在 `server/`）：`npm ci`
  - 数据库迁移：`npx prisma migrate deploy`
  - 数据初始化（可选）：`node server/prisma/seed.ts`
  - 启动（按脚本）：`npm run start`
  - 反向代理：将 `/api/v1/` 转发到后端服务，保持路径前缀。

## 7. 验收清单

- A/B 切换与 B 页密码流程正常；
- 标题/副标题编辑与保存（游客/用户数据来源符合预期）；
- 20 个链接位的增删改保存正常（游客公共与用户私有分离）；
- 皮肤：预设可用；登录后自定义皮肤上传/选择与配额提示正确；
- 外观设置：各滑块/开关生效并可读写（游客读公共设置，登录读个人设置）；
- 离线：首次访问后断网仍可打开页面与静态资源；恢复网络可更新到最新版本。

## 8. 安全与限制

- 仅登录态可写入用户数据与读取用户私有数据；游客仅能读公共数据。
- 自定义皮肤上传受配额限制，建议生产中限制文件大小与类型。
- 当前版本不包含：搜索、标签、分组/分类等能力。

## 9. 交付清单

- 源码（本仓库）。
- 环境变量样例：`server/.env`。
- 迁移与种子：`server/prisma/migrations/*`, `server/prisma/seed.ts`。
- 本文档：`DELIVERY.md`。

如需根据实际部署域名或鉴权策略调整 `window.API_BASE` 与接口示例，请提供信息，我将同步更新本文件。
