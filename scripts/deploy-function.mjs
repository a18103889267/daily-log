import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const envId = 'personenv-d5g0uh8zme4492f36'
const envLocal = readFileSync('.env.local', 'utf8')
const keyMatch = envLocal.match(/^DEEPSEEK_API_KEY=(.+)$/m)
const apiKey = keyMatch?.[1]?.trim()

if (!apiKey) {
  console.error('未找到 DEEPSEEK_API_KEY，请先在 .env.local 中配置。')
  process.exit(1)
}

const configPath = 'cloudbaserc.json'
const config = JSON.parse(readFileSync(configPath, 'utf8'))
const fn = config.functions?.find((item) => item.name === 'deepseek-chat')

if (!fn) {
  console.error('cloudbaserc.json 中未找到 deepseek-chat 云函数配置。')
  process.exit(1)
}

fn.envVariables = {
  ...fn.envVariables,
  DEEPSEEK_API_KEY: apiKey,
}

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

try {
  execSync(`npx tcb fn deploy deepseek-chat -e ${envId} --force --yes`, {
    stdio: 'inherit',
  })
} finally {
  delete fn.envVariables.DEEPSEEK_API_KEY
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  console.log('已从 cloudbaserc.json 移除 DEEPSEEK_API_KEY（密钥仅写入云端环境变量）。')
}
