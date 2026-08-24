import { execSync } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error('用法: node scripts/git-commit.mjs <title> [body]')
  console.error('示例: node scripts/git-commit.mjs "feat: add weekly goals" "Support weekly period type."')
  process.exit(1)
}

const title = args[0]
const body = args.slice(1).join('\n\n')
const message = body ? `${title}\n\n${body}` : title
const msgFile = join(tmpdir(), `daily-log-commit-${Date.now()}.txt`)

writeFileSync(msgFile, message, 'utf8')

try {
  execSync(`git commit -F "${msgFile}"`, { stdio: 'inherit' })
} finally {
  try {
    unlinkSync(msgFile)
  } catch {
    // ignore cleanup errors
  }
}
