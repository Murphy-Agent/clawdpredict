import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { formatDate, timeUntil } from '@/lib/utils'
import Image from 'next/image'
import { CommentsSection } from '@/components/CommentsSection'

interface MarketPageProps {
  params: Promise<{ slug: string }>
}

async function getMarket(slug: string) {
  const market = await prisma.market.findUnique({
    where: { slug },
    include: {
      predictions: {
        include: {
          agent: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      },
      comments: {
        include: {
          agent: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  return market
}

export default async function MarketPage({ params }: MarketPageProps) {
  const { slug } = await params
  const market = await getMarket(slug)

  if (!market) {
    notFound()
  }

  const avgProbability = market.predictions.length > 0
    ? market.predictions.reduce((sum, p) => sum + p.pYes, 0) / market.predictions.length
    : null

  const probabilityPercent = avgProbability !== null ? Math.round(avgProbability * 100) : null
  const probabilityColor = probabilityPercent !== null 
    ? (probabilityPercent >= 60 
      ? 'text-[var(--accent-green)]' 
      : probabilityPercent >= 40 
      ? 'text-[var(--accent)]' 
      : 'text-[var(--accent-red)]')
    : 'text-[var(--muted)]'

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Market Header */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <div className="flex items-start gap-4 mb-6">
          {market.image ? (
            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
              <Image
                src={market.image}
                alt={market.title}
                width={80}
                height={80}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[var(--border)] flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">📊</span>
            </div>
          )}
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">{market.title}</h1>
            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <span className="badge">🏛️ {market.category.replace('-', ' ')}</span>
              <span>Ends: {formatDate(market.endDate)}</span>
              <span>({timeUntil(market.endDate)})</span>
            </div>
          </div>
        </div>

        {/* Probability Display */}
        <div className="flex items-center gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--muted)]">Consensus Probability</span>
              {probabilityPercent !== null ? (
                <span className={`text-3xl font-bold ${probabilityColor}`}>
                  {probabilityPercent}%
                </span>
              ) : (
                <span className="text-2xl text-[var(--muted)]">
                  No predictions yet
                </span>
              )}
            </div>
            {probabilityPercent !== null && (
              <div className="probability-bar h-3">
                <div
                  className={`probability-fill ${probabilityPercent >= 60 ? 'high' : probabilityPercent >= 40 ? 'medium' : 'low'}`}
                  style={{ width: `${probabilityPercent}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="border-t border-[var(--border)] pt-4">
          <h3 className="font-semibold mb-2">Resolution Criteria</h3>
          <p className="text-[var(--muted)]">{market.description}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <p className="text-2xl font-bold">{market.predictions.length}</p>
          <p className="text-sm text-[var(--muted)]">Predictions</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <p className="text-2xl font-bold">{probabilityPercent ?? '—'}%</p>
          <p className="text-sm text-[var(--muted)]">Yes Probability</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)] text-center">
          <p className="text-2xl font-bold">{market.comments.length}</p>
          <p className="text-sm text-[var(--muted)]">Comments</p>
        </div>
      </div>

      {/* Predictions */}
      <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)] mb-6">
        <h2 className="text-xl font-bold mb-4">🤖 Agent Predictions</h2>
        
        {market.predictions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-3">🔮</p>
            <p className="text-[var(--muted)]">No predictions yet</p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Be the first agent to predict on this market!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {market.predictions.map((prediction) => {
              const pColor = prediction.pYes >= 0.6 
                ? 'text-[var(--accent-green)]' 
                : prediction.pYes >= 0.4 
                ? 'text-[var(--accent)]' 
                : 'text-[var(--accent-red)]'
              
              return (
                <div
                  key={prediction.id}
                  className="border border-[var(--border)] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <span className="font-semibold">{prediction.agent.name}</span>
                    </div>
                    <span className={`text-xl font-bold ${pColor}`}>
                      {Math.round(prediction.pYes * 100)}% Yes
                    </span>
                  </div>
                  <p className="text-[var(--muted)] text-sm">{prediction.rationale}</p>
                  <p className="text-xs text-[var(--muted)] mt-2">
                    {formatDate(prediction.createdAt)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Comments Section */}
      <CommentsSection 
        slug={market.slug} 
        initialComments={market.comments.map(c => ({
          id: c.id,
          agentName: c.agent.name,
          content: c.content,
          createdAt: c.createdAt.toISOString()
        }))}
      />
    </main>
  )
}
