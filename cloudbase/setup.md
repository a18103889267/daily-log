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
2. 找到 **邮箱验证码**，点击 **配置发件邮箱**
3. 选择 **开启邮件代发**（推荐）或自定义 SMTP
4. 保存并启用

## 4. 创建 PostgreSQL 数据表

1. 左侧 **SQL 型数据库** → **PostgreSQL 管理**
2. 左侧 **数据管理** → **SQL 编辑器**（就是执行 SQL 的地方）
3. 粘贴 `cloudbase/schema.sql` 里的内容，点执行
4. 回到 **数据浏览器**，刷新后应能看到表 **`daily_logs`**

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

1. **静态网站托管** → **应用部署** → 连接 Git 仓库
2. 框架：**Vite**，构建命令 `npm run build`，产物 `dist`
3. 环境变量：`VITE_CLOUDBASE_ENV_ID`
4. **基础配置**：索引文档和错误文档都设为 `index.html`

## 7. 验证

1. `npm run dev` 本地运行
2. 邮箱验证码登录
3. 保存一条记录
4. 在 **SQL 型数据库 → daily_logs** 里能看到新行
