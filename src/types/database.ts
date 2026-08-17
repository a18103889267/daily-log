export type DailyChecklist = {
  learnedTech: {
    checked: boolean
    technologies: string[]
  }
  reading: {
    checked: boolean
    notes: string
  }
  exercise: {
    checked: boolean
  }
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          mood: string | null
          tags: string[] | null
          items: DailyChecklist | null
          summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          mood?: string | null
          tags?: string[] | null
          items?: DailyChecklist | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          log_date?: string
          mood?: string | null
          tags?: string[] | null
          items?: DailyChecklist | null
          summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type DailyLog = Database['public']['Tables']['daily_logs']['Row']
export type DailyLogInsert = Omit<
  Database['public']['Tables']['daily_logs']['Insert'],
  'user_id'
>
export type DailyLogUpdate = Database['public']['Tables']['daily_logs']['Update']

export function createDefaultChecklist(): DailyChecklist {
  return {
    learnedTech: {
      checked: false,
      technologies: [''],
    },
    reading: {
      checked: false,
      notes: '',
    },
    exercise: {
      checked: false,
    },
  }
}

export function parseChecklist(raw: unknown): DailyChecklist {
  const defaults = createDefaultChecklist()

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return defaults
  }

  const data = raw as Partial<DailyChecklist>

  return {
    learnedTech: {
      checked: Boolean(data.learnedTech?.checked),
      technologies:
        data.learnedTech?.technologies?.length
          ? data.learnedTech.technologies
          : [''],
    },
    reading: {
      checked: Boolean(data.reading?.checked),
      notes: data.reading?.notes ?? '',
    },
    exercise: {
      checked: Boolean(data.exercise?.checked),
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
    },
    exercise: {
      checked: checklist.exercise.checked,
    },
  }
}
