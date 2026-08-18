<script setup lang="ts">
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { computed } from 'vue'

const props = defineProps<{
  content: string
}>()

marked.setOptions({
  gfm: true,
  breaks: true,
})

const html = computed(() => {
  if (!props.content.trim()) return ''
  const raw = marked.parse(props.content, { async: false }) as string
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  })
})
</script>

<template>
  <article class="markdown-body" v-html="html" />
</template>

<style scoped>
.markdown-body {
  color: var(--text);
  font-size: 15px;
  line-height: 1.75;
  word-break: break-word;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 1.4em 0 0.6em;
  line-height: 1.35;
  font-weight: 700;
  color: var(--text);
}

.markdown-body :deep(h1) {
  font-size: 1.5rem;
  padding-bottom: 0.35em;
  border-bottom: 2px solid rgba(255, 102, 0, 0.25);
}

.markdown-body :deep(h2) {
  font-size: 1.2rem;
  color: var(--primary);
}

.markdown-body :deep(h3) {
  font-size: 1.05rem;
}

.markdown-body :deep(h1:first-child),
.markdown-body :deep(h2:first-child),
.markdown-body :deep(h3:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p) {
  margin: 0 0 1em;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 1em;
  padding-left: 1.4em;
}

.markdown-body :deep(li) {
  margin: 0.35em 0;
}

.markdown-body :deep(li::marker) {
  color: var(--primary);
}

.markdown-body :deep(strong) {
  color: var(--text);
  font-weight: 700;
}

.markdown-body :deep(em) {
  color: var(--text-muted);
}

.markdown-body :deep(blockquote) {
  margin: 1em 0;
  padding: 0.75em 1em;
  border-left: 4px solid var(--primary);
  background: rgba(255, 102, 0, 0.06);
  border-radius: 0 10px 10px 0;
  color: var(--text-muted);
}

.markdown-body :deep(blockquote p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  font-family: Consolas, 'Courier New', monospace;
  font-size: 0.9em;
}

.markdown-body :deep(pre) {
  margin: 1em 0;
  padding: 14px 16px;
  overflow-x: auto;
  border-radius: 12px;
  background: #1e293b;
  border: 1px solid #334155;
}

.markdown-body :deep(pre code) {
  padding: 0;
  border: none;
  background: transparent;
  color: #e2e8f0;
  font-size: 0.88em;
}

.markdown-body :deep(hr) {
  margin: 1.5em 0;
  border: none;
  border-top: 1px dashed var(--border);
}

.markdown-body :deep(a) {
  color: var(--primary);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(table) {
  width: 100%;
  margin: 1em 0;
  border-collapse: collapse;
  font-size: 14px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 10px 12px;
  border: 1px solid var(--border);
  text-align: left;
}

.markdown-body :deep(th) {
  background: rgba(255, 102, 0, 0.08);
  font-weight: 600;
}
</style>
