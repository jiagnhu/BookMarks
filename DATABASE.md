# 数据库结构（简版）

数据库：MySQL（Prisma 管理）

- 连接：`DATABASE_URL`（见 `server/.env`）
- Schema 文件：`server/prisma/schema.prisma`

以下根据当前 schema 列出模型（表）、字段与类型。类型以 Prisma 为准（括号内为 MySQL 映射）。

## User （用户）
- id: Int (PK, autoincrement)
- username: String (@unique, VarChar(64))
- passwordHash: String (VarChar(255))
- email: String? (@unique, VarChar(128), 可空)
- phone: String? (@unique, VarChar(32), 可空)
- avatar: String? (VarChar(1), 可空)
- userType: UserType (enum: normal/typeD/typeC/typeB/typeA; 默认 normal)
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)
- linksJsonA: Json? (可空)
- linksJsonB: Json? (可空)

关系：
- pages: Page[]
- skins: Skin[]
- settings: UserSettings?
- quota: Quota?

## Page （A、B页面配置）
- id: Int (PK, autoincrement)
- userId: Int (FK -> User.id)
- code: PageCode (enum: A/B)
- title: String? (VarChar(128), 可空)
- motto: String? (VarChar(255), 可空)
- bPasswordHash: String? (VarChar(255), 可空)
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

索引/约束：
- @@unique([userId, code])

关系：
- user -> User
- bookmarks: Bookmark[]

## Bookmark （弃用）
- id: Int (PK, autoincrement)
- pageId: Int (FK -> Page.id)
- orderIndex: Int
- name: String (VarChar(128))
- url: String (VarChar(512))
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

索引：
- @@index([pageId, orderIndex])

关系：
- page -> Page

## Skin （自定义皮肤）
- id: Int (PK, autoincrement)
- userId: Int (FK -> User.id)
- type: SkinType (enum: preset/custom)
- label: String? (VarChar(64), 可空)
- url: String (LongText)
- isCurrent: Boolean (默认 false)
- createdAt: DateTime (默认 now())

索引：
- @@index([userId, isCurrent])

关系：
- user -> User

## UserSettings（用户外观设置）
- id: Int (PK, autoincrement)
- userId: Int (@unique, FK -> User.id)
- boardAlpha: Int (默认 55)
- cardAlpha: Int (默认 55)
- vignette: Int (默认 25)
- headerMask: Int (默认 25)
- showcaseWidth: Int (默认 28)
- contrast: Boolean (默认 false)
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

关系：
- user -> User

## Quota （配额）
- id: Int (PK, autoincrement)
- userId: Int (@unique, FK -> User.id)
- skinUploadUsed: Int (默认 0)
- skinUploadQuota: Int (默认 3)
- updatedAt: DateTime (@updatedAt)

关系：
- user -> User

## PublicSettings（游客默认配置）
- id: Int (PK, autoincrement)
- boardAlpha: Int (默认 55)
- cardAlpha: Int (默认 55)
- vignette: Int (默认 25)
- headerMask: Int (默认 25)
- showcaseWidth: Int (默认 28)
- contrast: Boolean (默认 false)
- skinUrl: String (VarChar(512))
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

## PublicPage（游客页面）
- id: Int (PK, autoincrement)
- code: PageCode (enum: A/B)
- title: String? (VarChar(128), 可空)
- motto: String? (VarChar(255), 可空)
- bPasswordHash: String? (VarChar(255), 可空)
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

约束：
- @@unique([code])

关系：
- bookmarks: PublicBookmark[]

## PublicBookmark（游客书签）
- id: Int (PK, autoincrement)
- pageId: Int (FK -> PublicPage.id)
- orderIndex: Int
- name: String (VarChar(128))
- url: String (VarChar(512))
- createdAt: DateTime (默认 now())
- updatedAt: DateTime (@updatedAt)

索引：
- @@index([pageId, orderIndex])

关系：
- page -> PublicPage

---

辅助信息：
- 枚举 UserType：normal, typeD, typeC, typeB, typeA
- 枚举 PageCode：A, B
- 枚举 SkinType：preset, custom

注意：生产库的变更通过 Prisma 迁移执行；字段含 `?` 表示允许为 NULL。

