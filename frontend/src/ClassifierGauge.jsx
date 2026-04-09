import { useState, useEffect } from 'react'
import { getClassifierStats } from './api'

export function ClassifierGauge({ refreshTrigger }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])  // re-fetch when parent increments refreshTrigger

  const loadStats = async () => {
    setLoading(true)
    try {
      const res = await getClassifierStats()
      setStats(res.data)
    } catch (err) {
      console.error('Failed to load classifier stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !stats) return null
  if (stats.total_classified === 0) return null

  const accuracy = stats.accuracy_score  // 0-100 float
  const trainingCount = stats.training_examples

  // Color the bar: green >90, yellow 70-90, red <70
  const barColor =
    accuracy >= 90 ? 'bg-green-500'
    : accuracy >= 70 ? 'bg-yellow-500'
    : 'bg-red-500'

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {/* Training counter */}
      <span
        className="flex items-center gap-1 px-2 py-0.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-full font-medium"
        title="Number of user-submitted training examples active"
      >
        {trainingCount} training {trainingCount === 1 ? 'example' : 'examples'}
      </span>

      {/* Accuracy bar */}
      <div className="flex items-center gap-2">
        <span className="text-gray-500 whitespace-nowrap">Accuracy</span>
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${accuracy}%` }}
          />
        </div>
        <span className="font-medium text-gray-700 w-10 text-right">
          {accuracy.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
