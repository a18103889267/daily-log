import { formatLocalDate, parseLocalDate } from '../utils/date'

export type GoalPeriod = 'daily' | 'monthly' | 'quarterly'

export type Goal = {
  id: number
  user_id: string
  title: string
  period_type: GoalPeriod
  start_date: string
  end_date: string
  completed: boolean
  completed_at: number | null
  created_at: number
  updated_at: number
}

export type GoalInsert = {
  title: string
  period_type: GoalPeriod
  start_date: string
}

export const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  daily: '每日目标',
  monthly: '每月目标',
  quarterly: '三个月目标',
}

export function computeGoalEndDate(startDate: string, periodType: GoalPeriod): string {
  const start = parseLocalDate(startDate)
  const year = start.getFullYear()
  const month = start.getMonth()

  if (periodType === 'daily') {
    return startDate
  }

  if (periodType === 'monthly') {
    return formatLocalDate(new Date(year, month + 1, 0))
  }

  return formatLocalDate(new Date(year, month + 3, 0))
}

export function isGoalOverdue(goal: Goal, today = todayLocalForGoal()): boolean {
  return !goal.completed && goal.end_date < today
}

export function isGoalActive(goal: Goal, today = todayLocalForGoal()): boolean {
  return !goal.completed && goal.end_date >= today
}

function todayLocalForGoal(): string {
  return formatLocalDate(new Date())
}

export function goalStatusLabel(goal: Goal, today = todayLocalForGoal()): string {
  if (goal.completed) return '已完成'
  if (goal.end_date < today) return '已过期'
  if (goal.start_date > today) return '未开始'
  return '进行中'
}

export function mapGoalRow(row: Record<string, unknown>): Goal {
  return {
    id: Number(row.id),
    user_id: String(row.user_id),
    title: String(row.title),
    period_type: row.period_type as GoalPeriod,
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    completed: Boolean(row.completed),
    completed_at: row.completed_at == null ? null : Number(row.completed_at),
    created_at: Number(row.created_at ?? Date.now()),
    updated_at: Number(row.updated_at ?? Date.now()),
  }
}
