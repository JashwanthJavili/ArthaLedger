import { useCallback, useEffect, useState } from 'react'
import { onValue, ref, set } from 'firebase/database'
import { db } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

/**
 * useBudgets — syncs category budget configs with Firebase.
 *
 * Schema at:  users/{uid}/budgets  →
 *   {
 *     [categoryName]: {
 *       soft:   number,   // monthly budget goal  (e.g. 5000)
 *       hard:   number,   // hard limit — must not exceed (e.g. 6000), 0 = none
 *       warnAt: number,   // % of soft at which to warn  (default 80)
 *     }
 *   }
 *
 * Backward-compat: plain numbers stored by the old schema are auto-migrated
 * to { soft: n, hard: 0, warnAt: 80 }.
 */

function normalise(raw) {
  if (!raw || typeof raw !== 'object') return {}
  const out = {}
  for (const [cat, val] of Object.entries(raw)) {
    if (typeof val === 'number') {
      out[cat] = { soft: val, hard: 0, warnAt: 80 }
    } else if (val && typeof val === 'object') {
      out[cat] = {
        soft:   Number(val.soft   || 0),
        hard:   Number(val.hard   || 0),
        warnAt: Number(val.warnAt ?? 80),
      }
    }
  }
  return out
}

export function useBudgets() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) { setBudgets({}); setLoading(false); return }
    const budgetsRef = ref(db, `users/${user.uid}/budgets`)
    const unsub = onValue(budgetsRef, (snap) => {
      setBudgets(normalise(snap.val()))
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [user?.uid])

  /**
   * setBudget(category, { soft, hard, warnAt })
   * Pass null / 0 soft to delete the budget for that category.
   */
  const setBudget = useCallback(async (category, config) => {
    if (!user?.uid) return
    const next = { ...budgets }
    const soft = Number(config?.soft || 0)
    if (!soft || soft <= 0) {
      delete next[category]
    } else {
      next[category] = {
        soft,
        hard:   Number(config?.hard   || 0),
        warnAt: Number(config?.warnAt ?? 80),
      }
    }
    setBudgets(next)
    await set(ref(db, `users/${user.uid}/budgets`), next)
  }, [user?.uid, budgets])

  return { budgets, setBudget, loading }
}
