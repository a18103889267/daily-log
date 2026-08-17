# Daily Log

Vue 3 + Vite + Supabase 个人每日记录项目。支持电脑和手机浏览器访问同一份数据。

## 功能

- 邮箱注册 / 登录（Supabase Auth）
- 日历首页查看哪些日期已有记录
- 按天编辑心情、标签、总结、事项明细
- 数据存储在 Supabase PostgreSQL，多端同步

## 本地启动

### 1. 安装依赖

```powershell
cd F:\project\daily-log
npm install
```

### 2. 创建 Supabase 项目

1. 打开 [https://supabase.com](https://supabase.com) 并登录
2. 点击 **New Project** 创建项目
3. 进入 **Project Settings → API**，复制：
   - Project URL
   - anon public key

### 3. 配置环境变量

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 初始化数据库

在 Supabase 控制台打开 **SQL Editor**，执行 `supabase/schema.sql` 中的 SQL。

### 5. 启动开发服务器

```powershell
npm run dev
```

浏览器访问终端里显示的本地地址，例如 `http://localhost:5173`。

## 项目结构

```text
src/
  lib/supabase.ts          # Supabase 客户端
  composables/
    useAuth.ts             # 登录注册
    useDailyLogs.ts        # 日记 CRUD
  views/
    LoginView.vue          # 登录页
    HomeView.vue           # 日历首页
    DayView.vue            # 单日编辑页
supabase/
  schema.sql               # 数据表和 RLS 策略
```

## 部署

前端可部署到 Vercel / Netlify / Cloudflare Pages。部署时在平台环境变量里配置：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Supabase 项目本身托管在云端，不需要你再单独部署数据库。

## 常用命令

```powershell
npm run dev
npm run build
npm run preview
```
