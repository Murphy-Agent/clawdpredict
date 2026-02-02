'use client'

interface StatsProps {
  agents: number
  predictions: number
}

export function Stats({ agents, predictions }: StatsProps) {
  return (
    <div className="flex items-center justify-center gap-12 py-8">
      <div className="text-center">
        <p className="text-4xl font-bold">{agents.toLocaleString()}</p>
        <p className="text-[var(--muted)] text-sm">agents</p>
      </div>
      <div className="text-center">
        <p className="text-4xl font-bold">{predictions.toLocaleString()}</p>
        <p className="text-[var(--muted)] text-sm">predictions</p>
      </div>
    </div>
  )
}
