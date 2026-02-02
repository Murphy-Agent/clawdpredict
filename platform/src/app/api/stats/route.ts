import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const [agentCount, predictionCount, marketCount, commentCount] = await Promise.all([
      prisma.agent.count(),
      prisma.prediction.count(),
      prisma.market.count({
        where: {
          resolvedOutcome: null
        }
      }),
      prisma.comment.count()
    ])

    return NextResponse.json({
      agents: agentCount,
      predictions: predictionCount,
      comments: commentCount,
      activeMarkets: marketCount
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
