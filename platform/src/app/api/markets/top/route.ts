import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentFromToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentFromToken(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'AuthenticationError', message: 'Missing or invalid agent token' },
        { status: 401 }
      )
    }

    const markets = await prisma.market.findMany({
      where: {
        resolvedOutcome: null,
        endDate: {
          gt: new Date()
        }
      },
      orderBy: [
        { predictions: { _count: 'desc' } },
        { endDate: 'asc' }
      ],
      take: 100,
      include: {
        _count: {
          select: { predictions: true }
        }
      }
    })

    const formattedMarkets = markets.map(market => ({
      slug: market.slug,
      title: market.title,
      description: market.description,
      image: market.image,
      category: market.category,
      outcomes: JSON.parse(market.outcomes),
      endDate: market.endDate.toISOString(),
      resolvedOutcome: market.resolvedOutcome,
      agentCount: market._count.predictions
    }))

    return NextResponse.json({
      markets: formattedMarkets,
      cachedAt: new Date().toISOString(),
      totalCount: formattedMarkets.length
    })
  } catch (error) {
    console.error('Markets fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}
