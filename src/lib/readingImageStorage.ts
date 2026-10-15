import { app, getCloudBaseErrorMessage } from './cloudbase'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGES_PER_ENTRY = 9
const STORAGE_BUCKET = import.meta.env.VITE_CLOUDBASE_STORAGE_BUCKET?.trim()
const DEFAULT_BUCKET_ID = 'reading'

type StorageClient = {
  upload: (
    path: string,
    file: File,
  ) => Promise<{ data: { id?: string; fullPath?: string; path?: string } | null; error: unknown }>
  createSignedUrl?: (
    id: string,
    expiresIn: number,
  ) => Promise<{
    data: { signedUrl?: string; fullSignedURL?: string; signedURL?: string } | null
    error: unknown
  }>
  remove?: (ids: string[]) => Promise<{ error: unknown }>
}

type StorageRoot = {
  listBuckets?: () => Promise<{ data: unknown; error: unknown }>
  from: (bucketId: string) => StorageClient
}

type UploadResult = {
  fileID?: string
  fileId?: string
  download_url?: string
  downloadUrl?: string
  tempFileURL?: string
  code?: string
  message?: string
}

type TempFileItem = {
  fileID?: string
  fileid?: string
  tempFileURL?: string
  download_url?: string
  downloadUrl?: string
  code?: string
  message?: string
}

type CloudApp = {
  uploadFile?: (params: { cloudPath: string; filePath: File }) => Promise<UploadResult>
  getTempFileURL?: (params: { fileList: string[] }) => Promise<{
    fileList?: TempFileItem[]
    code?: string
    message?: string
  }>
  deleteFile?: (params: { fileList: string[] }) => Promise<unknown>
  storage?: StorageRoot
}

export type UploadedReadingImage = {
  fileId: string
  previewUrl?: string
}

const cloudApp = app as CloudApp

const MISSING_BUCKET_HINT =
  '没有找到云存储 Bucket「reading」。请确认控制台里的 Bucket ID 是 reading；如果名称不同，在 .env.local 设置 VITE_CLOUDBASE_STORAGE_BUCKET 后重启开发服务。'

function formatStorageError(error: unknown, fallback: string) {
  const message = getCloudBaseErrorMessage(error, fallback)
  if (message.includes('STORAGE_BUCKET_NOT_FOUND') || message.includes('Storage bucket not found')) {
    return MISSING_BUCKET_HINT
  }
  if (message.includes('STORAGE_PERMISSION_DENIED')) {
    return '云存储 Bucket 已找到，但当前登录用户没有上传权限。请在控制台为该 Bucket 开启「登录用户可读写」。'
  }
  if (message.includes('storage') && message.includes('schema cache')) {
    return message
  }
  return message
}

function toStorageError(error: unknown, fallback: string) {
  return new Error(formatStorageError(error, fallback))
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

function inferReadingImageMime(file: File): string | null {
  const type = file.type?.trim().toLowerCase()
  if (type && ALLOWED_TYPES.has(type)) return type

  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (ext && EXT_TO_MIME[ext]) return EXT_TO_MIME[ext]

  // 截图粘贴等场景常见空 type，按 PNG 处理
  if (!type || type === 'application/octet-stream') return 'image/png'

  return null
}

/** 校验并规范化为带正确 MIME 的 File，便于后续 uploadFile */
export function normalizeReadingImageFile(file: File): File {
  const mime = inferReadingImageMime(file)
  if (!mime) {
    throw new Error('仅支持 JPG、PNG、WEBP、GIF 图片')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('单张图片不能超过 5MB')
  }
  if (file.type === mime) return file
  const name =
    file.name && file.name.includes('.')
      ? file.name
      : `reading-${Date.now()}.${mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1] ?? 'png'}`
  return new File([file], name, { type: mime, lastModified: file.lastModified })
}

export function validateReadingImageFile(file: File) {
  normalizeReadingImageFile(file)
}

export function canAddMoreImages(currentCount: number) {
  return currentCount < MAX_IMAGES_PER_ENTRY
}

function buildCloudPath(userId: string, logDate: string, file: File) {
  const rawExt = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const ext = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(rawExt) ? rawExt : 'jpg'
  return `${userId}/${logDate}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
}

function resolveBucketId() {
  return STORAGE_BUCKET || DEFAULT_BUCKET_ID
}

function getBucketStorageClient(bucketId: string): StorageClient {
  if (!cloudApp.storage?.from) {
    throw new Error('云存储未就绪。请确认已安装并注册 @cloudbase/js-sdk 的 storage 模块。')
  }
  return cloudApp.storage.from(bucketId)
}

function pickPreviewUrl(source: {
  download_url?: string
  downloadUrl?: string
  tempFileURL?: string
} | null | undefined) {
  const url = source?.tempFileURL || source?.download_url || source?.downloadUrl
  return url?.trim() || undefined
}

function pickSignedUrl(source: {
  signedUrl?: string
  fullSignedURL?: string
  signedURL?: string
  download_url?: string
  downloadUrl?: string
  tempFileURL?: string
} | null | undefined) {
  return (
    source?.signedUrl ||
    source?.fullSignedURL ||
    source?.signedURL ||
    pickPreviewUrl(source)
  )?.trim() || undefined
}

async function uploadWithBucketApi(cloudPath: string, file: File): Promise<UploadedReadingImage> {
  const bucketId = await resolveBucketId()
  const storage = getBucketStorageClient(bucketId)
  const { data, error } = await storage.upload(cloudPath, file)
  if (error) throw toStorageError(error, '图片上传失败')

  const fileId = data?.path || cloudPath
  return { fileId: String(fileId) }
}

export async function uploadReadingImage(
  file: File,
  userId: string,
  logDate: string,
): Promise<UploadedReadingImage> {
  const normalized = normalizeReadingImageFile(file)
  const cloudPath = buildCloudPath(userId, logDate, normalized)

  try {
    return await uploadWithBucketApi(cloudPath, normalized)
  } catch (error) {
    throw toStorageError(error, '图片上传失败')
  }
}

export async function deleteReadingImage(fileId: string) {
  if (!fileId || fileId.startsWith('local:') || fileId.startsWith('cloud://')) {
    if (fileId.startsWith('cloud://') && cloudApp.deleteFile) {
      await cloudApp.deleteFile({ fileList: [fileId] })
    }
    return
  }

  const bucketId = await resolveBucketId()
  const storage = getBucketStorageClient(bucketId)
  if (!storage.remove) return
  const { error } = await storage.remove([fileId])
  if (error) throw toStorageError(error, '删除图片失败')
}

export async function resolveReadingImageUrls(fileIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(fileIds.filter((id) => id && !id.startsWith('local:')))]
  if (!unique.length) return {}

  const map: Record<string, string> = {}
  const objectPaths = unique.filter((id) => !id.startsWith('cloud://'))
  const legacyIds = unique.filter((id) => id.startsWith('cloud://'))

  if (objectPaths.length) {
    try {
      const bucketId = await resolveBucketId()
      const storage = getBucketStorageClient(bucketId)
      if (storage.createSignedUrl) {
        for (const fileId of objectPaths) {
          const { data, error } = await storage.createSignedUrl(fileId, 3600)
          if (error) continue
          const url = pickSignedUrl(data)
          if (url) map[fileId] = url
        }
      }
    } catch {
      // 没有 Bucket 时保留本地预览，不阻断页面
    }
  }

  if (legacyIds.length && cloudApp.getTempFileURL) {
    const result = await cloudApp.getTempFileURL({ fileList: legacyIds })
    const items = result.fileList ?? []
    items.forEach((item, index) => {
      if (item.code === 'STORAGE_FILE_NONEXIST') return
      const url = pickPreviewUrl(item)
      if (!url) return
      const fileId = item.fileID || item.fileid || legacyIds[index]
      if (fileId) map[fileId] = url
    })
  }

  return map
}
