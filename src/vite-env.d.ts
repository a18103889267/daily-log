/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLOUDBASE_ENV_ID: string
  readonly VITE_CLOUDBASE_PUBLISHABLE_KEY?: string
  readonly VITE_AI_BACKEND?: string
  readonly VITE_DEEPSEEK_MODEL?: string
  readonly VITE_DEEPSEEK_FUNCTION?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
