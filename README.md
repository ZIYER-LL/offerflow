# OfferFlow

> **从浏览岗位到推进 Offer 的个人求职工作流助手**

**TRAE AI 创造力大赛全国复赛 350 强｜约前 1.2%**

OfferFlow 由 **Chrome 浏览器插件**与 **Web 求职工作台**组成，帮助求职者将分散在招聘平台、企业官网和 ATS 系统中的岗位信息快速沉淀到统一工作台，并持续管理投递、笔试、面试、复盘和求职数据。

本项目在 **TRAE WORK** 协同开发环境中完成需求拆解、产品设计、跨端开发、问题定位与持续迭代。

---

## 在线体验

| 入口 | 地址 |
| --- | --- |
| Web 工作台 | [https://offerflow-six.vercel.app](https://offerflow-six.vercel.app) |
| GitHub 仓库 | [https://github.com/ZIYER-LL/offerflow](https://github.com/ZIYER-LL/offerflow) |
| 浏览器插件 | 克隆仓库后通过 Chrome 开发者模式加载 `extension/` |

---

## 为什么做 OfferFlow

求职过程中，岗位信息分散在 BOSS、牛客、企业官网和海外 ATS 等多个平台。传统的 Excel、Notion 或手工记录方式存在明显问题：

| 问题 | 典型表现 |
| --- | --- |
| 信息分散 | 岗位散落在多个招聘平台，无法统一管理 |
| 重复录入 | 公司、岗位、JD 和链接需要手动复制 |
| JD 易失效 | 岗位下架后难以回看原始职责和要求 |
| 流程难追踪 | 投递、笔试、多轮面试和 Offer 状态容易混乱 |
| 日程易遗漏 | 笔试截止时间和面试链接分散在聊天或邮件中 |
| 复盘无沉淀 | 面试问题和失败原因难以跨岗位总结 |
| 缺少数据反馈 | 难以直观看到求职进度和阶段转化情况 |

OfferFlow 将这些分散动作连接成一条连续的求职工作流。

---

## 核心流程

```mermaid
flowchart LR
    A[浏览招聘页面] --> B[Chrome 插件识别页面]
    B --> C[提取岗位与 JD 信息]
    C --> D[用户确认并一键保存]
    D --> E[Web 工作台统一管理]
    E --> F[推进投递状态]
    F --> G[记录笔试与多轮面试]
    G --> H[临期提醒与面试复盘]
    H --> I[求职数据看板]
```

从浏览岗位、一键采集、状态推进、笔面试记录、临期提醒到数据看板，OfferFlow 覆盖求职流程中的核心环节。

---

# 产品能力

## 1. 跨平台岗位采集

Chrome 插件在用户浏览招聘页面时自动读取当前岗位信息，包括：

- 公司名称
- 岗位名称
- 工作地点
- 薪资信息
- JD / 职位描述
- 原始岗位链接

用户可以在插件中确认和修改提取结果，再一键保存到 OfferFlow。

为避免依赖单一网站 DOM 结构，OfferFlow 采用多级降级提取策略：

```text
平台专用解析器
      ↓
通用 CSS Selector
      ↓
JSON-LD JobPosting
      ↓
Meta / Open Graph
      ↓
DOM 内容区域识别
      ↓
启发式兜底
      ↓
用户确认与修正
```

### 平台覆盖

| 类型 | 平台 |
| --- | --- |
| 国内招聘平台 | BOSS 直聘、拉勾、牛客 |
| 企业招聘官网 | 字节跳动、阿里巴巴、腾讯、美团、京东 |
| 海外 ATS | Greenhouse、Lever、Workday、SmartRecruiters、iCIMS、Ashby |

同时对猎聘、前程无忧、智联招聘、LinkedIn 等平台设置了识别或通用兼容路径。

不同平台的登录状态、动态渲染方式和页面更新都会影响提取结果，因此插件始终保留用户确认和手动修改入口，确保采集结果可控。

### 提取机制

```mermaid
flowchart TD
    A[用户打开招聘页面] --> B[识别当前招聘平台]
    B --> C{存在专用解析器?}
    C -- 是 --> D[平台专用 DOM / CSS 解析]
    C -- 否 --> E[通用 CSS Selector]
    D --> F{字段是否完整?}
    E --> F
    F -- 否 --> G[JSON-LD JobPosting]
    G --> H[Meta / Open Graph]
    H --> I[JD 内容区域识别]
    I --> J[DOM 启发式兜底]
    F -- 是 --> K[插件表单]
    J --> K
    K --> L[用户确认]
    L --> M[保存到 OfferFlow]
```

---

## 2. JD 快照留存

保存岗位时同步保留 JD 文本。

即使原岗位之后出现下架、关闭、修改或需要重新登录等情况，用户仍然可以在 OfferFlow 中查看保存时的岗位要求，为简历修改、面试准备和后续复盘保留原始依据。

---

## 3. 求职状态管理

OfferFlow 使用七类状态覆盖求职生命周期：

```text
待投递 → 已投递 → 笔试 → 面试 → Offer

                已拒绝 / 已归档
```

对应状态值：

| 状态 | 含义 |
| --- | --- |
| `saved` | 待投递 |
| `applied` | 已投递 |
| `written_test` | 笔试 |
| `interview` | 面试 |
| `offer` | Offer |
| `rejected` | 已拒绝 |
| `archived` | 已归档 |

Web 工作台支持：

- 状态快速切换
- 按状态筛选
- 关键词搜索
- 批量修改状态
- 批量删除
- CSV 导出
- 岗位数量统计
- 临期事件优先展示

---

## 4. 笔试与多轮面试管理

每个岗位可以继续记录招聘流程事件。

### 笔试

支持记录：

- 笔试时间
- 笔试链接
- 笔试结果
- 复盘反馈
- 时间待定的笔试待办

### 面试

支持记录：

- 面试轮次
- 面试类型
- 面试时间
- 会议链接
- 面试结果
- 面试反馈

面试类型包括电话、视频、现场和 HR 等场景，可以持续记录一面、二面、三面等多轮流程。

---

## 5. 临期提醒

OfferFlow 自动聚合即将到来的笔试和面试事件：

- 按时间顺序排列
- 24 小时内事件高亮
- 岗位卡片优先展示最近事件
- 显示临期倒计时
- 已过期事件不再显示错误倒计时
- 时间待定的笔试继续保留为待办

用户可以直接在求职工作台中看到近期需要处理的招聘事件，减少在招聘 App、聊天记录、邮件和备忘录之间反复查找信息的成本。

---

## 6. 求职数据看板

OfferFlow 在 Web 工作台中提供求职数据看板，统计数据与实际岗位、笔试和面试记录共享同一套数据库，无需额外维护统计表。

当前包括：

- 总岗位数
- 本周新增岗位数
- 本月新增岗位数
- 面试次数
- 笔试次数
- Offer 率
- 当前岗位阶段分布
- 投递转化漏斗
- 近 7 天岗位新增趋势
- 待办事件数量

数据看板帮助用户快速了解当前求职进展和各阶段分布。

---

## 7. 用户认证与数据隔离

OfferFlow 支持：

- 邮箱密码登录
- Google OAuth
- GitHub OAuth
- JWT Session

每条岗位记录通过 `userId` 与用户关联，笔试和面试记录再通过岗位归属完成权限校验，实现用户级数据隔离。

---

# 产品架构

```mermaid
flowchart LR
    subgraph Browser[浏览器端]
        PAGE[招聘网站页面]
        CONTENT[Content Script<br/>岗位信息提取]
        POPUP[Extension Popup<br/>结果确认]
        SW[Background Service Worker<br/>API 通信]
    end

    subgraph Web[OfferFlow Web]
        UI[Next.js Web 工作台]
        API[Next.js Route Handlers]
        AUTH[用户认证与权限校验]
        STATS[统计与提醒服务]
    end

    subgraph Data[数据层]
        PRISMA[Prisma ORM]
        DB[(PostgreSQL)]
    end

    PAGE --> CONTENT
    CONTENT --> POPUP
    POPUP --> SW
    SW --> API

    UI --> API
    API --> AUTH
    API --> STATS
    API --> PRISMA
    STATS --> PRISMA
    PRISMA --> DB
```

浏览器端负责页面识别和信息提取，Web 端负责业务逻辑和数据持久化，两端通过 HTTP API 通信。API 层统一进行用户认证和权限校验，统计与提醒能力复用同一数据层。

---

# 数据模型

```mermaid
erDiagram
    USER ||--o{ JOB : owns
    JOB ||--o{ INTERVIEW : contains

    USER {
        string id
        string email
        string name
        string password
        string provider
        datetime createdAt
    }

    JOB {
        string id
        string title
        string company
        string location
        string salary
        string url
        string status
        string source
        text jdSnapshot
        text notes
        string userId
        datetime createdAt
        datetime updatedAt
    }

    INTERVIEW {
        string id
        int round
        string type
        datetime scheduledAt
        string feedback
        string result
        string meetingUrl
        string jobId
        datetime createdAt
    }
```

当前 `Interview` 模型同时承载笔试和面试事件，通过 `type` 字段区分，使两类事件可以共享时间、结果、链接和复盘记录结构。

---

# 技术栈

| 模块 | 技术 |
| --- | --- |
| Web 框架 | Next.js 14（App Router） |
| 前端 | React 18、TypeScript |
| UI | Tailwind CSS、Lucide Icons |
| API | Next.js Route Handlers |
| 数据库 | PostgreSQL |
| ORM | Prisma 5 |
| 用户认证 | NextAuth、bcrypt、JWT |
| 浏览器插件 | Chrome Extension Manifest V3 |
| 插件运行时 | Content Script、Popup、Service Worker |
| Web 部署 | Vercel |
| AI 协同开发 | TRAE WORK |

---

# TRAE WORK 协同开发

OfferFlow 不只是一个在 TRAE 中生成页面的 Demo，而是一个持续迭代的跨端产品。

## 从需求到模块拆解

将“管理求职流程”的宽泛想法拆分为：

- 浏览器岗位采集
- JD 快照
- 岗位状态管理
- 笔试与面试事件
- 待办提醒
- 数据看板
- 用户认证
- 云端部署

通过模块化拆解，将产品逐步推进到可以在线运行的完整版本。

## 跨文件协同开发

项目同时涉及：

- Chrome Extension
- Next.js 前端
- Route Handler API
- Prisma 数据模型
- NextAuth 用户认证
- PostgreSQL 数据库
- Vercel 部署

一个功能往往需要同时修改多个模块。例如“插件保存岗位”会经过：

```text
招聘页面
   ↓
content.js
   ↓
popup.js
   ↓
background.js
   ↓
HTTP API
   ↓
Next.js Route Handler
   ↓
Prisma
   ↓
PostgreSQL
```

TRAE WORK 用于理解跨目录依赖、辅助修改关联文件，并降低插件、Web 和数据库之间的联调成本。

## 问题定位与快速迭代

项目实际迭代过程中持续处理：

- 招聘网站 DOM 差异
- 多平台提取兼容
- Chrome Extension API 通信
- 用户认证与权限校验
- 多用户数据隔离
- Prisma 数据模型调整
- Vercel 构建与部署
- 临期事件排序
- 笔试与面试流程拆分
- 24 小时提醒
- 过期事件展示
- API 缓存与页面性能

TRAE WORK 帮助缩短从发现问题、定位相关代码到完成修改和验证的路径。

## 人机协同边界

项目的核心产品判断由开发者完成，包括：

- 选择浏览器插件作为低摩擦数据入口
- 定义求职生命周期和状态体系
- 确定核心功能优先级
- 设计岗位信息多级降级提取策略
- 设计笔试、面试、提醒和统计之间的数据关系

TRAE 主要承担代码理解、方案展开、实现辅助和调试协同。

---

# 本地运行

## 环境要求

- Node.js 18+
- npm 9+
- PostgreSQL 14+
- Chrome 100+

## 1. 克隆项目

```bash
git clone https://github.com/ZIYER-LL/offerflow.git
cd offerflow
```

## 2. 安装依赖

```bash
npm install
```

## 3. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`，至少配置：

```env
DATABASE_URL="postgresql://username:password@localhost:5432/offerflow"
AUTH_SECRET="your-auth-secret"
```

如需使用 Google OAuth：

```env
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

如需使用 GitHub OAuth：

```env
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

## 4. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

## 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

---

# 安装浏览器插件

1. 打开 Chrome，访问 `chrome://extensions/`。
2. 开启右上角 **开发者模式**。
3. 点击 **加载已解压的扩展程序**。
4. 选择项目中的 `extension/` 目录。
5. 打开招聘岗位页面。
6. 点击浏览器工具栏中的 OfferFlow 图标。
7. 检查自动提取结果并保存岗位。

插件支持配置 OfferFlow API 地址，可连接本地或线上环境。

---

# 常用命令

```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 生成 Prisma Client
npm run db:generate

# 同步数据库结构
npm run db:push

# 创建数据库 Migration
npm run db:migrate

# 打开 Prisma Studio
npm run db:studio
```

---

# 项目特点

OfferFlow 的核心不是单独实现某一个求职功能，而是把原本分散的求职动作连接起来：

```text
招聘网站
   ↓
岗位自动采集
   ↓
JD 快照沉淀
   ↓
统一岗位管理
   ↓
投递状态跟进
   ↓
笔试 / 多轮面试管理
   ↓
临期提醒
   ↓
面试反馈记录
   ↓
求职数据分析
```

浏览器插件负责降低信息采集成本，Web 工作台负责管理完整求职流程，PostgreSQL 持续沉淀用户数据，数据看板再将求职过程反馈给用户，最终形成一个可以实际使用的个人求职工作流系统。

---

# TRAE AI 创造力大赛

OfferFlow 参加 **TRAE AI 创造力大赛**，从 3 万余名参赛者中进入全国复赛 **350 强**，约前 **1.2%**。

项目从真实的个人求职痛点出发，通过 TRAE WORK 完成需求拆解、产品设计、浏览器插件、Web 全栈系统、数据库、认证、部署与持续调试，将最初的产品想法落地为可以实际运行的完整应用。

---

# License

MIT License
