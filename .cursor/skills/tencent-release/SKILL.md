---
name: tencent-release
description: >-
  Commit local changes, push to Git remote, and deploy daily-log to Tencent
  CloudBase (git commit + git push + npm run deploy:all). Use when the user says
  发布、发布腾讯云、提交、提交并发布、上线、/发布、/release, or asks to commit code and deploy
  to Tencent Cloud.
disable-model-invocation: true
---

# 腾讯云发布（提交 + Push + 部署）

用户主动触发时才执行，不要自动发布。

## 触发方式

用户说以下任一即可执行本流程：

- `发布`
- `发布腾讯云`
- `提交`
- `提交并发布`
- `上线`
- `/发布`
- `/release`

> **约定**：用户说「提交」时，默认包含 **git push** 到远程，不要等用户再单独说 push。

## 流程

### 1. 检查改动

并行执行：

```powershell
git status
git diff
git log -5 --oneline
```

- 无改动：告知用户无需提交，询问是否仍要部署；用户确认则跳到步骤 4
- 有 `.env.local` 等敏感文件在 staged/unstaged：不要提交，警告用户

### 2. 提交并 Push

- 根据 diff 写 1 行 title + 可选 body（中文或英文，与仓库近期 commit 风格一致）
- stage 相关文件后提交
- 提交成功后 **立即 push** 到远程（默认 `git push origin main`，或当前分支对应的 upstream）

**Windows 注意**：本机 Git 2.31 不支持 `git commit --trailer`，不要用 Shell 直接 `git commit -m`（会被注入 trailer 失败）。必须用：

```powershell
node scripts/git-commit.mjs "feat: 简短标题" "可选详细说明"
git push origin main
```

- 不要改 git config，不要 `--no-verify`，不要 force push
- 仅当用户明确说「只提交不 push」「不要 push」时，才跳过 push

### 3. 验证提交与 Push

```powershell
git status
git log -1 --oneline
```

确认 working tree clean，且分支已与远程同步（或报告 push 结果）。

### 4. 部署腾讯云

```powershell
npm run deploy:all
```

等价于：部署云函数 `deepseek-chat` + 构建静态站 + 托管到 `/dailylogs`。

- 需要网络；CLI 未登录时会打开浏览器授权，等待完成
- 部署超时设为 5 分钟以上

### 5. 回报结果

回复需包含：

- commit hash 与 message
- push 是否成功（默认应已 push）
- 部署是否成功
- 线上地址：`https://personenv-d5g0uh8zme4492f36-1322564973.tcloudbaseapp.com/dailylogs`
- 若 `cloudbase/*.sql` 有变更：提醒用户在 CloudBase PostgreSQL 控制台执行对应迁移 SQL

## 仅部署（不提交）

用户明确说「只部署不提交」时，跳过步骤 2–3，直接 `npm run deploy:all`。

## 仅提交（不部署）

用户明确说「只提交不发布」时，执行步骤 1–3（含 push），跳过步骤 4。

## 仅提交不 Push

用户明确说「只提交不 push」「不要 push」时，执行步骤 2 的 commit 部分，跳过 push 与部署。
