export type DailyChecklist = {
  learnedTech: {
    checked: boolean
    technologies: string[]
  }
  reading: {
    checked: boolean
    notes: string
    minutes: number
  }
  exercise: {
    checked: boolean
    minutes: number
  }
}

export type DailyLog = {
  id: number
  user_id: string
  log_date: string
  mood: string | null
  tags: string[] | null
  items: DailyChecklist | null
  summary: string | null
  created_at: number
  updated_at: number
}

export type DailyLogInsert = {
  log_date?: string
  mood?: string | null
  tags?: string[] | null
  items?: DailyChecklist | null
  summary?: string | null
}

export type DailyLogUpdate = Partial<DailyLogInsert>

export function createDefaultChecklist(): DailyChecklist {
  return {
    learnedTech: {
      checked: false,
      technologies: [''],
    },
    reading: {
      checked: false,
      notes: '',
      minutes: 0,
    },
    exercise: {
      checked: false,
      minutes: 0,
    },
  }
}

export function parseChecklist(raw: unknown): DailyChecklist {
  const defaults = createDefaultChecklist()
  const parsed = parseJson<DailyChecklist>(raw)

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return defaults
  }

  return {
    learnedTech: {
      checked: Boolean(parsed.learnedTech?.checked),
      technologies:
        parsed.learnedTech?.technologies?.length
          ? parsed.learnedTech.technologies
          : [''],
    },
    reading: {
      checked: Boolean(parsed.reading?.checked),
      notes: parsed.reading?.notes ?? '',
      minutes: Number(parsed.reading?.minutes ?? 0) || 0,
    },
    exercise: {
      checked: Boolean(parsed.exercise?.checked),
      minutes: Number(parsed.exercise?.minutes ?? 0) || 0,
    },
  }
}

export function checklistToTags(checklist: DailyChecklist) {
  const tags: string[] = []
  if (checklist.learnedTech.checked) tags.push('学习')
  if (checklist.reading.checked) tags.push('阅读')
  if (checklist.exercise.checked) tags.push('运动')
  return tags
}

export function normalizeChecklist(checklist: DailyChecklist): DailyChecklist {
  return {
    learnedTech: {
      checked: checklist.learnedTech.checked,
      technologies: checklist.learnedTech.technologies
        .map((item) => item.trim())
        .filter(Boolean),
    },
    reading: {
      checked: checklist.reading.checked,
      notes: checklist.reading.notes.trim(),
      minutes: Math.max(0, Math.round(checklist.reading.minutes || 0)),
    },
    exercise: {
      checked: checklist.exercise.checked,
      minutes: Math.max(0, Math.round(checklist.exercise.minutes || 0)),
    },
  }
}

function parseJson<T>(value: unknown): T | null {
  if (value == null) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T
    } catch {
      return null
    }
  }
  return value as T
}

function mapRow(row: Record<string, unknown>): DailyLog {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    log_date: String(row.log_date),
    mood: (row.mood as string | null) ?? null,
    tags: parseJson<string[]>(row.tags),
    items: parseChecklist(row.items),
    summary: (row.summary as string | null) ?? null,
    created_at: Number(row.created_at ?? Date.now()),
    updated_at: Number(row.updated_at ?? Date.now()),
  }
}

export { mapRow }
