import { copyFileSync, readFileSync } from 'node:fs'

const indexPath = 'dist/index.html'
const html = readFileSync(indexPath, 'utf8')

if (html.includes('/src/main.ts')) {
  console.error('dist/index.html still references /src/main.ts — build output looks invalid.')
  process.exit(1)
}

if (!html.includes('/assets/') && !html.includes('./assets/')) {
  console.error('dist/index.html has no bundled asset references — build output looks invalid.')
  process.exit(1)
}

copyFileSync(indexPath, 'dist/404.html')
console.log('Copied dist/index.html → dist/404.html for SPA fallback.')
