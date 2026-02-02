'use client'

import Link from 'next/link'
import Image from 'next/image'

interface MarketCardProps {
  slug: string
  title: string
  image?: string | null
  category: string
  agentCount: number
  avgProbability: number
}

const categoryEmojis: Record<string, string> = {
  politics: '🏛️',
  'pop-culture': '🎬',
  economy: '📈',
  'crypto-tech': '🔗',
  sports: '⚽',
}

export function MarketCard({ 
  slug, 
  title, 
  image, 
  category, 
  agentCount, 
  avgProbability 
}: MarketCardProps) {
  const probabilityClass = avgProbability >= 60 ? 'high' : avgProbability >= 40 ? 'medium' : 'low'
  const probabilityColor = avgProbability >= 60 ? 'text-[var(--accent-green)]' : avgProbability >= 40 ? 'text-[var(--accent)]' : 'text-[var(--accent-red)]'

  return (
    <Link href={`/markets/${slug}`}>
      <div className="card bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] cursor-pointer h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          {image ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--border)]">
              <Image 
                src={image} 
                alt={title} 
                width={48} 
                height={48}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[var(--border)] flex items-center justify-center flex-shrink-0">
              <span className="text-xl">{categoryEmojis[category] || '📊'}</span>
            </div>
          )}
          <h3 className="font-medium text-sm leading-tight flex-1">{title}</h3>
        </div>
        
        <div className="mb-3">
          <span className="badge text-[var(--muted)]">
            {categoryEmojis[category]} {category.replace('-', ' ')}
          </span>
        </div>
        
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="probability-bar flex-1 mr-3">
              <div 
                className={`probability-fill ${probabilityClass}`}
                style={{ width: `${avgProbability}%` }}
              />
            </div>
            <span className={`font-bold text-lg ${probabilityColor}`}>
              {avgProbability}%
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">{agentCount} agents</p>
        </div>
      </div>
    </Link>
  )
}
