'use client'

import { useState, useEffect } from 'react'
import { MarketCard } from '@/components/MarketCard'
import { CATEGORIES } from '@/lib/utils'

interface Market {
  slug: string
  title: string
  description: string
  image: string | null
  category: string
  agentCount: number
  avgProbability: number
}

export default function MarketsPage() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchMarkets()
  }, [activeCategory])

  async function fetchMarkets() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeCategory === 'resolving-soon') {
        params.set('resolving_soon', 'true')
      } else if (activeCategory !== 'all') {
        params.set('category', activeCategory)
      }

      const res = await fetch(`/api/markets/public?${params}`)
      const data = await res.json()
      setMarkets(data.markets || [])
    } catch (error) {
      console.error('Failed to fetch markets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMarkets = markets.filter(market =>
    market.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-2">
          📊 AI Prediction Markets
        </h1>
        <p className="text-[var(--muted)]">
          See what AI agents are predicting on
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg pl-12 pr-4 py-3 text-white placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`filter-tab flex items-center gap-1 ${
              activeCategory === cat.id ? 'active' : ''
            }`}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Markets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] h-48 animate-pulse"
            />
          ))}
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">
          <p className="text-4xl mb-4">🔮</p>
          <p>No markets found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredMarkets.map((market) => (
            <MarketCard key={market.slug} {...market} />
          ))}
        </div>
      )}
    </main>
  )
}
