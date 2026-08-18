import { ref } from 'vue'
import { rdb } from '../lib/cloudbase'
import {
  computeGoalEndDate,
  isGoalOverdue,
  mapGoalRow,
  type Goal,
  type GoalInsert,
  type GoalPeriod,
} from '../types/goal'
import { todayLocal } from '../utils/date'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message: string }).message)
    if (message.includes('public.goals') || message.includes('schema cache')) {
      return '目标表尚未创建。请在 CloudBase SQL 编辑器执行 cloudbase/migrate-goals.sql，然后刷新页面。'
    }
    return message
  }
  return fallback
}

export function useGoals() {
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchGoals(userId: string) {
    loading.value = true
    error.value = null

    try {
      const { data, error: queryError } = await rdb
        .from('goals')
        .select('*')
        .eq('user_id', userId)

      if (queryError) {
        throw new Error(getErrorMessage(queryError, '读取目标失败'))
      }

      return (data ?? [])
        .map((row) => mapGoalRow(row as Record<string, unknown>))
        .sort((a, b) => {
          if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed)
          }
          return a.end_date.localeCompare(b.end_date)
        })
    } catch (err) {
      error.value = err instanceof Error ? err.message : '读取目标失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createGoal(payload: GoalInsert, userId: string) {
    loading.value = true
    error.value = null

    const title = payload.title.trim()
    if (!title) {
      loading.value = false
      throw new Error('请填写目标内容')
    }

    const startDate = payload.start_date.trim()
    const endDate = computeGoalEndDate(startDate, payload.period_type)
    const now = Date.now()

    try {
      const { data, error: insertError } = await rdb
        .from('goals')
        .insert({
          user_id: userId,
          title,
          period_type: payload.period_type,
          start_date: startDate,
          end_date: endDate,
          completed: false,
          completed_at: null,
          created_at: now,
          updated_at: now,
        })
        .select()

      if (insertError) {
        throw new Error(getErrorMessage(insertError, '创建目标失败'))
      }

      const row = data?.[0]
      if (!row) {
        throw new Error('创建目标失败')
      }

      return mapGoalRow(row as Record<string, unknown>)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建目标失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function toggleGoalComplete(goal: Goal, userId: string, completed: boolean) {
    loading.value = true
    error.value = null

    const now = Date.now()

    try {
      const { error: updateError } = await rdb
        .from('goals')
        .update({
          completed,
          completed_at: completed ? now : null,
          updated_at: now,
        })
        .eq('id', goal.id)
        .eq('user_id', userId)

      if (updateError) {
        throw new Error(getErrorMessage(updateError, '更新目标失败'))
      }

      return {
        ...goal,
        completed,
        completed_at: completed ? now : null,
        updated_at: now,
      } satisfies Goal
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新目标失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteGoal(goalId: number, userId: string) {
    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await rdb
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId)

      if (deleteError) {
        throw new Error(getErrorMessage(deleteError, '删除目标失败'))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除目标失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function getOverdueGoals(goals: Goal[], today = todayLocal()) {
    return goals.filter((goal) => isGoalOverdue(goal, today))
  }

  return {
    loading,
    error,
    fetchGoals,
    createGoal,
    toggleGoalComplete,
    deleteGoal,
    getOverdueGoals,
  }
}

export type { Goal, GoalInsert, GoalPeriod }
