# OfferFlow - 个人求职工作流助手

> 一款帮助求职者系统化管理整个求职流程的工具。由浏览器插件、Web 求职工作台组成，用户可以在浏览岗位页面时一键保存岗位，并追踪投递进度。

## 产品简介

求职时，岗位信息分散在不同平台，投递进度容易记乱。OfferFlow 帮助你：

- **一键保存岗位** - 浏览招聘网站时，通过浏览器插件直接保存岗位信息
- **JD 快照留存** - 自动保存职位描述，即使岗位下架也能随时回看
- **投递进度追踪** - 7 种状态覆盖求职全流程：待投递 → 已投递 → 笔试 → 面试 → Offer
- **备注与复盘** - 为每个岗位添加笔记，沉淀面试经验

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| Web 前端 | Next.js 14 + React 18 + TypeScript |
| 样式 | Tailwind CSS 3.4 |
| 数据库 | PostgreSQL + Prisma ORM 5.x |
| 浏览器插件 | Chrome Extension Manifest V3（原生 JS/TS） |
| 部署 | Vercel（前端） + Supabase / Neon（数据库，免费实例） |

## 项目结构

```
offerflow/
├── prisma/
│   └── schema.prisma          # 数据库模型定义（Job 模型）
├── extension/                  # Chrome 浏览器插件
│   ├── manifest.json          # Manifest V3 配置
│   ├── popup.html             # 弹出窗口 UI
│   ├── popup.js               # 弹出窗口逻辑
│   ├── content.js             # 内容脚本（岗位信息提取）
│   ├── background.js          # Service Worker（API 通信）
│   └── icons/                  # 插件图标
├── src/
│   ├── app/
│   │   ├── layout.tsx         # 根布局
│   │   ├── page.tsx           # 首页（重定向到 /jobs）
│   │   ├── globals.css        # 全局样式
│   │   ├── api/
│   │   │   └── jobs/
│   │   │       ├── route.ts   # GET 列表 + POST 创建
│   │   │       └── [id]/
│   │   │           └── route.ts # GET 详情 + PUT 更新 + DELETE 删除
│   │   └── jobs/
│   │       ├── page.tsx        # 求职看板（核心页面）
│   │       ├── [id]/
│   │       │   └── page.tsx    # 岗位详情页
│   │       └── new/
│   │           └── page.tsx    # 手动添加岗位
│   ├── lib/
│   │   ├── prisma.ts          # Prisma 客户端单例
│   │   └── utils.ts           # 工具函数
│   └── types/
│       └── job.ts             # TypeScript 类型定义
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── .env.example
└── .gitignore
```

## 环境要求

- **Node.js** >= 18.0
- **PostgreSQL** >= 14.0（或使用 Supabase / Neon 免费云数据库）
- **npm** >= 9.0（或 pnpm / yarn）
- **Chrome 浏览器** >= 100（用于安装插件）

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd offerflow
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置数据库

**方案 A：使用本地 PostgreSQL**

```bash
# 创建数据库
createdb offerflow

# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的数据库连接字符串
# DATABASE_URL="postgresql://your_user:your_password@localhost:5432/offerflow?schema=public"
```

**方案 B：使用 Supabase 免费云数据库（推荐新手）**

1. 访问 [supabase.com](https://supabase.com) 注册并创建项目
2. 在 Settings > Database 中找到 Connection String
3. 复制到 `.env` 文件的 `DATABASE_URL`

**方案 C：使用 Neon 免费云数据库**

1. 访问 [neon.tech](https://neon.tech) 注册并创建项目
2. 复制提供的 Connection String 到 `.env`

### 4. 初始化数据库

```bash
# 同步 Prisma schema 到数据库（开发环境推荐）
npx prisma db push

# 或者使用 migration（生产环境推荐）
npx prisma migrate dev --name init
```

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 即可使用 Web 求职工作台。

### 6. 安装浏览器插件

1. 打开 Chrome，地址栏输入 `chrome://extensions/`
2. 右上角开启 **开发者模式**
3. 点击 **加载已解压的扩展程序**
4. 选择项目的 `extension/` 目录
5. 浏览任意招聘网站，点击工具栏的 OfferFlow 图标即可保存岗位

> 插件默认连接 `http://localhost:3000`，如需修改可在插件弹窗底部的设置区域更改 API 地址。

## 功能说明

### Web 求职工作台

#### 求职看板（/jobs）

- **状态筛选**：支持按 7 种状态筛选岗位（全部 / 待投递 / 已投递 / 笔试 / 面试 / Offer / 已拒绝 / 已归档）
- **岗位卡片**：每个卡片展示公司名、岗位名、地点、薪资、来源、状态标签和创建时间
- **快捷操作**：点击卡片进入详情页，查看完整信息

#### 岗位详情页（/jobs/[id]）

- **状态管理**：一键切换岗位状态（7 个状态按钮）
- **JD 快照**：可折叠的职位描述展示区，即使原岗位已下架也能查看
- **备注编辑**：实时编辑并保存备注信息
- **来源链接**：一键跳转原始招聘页面
- **删除操作**：二次确认防误删

#### 手动添加岗位（/jobs/new）

- 支持手动填写公司名称、岗位名称、工作地点、薪资、职位描述、来源链接
- 公司名称和岗位名称为必填项

### Chrome 浏览器插件

#### 岗位信息提取

插件使用多层策略从招聘页面提取岗位信息：

1. **CSS 选择器匹配** - 覆盖主流招聘平台的常见 class name
2. **JSON-LD 结构化数据** - 从 `<script type="application/ld+json">` 提取 `JobPosting` 类型数据
3. **Meta 标签 fallback** - 从 `document.title`、`meta[description]`、`og:` 标签提取
4. **DOM 内容启发式** - 查找 `.job-description`、`.detail-content`、`main` 等大文本块

#### 插件设置

- 可自定义 API 地址（默认 `http://localhost:3000`）
- 设置保存在 `chrome.storage.local`，安装时自动初始化

## API 接口

所有接口返回统一 JSON 格式：

```json
{ "success": true, "data": { ... } }
// 或
{ "success": false, "error": "错误信息" }
```

### GET /api/jobs

获取岗位列表。

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 按状态筛选，不传则返回全部 |
| sortBy | string | 排序字段，支持 status / createdAt / updatedAt / company / title，默认 createdAt |
| sortOrder | string | asc 或 desc，默认 desc |

### POST /api/jobs

创建新岗位。

**请求体：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 是 | 岗位名称 |
| company | string | 是 | 公司名称 |
| location | string | 否 | 工作地点 |
| salary | string | 否 | 薪资范围 |
| url | string | 否 | 来源链接 |
| source | string | 否 | 来源平台（如 BOSS直聘、拉勾等） |
| jdSnapshot | string | 否 | 职位描述快照 |
| notes | string | 否 | 用户备注 |
| status | string | 否 | 初始状态，默认 saved |

### GET /api/jobs/:id

获取单个岗位详情。

### PUT /api/jobs/:id

更新岗位信息。

**请求体（支持部分更新）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 新状态 |
| notes | string | 备注 |
| location | string | 工作地点 |
| salary | string | 薪资 |

### DELETE /api/jobs/:id

删除岗位。

## 数据库模型

```prisma
model Job {
  id          String   @id @default(cuid())
  title       String                       // 岗位名称
  company     String                       // 公司名称
  location    String?                       // 工作地点
  salary      String?                       // 薪资范围
  url         String?                       // 来源链接
  status      String   @default("saved")    // 状态
  source      String?                       // 来源平台
  jdSnapshot  String?  @db.Text             // JD 快照
  notes       String?  @db.Text             // 用户备注
  createdAt   DateTime @default(now())       // 创建时间
  updatedAt   DateTime @updatedAt            // 更新时间
}
```

**状态枚举值：**

| 状态值 | 中文标签 | 说明 |
|--------|---------|------|
| saved | 待投递 | 已保存但未投递 |
| applied | 已投递 | 已提交简历/申请 |
| written_test | 笔试 | 收到笔试通知 |
| interview | 面试 | 收到面试通知 |
| offer | Offer | 收到录用通知 |
| rejected | 已拒绝 | 未通过 |
| archived | 已归档 | 手动归档 |

## 常用开发命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 数据库相关
npx prisma db push          # 同步 schema 到数据库（开发用）
npx prisma migrate dev      # 创建并应用 migration
npx prisma migrate deploy   # 应用 migration（生产用）
npx prisma generate         # 生成 Prisma Client
npx prisma studio           # 打开数据库可视化管理界面

# 查看数据库
npx prisma studio
```

## 部署指南

### Vercel 部署（Web 应用）

1. 将项目推送到 GitHub
2. 登录 [vercel.com](https://vercel.com)
3. 导入 GitHub 仓库
4. 在 Vercel 项目设置中添加环境变量 `DATABASE_URL`
5. 部署

> Vercel 免费计划支持自定义域名、HTTPS、自动 CI/CD，100 用户量级完全够用。

### Supabase 部署（数据库）

1. 在 [supabase.com](https://supabase.com) 创建项目
2. 在 SQL Editor 中运行 `npx prisma migrate deploy` 生成的 SQL
3. 或使用 Supabase 的 Connection String + `npx prisma db push`

## MVP 路线图

### 已完成（v0.1.0 MVP）

- [x] 岗位一键保存（浏览器插件）
- [x] 岗位信息自动提取（多层 fallback 策略）
- [x] JD 快照保存
- [x] 投递状态管理（7 种状态）
- [x] Web 求职看板（筛选 + 列表）
- [x] 岗位详情页（状态切换 + JD 折叠 + 备注编辑）
- [x] 手动添加岗位
- [x] RESTful API

### 计划中（v0.2.0）

- [ ] 用户认证与多用户隔离
- [ ] 岗位准备建议（基于 JD 关键词匹配）
- [ ] 笔试/面试日程提醒
- [ ] 求职复盘记录（结构化）

### 远期规划（v1.0+）

- [ ] 移动端 App + 推送提醒
- [ ] AI 深度分析（基于面试复盘提炼薄弱环节）
- [ ] 求职数据看板（投递转化率、通过率统计）
- [ ] 多平台自动导入（邮箱、就业系统）

## 常见问题

### Q: 插件无法提取某些招聘网站的岗位信息怎么办？

A: 插件使用通用提取策略，无法适配所有招聘网站。如果自动提取失败，可以手动填写信息。后续版本会逐步增加对主流平台（BOSS直聘、拉勾、牛客等）的专门适配。

### Q: 插件保存岗位时提示"无法连接到 API"？

A: 请检查：
1. Web 服务是否已启动（`npm run dev`）
2. 插件设置中的 API 地址是否正确（默认 `http://localhost:3000`）
3. 如果使用远程部署，确保 API 地址为 `https://` 且后端已配置 CORS

### Q: 数据库连接失败？

A: 请检查：
1. `.env` 文件中的 `DATABASE_URL` 是否正确
2. PostgreSQL 服务是否已启动
3. 如果使用云数据库，确认连接字符串中的密码和主机地址

### Q: 如何重置数据库？

A: 运行 `npx prisma migrate reset` 将清空所有数据并重新创建表结构。

## License

MIT
