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

先把 `cloudbaserc.json` 里的 `your-env-id`、`your-publishable-key` 换成真实值，然后：

```powershell
cd F:\project\daily-log
npm install -g @cloudbase/cli
tcb login
tcb app deploy -e 你的环境ID
```

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

### 备选：本地构建后上传

```powershell
cd F:\project\daily-log
npm run build:ci
tcb hosting deploy .\dist /dailylogs -e 你的环境ID
```

## 8. 开启 AI 总结（可选）

1. CloudBase 控制台 → **AI+** → 开通大模型能力
2. 确保 `.env.local` 已配置 `VITE_CLOUDBASE_PUBLISHABLE_KEY`
3. 可选配置：
   - `VITE_AI_PROVIDER=cloudbase`（默认）
   - `VITE_AI_MODEL=deepseek-v4-flash`（默认，可在控制台查看可用模型）
4. 应用内进入 **总结** 页，点击「生成本月总结」

> 总结会读取日历记录（学习/阅读/运动/笔记）与目标完成情况。  
> 在日历里填写「阅读时长 / 运动时长」后，总结可统计小时数。  
> 若 AI 不可用，会自动降级为本地统计摘要。

## 7. 验证

1. `npm run dev` 本地运行
2. 邮箱验证码登录
3. 保存一条记录
4. 在 **SQL 型数据库 → daily_logs** 里能看到新行
