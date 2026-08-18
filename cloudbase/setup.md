# 腾讯云 CloudBase 配置指南（MySQL 版）

## 1. 创建环境

1. 打开 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 新建环境，记下 **环境 ID**

## 2. 配置 Publishable Key（建议）

1. CloudBase 控制台 → **API Key 配置**（或 **身份认证** 相关设置）
2. 创建 **Publishable Key**
3. 写入 `.env.local`：

```env
VITE_CLOUDBASE_ENV_ID=你的环境ID
VITE_CLOUDBASE_PUBLISHABLE_KEY=你的PublishableKey
```

## 3. 开启登录方式

1. 进入环境 → **身份认证** → **登录方式**
2. 启用 **用户名密码登录**（默认通常已开启，用于邮箱/账号 + 密码登录）
3. 找到 **邮箱验证码**，点击 **配置发件邮箱**
4. 选择 **开启邮件代发**（推荐）或自定义 SMTP
5. 保存并启用

> 应用支持两种登录方式：**密码登录**（邮箱或账号 + 密码）和 **验证码登录**。  
> 首次注册需验证邮箱一次；注册时可设置账号名，之后可用「账号 + 密码」登录。

## 4. 创建 PostgreSQL 数据表

1. 左侧 **SQL 型数据库** → **PostgreSQL 管理**
2. 左侧 **数据管理** → **SQL 编辑器**（就是执行 SQL 的地方）
3. 粘贴 `cloudbase/schema.sql` 里的内容，点执行
4. 回到 **数据浏览器**，刷新后应能看到表 **`daily_logs`** 和 **`goals`**

> 如果之前只建过 `daily_logs`，目标功能需要额外执行 **`cloudbase/migrate-goals.sql`**。  
> 建表后若仍报 `Could not find the table 'public.goals'`，在同一 SQL 编辑器再执行：  
> `NOTIFY pgrst, 'reload schema';`  
> 然后等几秒刷新页面。

> 注意：截图里 `schema: daily_logs` 是 **Schema（模式名）**，不是表。  
> 需要在当前 Schema 下 **新建表**，或用 SQL 编辑器创建名为 `daily_logs` 的 **表**。

如果 SQL 编辑器里报错，也可以点 **「+ 新建表」**，手动建表，字段如下：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGSERIAL | 主键，自增 |
| user_id | VARCHAR | CloudBase 用户 uid |
| log_date | VARCHAR(10) | 日期 YYYY-MM-DD |
| tags | JSONB | 标签数组 |
| items | JSONB | checkbox 记录 |
| summary | TEXT | 总结 |
| created_at / updated_at | BIGINT | 时间戳 |

## 4. 配置数据权限（建议）

在 MySQL 数据表的 **权限设置** 中，确保：

- 仅登录用户可读写
- 或按 `user_id` 限制只能访问自己的数据

代码里已按 `user_id` 过滤，权限建议双重保障。

## 5. 配置本地环境变量

```powershell
Copy-Item .env.example .env.local
```

编辑 `.env.local`：

```env
VITE_CLOUDBASE_ENV_ID=你的环境ID
```

## 6. 部署静态网站

项目已配置 `cloudbaserc.json`，推荐用 **Git 仓库部署** 或 **`tcb app deploy`**。

### 控制台 Git 部署（推荐）

1. **静态网站托管** → **应用部署** → **Git 个人仓库部署**
2. 选择 GitHub 仓库 `daily-log`，分支 `main`
3. 构建参数（与 `cloudbaserc.json` 保持一致）：

| 配置项 | 值 |
|--------|-----|
| 框架 | Vite |
| Node.js | **20** 或 **22**（不要选 16/18） |
| 安装命令 | `npm install` |
| 构建命令 | `npm run build:ci` |
| 产物目录 | `dist` |
| 部署路径 | `/dailylogs` |

4. 环境变量（构建时注入，必填）：

```env
VITE_CLOUDBASE_ENV_ID=你的环境ID
VITE_CLOUDBASE_PUBLISHABLE_KEY=你的PublishableKey
```

5. **基础配置**：索引文档和错误文档都设为 `index.html`

### CLI 部署

先把 `cloudbaserc.json` 里的 `your-publishable-key` 换成真实值，然后：

```powershell
cd F:\project\daily-log
npm install
npx tcb login
npx tcb app deploy -e 你的环境ID
```

> 若提示 `tcb 无法识别`，说明未全局安装 CLI。本项目已内置 `@cloudbase/cli`，用 **`npx tcb`** 代替 `tcb` 即可。

### 两种部署方式的区别（重要）

| 方式 | 命令 | 控制台哪里看 | 说明 |
|------|------|--------------|------|
| **静态托管直传** | `npx tcb hosting deploy .\dist /dailylogs -e 环境ID` | **静态网站托管 → 文件管理** → `dailylogs/` | 直接覆盖 COS 文件，**不会**出现在「应用部署」版本列表 |
| **云构建应用部署** | `npx tcb app deploy -e 环境ID` | **静态网站托管 → 应用部署** | 云端构建 + 版本记录，适合 Git 联动 |

你刚执行的 `hosting deploy` **已经成功**（22 个文件，时间 12:01），只是不会更新「应用部署」那个列表。

**正确访问地址**（必须带子路径）：

```text
https://personenv-d5g0uh8zme4492f36-1322564973.tcloudbaseapp.com/dailylogs/
```

根路径 `https://...tcloudbaseapp.com/` 没有部署内容，会 404 或显示旧页面。

### 报错：`Path does not exist: .../dist`

说明**云端构建失败**，`dist` 没生成。按下面排查：

| 现象 / 日志 | 原因 | 处理 |
|-------------|------|------|
| `Path does not exist: .../dist` | 构建命令失败 | 构建命令改为 `npm run build:ci`（不要用 `npm run build`） |
| `requires Node.js 20.19+` | Node 版本太低 | 构建环境选 **Node 20** 或 **22** |
| `vue-tsc` 报错 | 类型检查失败 | 同上，用 `npm run build:ci` |
| 构建成功但打开白屏 | 缺少环境变量 | 补全 `VITE_CLOUDBASE_ENV_ID` 后重新部署 |
| 刷新页面 404 | 未配置 SPA 回退 | 索引/错误文档都设为 `index.html` |
| 资源 404 | 子路径部署 | 已设置 `base: '/dailylogs/'`，部署路径填 `/dailylogs` |
| `video/mp2t` / `Failed to load module script` | 线上加载了**源码** `index.html`（含 `/src/main.ts`），未部署 `dist` | 见下方「MIME 类型报错」 |

### MIME 类型报错（`video/mp2t`）

浏览器报错类似：

```text
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "video/mp2t"
```

说明页面在请求 **`/src/main.ts`**（开发入口），而不是构建后的 `/dailylogs/assets/*.js`。`.ts` 扩展名会被当成 MPEG 流，MIME 为 `video/mp2t`。

**排查步骤：**

1. 在浏览器打开部署地址，按 **Ctrl+U** 查看网页源代码：
   - ❌ 若看到 `<script type="module" src="/src/main.ts">` → 云端**没有**用上 `dist` 产物
   - ✅ 正确应为 `<script ... src="/dailylogs/assets/index-xxxxx.js">`
2. 打开 CloudBase **部署日志**，确认构建阶段有 `vite build` 且成功，并有 `Successfully uploaded` 到 `/dailylogs/` 路径
3. 核对控制台构建参数（必须与下表一致）：

| 配置项 | 正确值 | 常见误填 |
|--------|--------|----------|
| 构建命令 | `npm run build:ci` | `npm run build`（含 vue-tsc，易失败） |
| 构建产物目录 | `dist` | `.` 或留空（会上传源码） |
| Node.js | **20** 或 **22** | 16 / 18（Vite 8 不支持） |
| 部署路径 | `/dailylogs` | 与 `vite.config.ts` 的 `base` 一致 |

4. **访问地址**必须是子路径：`https://你的域名/dailylogs/`（不要只打开根域名）
5. **静态托管 → 设置**：4xx 错误页面设为 `index.html`（SPA 回退；若部署在子路径且仍 404，可改为 `dailylogs/index.html`）
6. 本项目生产环境已改用 **hash 路由**（地址形如 `/dailylogs/#/summary`），无需依赖控制台 SPA 回退配置
7. 仍不行时，本地构建后手动上传验证：

```powershell
cd F:\project\daily-log
npm run build:ci
npx tcb hosting deploy .\dist /dailylogs -e 你的环境ID
```

### 备选：本地构建后上传

```powershell
cd F:\project\daily-log
npm run build:ci
npx tcb hosting deploy .\dist /dailylogs -e 你的环境ID
```

或一键构建并上传（需先 `npx tcb login`）：

```powershell
npm run deploy -- -e 你的环境ID
```

## 8. 开启 AI 总结（DeepSeek 云函数，无需 CloudBase AI+ 套餐）

### 本地开发

`.env.local` 配置 DeepSeek，通过 Vite 代理调用（密钥不会打包进前端）：

```env
VITE_AI_BACKEND=deepseek
DEEPSEEK_API_KEY=你的DeepSeek密钥
```

### 线上部署（云函数代理）

静态托管没有 `/api/deepseek` 代理，线上通过 **CloudBase 云函数 `deepseek-chat`** 调用 DeepSeek，Key 存在云函数环境变量，**只付 DeepSeek 用量，无需 CloudBase AI+ 资源点**。

**1. 部署云函数（从 `.env.local` 读取 Key 并写入云端，不会提交到 Git）**

```powershell
npm run deploy:function
```

或手动在控制台配置：

1. CloudBase 控制台 → **云函数** → `deepseek-chat` → **环境变量**
2. 添加 `DEEPSEEK_API_KEY` = 你的 DeepSeek 密钥
3. 可选 `DEEPSEEK_MODEL` = `deepseek-chat`

**2. 部署前端**

```powershell
npm run deploy -- -e 你的环境ID
```

或一键：

```powershell
npm run deploy:all -- -e 你的环境ID
```

### 常见错误

| 错误 | 处理 |
|------|------|
| `云函数未配置 DEEPSEEK_API_KEY` | 执行 `npm run deploy:function` 或在控制台添加环境变量 |
| `云函数调用失败` | 确认已登录；云函数 → deepseek-chat 是否部署成功 |
| DeepSeek 余额不足 | 去 DeepSeek 控制台充值 |

## 7. 验证

1. `npm run dev` 本地运行
2. 邮箱验证码登录
3. 保存一条记录
4. 在 **SQL 型数据库 → daily_logs** 里能看到新行
