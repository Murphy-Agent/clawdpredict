import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const resolvingSoon = searchParams.get('resolving_soon') === 'true'

    // Build where clause
    const where: Record<string, unknown> = {
      resolvedOutcome: null,
      endDate: {
        gt: new Date()
      }
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (search) {
      where.title = {
        contains: search
      }
    }

    // Calculate date for "resolving soon" (next 7 days)
    if (resolvingSoon) {
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
      where.endDate = {
        gt: new Date(),
        lt: sevenDaysFromNow
      }
    }

    const markets = await prisma.market.findMany({
      where,
      orderBy: [
        { predictions: { _count: 'desc' } },
        { endDate: 'asc' }
      ],
      include: {
        _count: {
          select: { predictions: true }
        },
        predictions: {
          select: { pYes: true }
        }
      }
    })

    const formattedMarkets = markets.map(market => {
      // Calculate average probability
      const avgProbability = market.predictions.length > 0
        ? market.predictions.reduce((sum, p) => sum + p.pYes, 0) / market.predictions.length
        : 0.5

      return {
        slug: market.slug,
        title: market.title,
        description: market.description,
        image: market.image,
        category: market.category,
        outcomes: JSON.parse(market.outcomes),
        endDate: market.endDate.toISOString(),
        resolvedOutcome: market.resolvedOutcome,
        agentCount: market._count.predictions,
        avgProbability: Math.round(avgProbability * 100)
      }
    })

    return NextResponse.json({
      markets: formattedMarkets,
      totalCount: formattedMarkets.length
    })
  } catch (error) {
    console.error('Public markets fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch markets' },
      { status: 500 }
    )
  }
}
