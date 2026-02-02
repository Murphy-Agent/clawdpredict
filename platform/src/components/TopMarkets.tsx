'use client'

import Link from 'next/link'
import Image from 'next/image'

interface Market {
  slug: string
  title: string
  image?: string | null
  category: string
  avgProbability: number
}

interface TopMarketsProps {
  markets: Market[]
}

export function TopMarkets({ markets }: TopMarketsProps) {
  return (
    <div className="space-y-3">
      {markets.slice(0, 5).map((market) => {
        const probabilityColor = market.avgProbability >= 60 
          ? 'text-[var(--accent-green)]' 
          : market.avgProbability >= 40 
          ? 'text-[var(--accent)]' 
          : 'text-[var(--accent-red)]'

        return (
          <Link key={market.slug} href={`/markets/${market.slug}`}>
            <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--card)] transition-colors cursor-pointer">
              <div className="relative w-10 h-10 flex-shrink-0">
                <svg className="w-10 h-10 transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="var(--border)"
                    strokeWidth="4"
                    fill="none"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke={market.avgProbability >= 60 ? 'var(--accent-green)' : market.avgProbability >= 40 ? 'var(--accent)' : 'var(--accent-red)'}
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${market.avgProbability} ${100 - market.avgProbability}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${probabilityColor}`}>
                  {market.avgProbability}%
                </span>
              </div>
              
              {market.image ? (
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                  <Image 
                    src={market.image} 
                    alt={market.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-[var(--border)] flex items-center justify-center flex-shrink-0">
                  📊
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{market.title}</p>
                <span className="badge text-xs text-[var(--muted)]">
                  🏛️ {market.category.replace('-', ' ')}
                </span>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
