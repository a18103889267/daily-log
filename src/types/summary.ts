import type { DailyLog } from './database'
import { parseChecklist } from './database'
import type { Goal } from './goal'
import { GOAL_PERIOD_LABELS } from './goal'
import { formatMinutes } from '../utils/date'

export type SummaryPeriod = 'daily' | 'weekly' | 'monthly'

export type SummaryStats = {
  periodLabel: string
  rangeStart: string
  rangeEnd: string
  loggedDays: number
  learningDays: number
  readingDays: number
  exerciseDays: number
  readingMinutes: number
  exerciseMinutes: number
  technologies: string[]
  readingNotes: Array<{ date: string; notes: string }>
  completedGoals: string[]
  incompleteGoals: string[]
  overdueGoals: string[]
}

export const SUMMARY_PERIOD_LABELS: Record<SummaryPeriod, string> = {
  daily: '今日总结',
  weekly: '本周总结',
  monthly: '本月总结',
}

export function buildSummaryStats(
  logs: DailyLog[],
  goals: Goal[],
  period: SummaryPeriod,
  rangeStart: string,
  rangeEnd: string,
  today: string,
): SummaryStats {
  const technologies = new Set<string>()
  const readingNotes: Array<{ date: string; notes: string }> = []
  let learningDays = 0
  let readingDays = 0
  let exerciseDays = 0
  let readingMinutes = 0
  let exerciseMinutes = 0

  for (const log of logs) {
    const checklist = parseChecklist(log.items)
    if (checklist.learnedTech.checked) {
      learningDays += 1
      checklist.learnedTech.technologies.forEach((item) => {
        const value = item.trim()
        if (value) technologies.add(value)
      })
    }
    if (checklist.reading.checked) {
      readingDays += 1
      readingMinutes += checklist.reading.minutes
      if (checklist.reading.notes.trim()) {
        readingNotes.push({ date: log.log_date, notes: checklist.reading.notes.trim() })
      }
    }
    if (checklist.exercise.checked) {
      exerciseDays += 1
      exerciseMinutes += checklist.exercise.minutes
    }
  }

  const goalsInRange = goals.filter(
    (goal) => goal.start_date <= rangeEnd && goal.end_date >= rangeStart,
  )

  const completedGoals = goalsInRange.filter((goal) => goal.completed).map((goal) => goal.title)
  const incompleteGoals = goalsInRange
    .filter((goal) => !goal.completed && goal.end_date >= today)
    .map((goal) => goal.title)
  const overdueGoals = goalsInRange
    .filter((goal) => !goal.completed && goal.end_date < today)
    .map((goal) => goal.title)

  return {
    periodLabel: SUMMARY_PERIOD_LABELS[period],
    rangeStart,
    rangeEnd,
    loggedDays: logs.length,
    learningDays,
    readingDays,
    exerciseDays,
    readingMinutes,
    exerciseMinutes,
    technologies: [...technologies],
    readingNotes,
    completedGoals,
    incompleteGoals,
    overdueGoals,
  }
}

export function buildSummaryPrompt(stats: SummaryStats) {
  const payload = {
    统计区间: `${stats.rangeStart} 至 ${stats.rangeEnd}`,
    有记录的天数: stats.loggedDays,
    学习新技术天数: stats.learningDays,
    阅读天数: stats.readingDays,
    运动天数: stats.exerciseDays,
    阅读总时长: formatMinutes(stats.readingMinutes),
    运动总时长: formatMinutes(stats.exerciseMinutes),
    学会的技术: stats.technologies,
    阅读笔记: stats.readingNotes,
    已完成目标: stats.completedGoals,
    进行中目标: stats.incompleteGoals,
    已过期未完成目标: stats.overdueGoals,
  }

  return `你是一位温和、专业的个人成长助手。请根据以下真实数据，为用户生成一份「${stats.periodLabel}」报告。

要求：
1. 使用中文 Markdown，结构清晰（可用二级标题）
2. 必须基于给定数据，不要编造没有记录的活动或时长
3. 若阅读/运动时长为 0 分钟，请用「X 天有阅读/运动记录」表述，不要虚构小时数
4. 提炼学会的技术清单，并归纳阅读笔记中的收获
5. 单独说明目标完成情况（已完成、进行中、已过期）
6. 最后给出 2-3 条简短、可执行的改进建议
7. 语气积极，篇幅适中（300-600 字）

用户数据（JSON）：
${JSON.stringify(payload, null, 2)}`
}

export function buildFallbackSummary(stats: SummaryStats) {
  const sections = [
    `# ${stats.periodLabel}`,
    '',
    `> 统计区间：**${stats.rangeStart}** 至 **${stats.rangeEnd}**`,
    '',
    '## 学习与生活',
    '',
    '| 项目 | 数据 |',
    '| --- | --- |',
    `| 有记录 | ${stats.loggedDays} 天 |`,
    `| 学习新技术 | ${stats.learningDays} 天 |`,
    `| 阅读 | ${stats.readingDays} 天（${formatMinutes(stats.readingMinutes)}） |`,
    `| 运动 | ${stats.exerciseDays} 天（${formatMinutes(stats.exerciseMinutes)}） |`,
  ]

  if (stats.technologies.length > 0) {
    sections.push('', '## 学会的技术', '')
    stats.technologies.forEach((item) => sections.push(`- ${item}`))
  }

  if (stats.readingNotes.length > 0) {
    sections.push('', '## 阅读笔记摘录', '')
    stats.readingNotes.forEach((item) => {
      sections.push(`- **${item.date}**：${item.notes}`)
    })
  }

  sections.push('', '## 目标完成情况', '')
  sections.push(`- ✅ 已完成：${stats.completedGoals.length ? stats.completedGoals.join('、') : '无'}`)
  sections.push(`- 🔄 进行中：${stats.incompleteGoals.length ? stats.incompleteGoals.join('、') : '无'}`)
  sections.push(`- ⏰ 已过期：${stats.overdueGoals.length ? stats.overdueGoals.join('、') : '无'}`)

  sections.push('', '---', '', '*AI 暂不可用，以上为系统自动整理的 Markdown 摘要。*')

  return sections.join('\n')
}

export function hasSummaryData(stats: SummaryStats) {
  return (
    stats.loggedDays > 0 ||
    stats.completedGoals.length > 0 ||
    stats.incompleteGoals.length > 0 ||
    stats.overdueGoals.length > 0
  )
}
