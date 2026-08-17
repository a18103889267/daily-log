import cloudbase from '@cloudbase/js-sdk'

const envId = import.meta.env.VITE_CLOUDBASE_ENV_ID?.trim()
const accessKey = import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY?.trim()

if (!envId) {
  throw new Error(
    import.meta.env.PROD
      ? '缺少 CloudBase 配置。请在腾讯云部署平台配置 VITE_CLOUDBASE_ENV_ID，然后重新部署。'
      : '缺少 CloudBase 配置。请在 .env.local 中填写 VITE_CLOUDBASE_ENV_ID，然后重启 npm run dev。',
  )
}

export const app = cloudbase.init({
  env: envId,
  region: 'ap-shanghai',
  ...(accessKey ? { accessKey } : {}),
})

export const auth = app.auth({
  persistence: 'local',
})

export const rdb = app.rdb()

export function getCloudBaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    const err = error as { message?: string; code?: string; msg?: string }
    return err.message || err.msg || err.code || fallback
  }
  return fallback
}
