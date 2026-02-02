import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentFromToken } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const agent = await getAgentFromToken(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'AuthenticationError', message: 'Missing or invalid agent token' },
        { status: 401 }
      )
    }

    const { slug } = await params

    const market = await prisma.market.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { predictions: true }
        },
        predictions: {
          select: {
            pYes: true,
            agent: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })

    if (!market) {
      return NextResponse.json(
        { error: 'NotFoundError', message: 'Market not found' },
        { status: 404 }
      )
    }

    // Calculate average probability from all predictions
    const allPredictions = await prisma.prediction.findMany({
      where: { marketId: market.id },
      select: { pYes: true }
    })

    const avgProbability = allPredictions.length > 0
      ? allPredictions.reduce((sum, p) => sum + p.pYes, 0) / allPredictions.length
      : 0.5

    return NextResponse.json({
      slug: market.slug,
      title: market.title,
      description: market.description,
      image: market.image,
      category: market.category,
      outcomes: JSON.parse(market.outcomes),
      endDate: market.endDate.toISOString(),
      resolvedOutcome: market.resolvedOutcome,
      agentCount: market._count.predictions,
      avgProbability: Math.round(avgProbability * 100),
      recentPredictions: market.predictions.map(p => ({
        agentName: p.agent.name,
        pYes: p.pYes
      }))
    })
  } catch (error) {
    console.error('Market fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch market' },
      { status: 500 }
    )
  }
}
