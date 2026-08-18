# daily-log

Vue 3 + Vite + 腾讯云 CloudBase 个人每日记录项目。前端 + MySQL 数据库均在腾讯云，国内访问稳定。

## 功能

- 邮箱验证码登录（CloudBase 身份认证）
- 日历首页查看哪些日期已有记录
- 按天 checkbox 记录：学习新技术、阅读、运动
- 数据存储在 CloudBase **MySQL** 数据库

## 本地启动

```powershell
cd F:\project\daily-log
npm install
Copy-Item .env.example .env.local
```

`.env.local`：

```env
VITE_CLOUDBASE_ENV_ID=你的环境ID
```

### 腾讯云配置

见 [cloudbase/setup.md](./cloudbase/setup.md)：

1. 开启 **邮箱验证码** 登录
2. 在 **SQL 型数据库** 执行 `cloudbase/schema.sql` 建表
3. 启动 `npm run dev`

## 部署

腾讯云 **静态网站托管** 连接 Git 仓库，或使用 `tcb app deploy`（见 [cloudbase/setup.md](./cloudbase/setup.md)）。

| 配置项 | 值 |
|--------|-----|
| 构建命令 | `npm run build:ci` |
| 产物目录 | `dist` |
| Node.js | 20 或 22 |
| 部署路径 | `/dailylogs` |
| 环境变量 | `VITE_CLOUDBASE_ENV_ID`、`VITE_CLOUDBASE_PUBLISHABLE_KEY` |

## 常用命令

```powershell
npm run dev
npm run build
npm run preview
```
