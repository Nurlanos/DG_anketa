// api/_leads.js — shared lead-priority scoring, used by both the dashboard
// (rows.js) and the stale-leads digest cron job.

const MS_HOUR = 60 * 60 * 1000
const NEW_LEAD_SLA_HOURS = 4

export function hoursSince(iso) {
  if (!iso) return null
  return (Date.now() - new Date(iso).getTime()) / MS_HOUR
}

export function scoreLead(status, hoursSinceLastTouch, budget) {
  const days =
    hoursSinceLastTouch === null ? null : Math.floor(hoursSinceLastTouch / 24)

  if (status === 'Отказ' || status === 'Архив') {
    return { priority: null, days, nextAction: '' }
  }
  if (status === 'Новое') {
    return hoursSinceLastTouch > NEW_LEAD_SLA_HOURS
      ? {
          priority: 'Высокий',
          days,
          nextAction: '⚠️ SLA нарушен — связаться немедленно',
        }
      : {
          priority: 'Высокий',
          days,
          nextAction: `Связаться с клиентом (SLA ≤ ${NEW_LEAD_SLA_HOURS} раб. часа)`,
        }
  }
  if (status === 'КП в работе') {
    return days > 14
      ? {
          priority: 'Высокий',
          days,
          nextAction: 'Просрочено — отправить КП немедленно или закрыть лид',
        }
      : {
          priority: 'Средний',
          days,
          nextAction: 'Завершить подготовку и отправить КП',
        }
  }
  if (status === 'КП отправлено') {
    if (budget === 'Согласован')
      return {
        priority: 'Высокий',
        days,
        nextAction: 'Бюджет согласован — срочно дожать до подписания',
      }
    if (days > 45)
      return {
        priority: 'Высокий',
        days,
        nextAction:
          'Риск потери — реанимировать контакт или закрыть как неактивный',
      }
    if (days >= 15)
      return {
        priority: 'Средний',
        days,
        nextAction: 'Follow-up: уточнить статус рассмотрения',
      }
    return {
      priority: 'Низкий',
      days,
      nextAction: 'Рано для повторного контакта',
    }
  }
  return { priority: null, days, nextAction: '' }
}
