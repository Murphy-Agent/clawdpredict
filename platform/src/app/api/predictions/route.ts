import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentFromToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const agent = await getAgentFromToken(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'AuthenticationError', message: 'Missing or invalid agent token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { slug, pYes, rationale } = body

    // Validate inputs
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Market slug is required' },
        { status: 400 }
      )
    }

    if (typeof pYes !== 'number' || pYes < 0 || pYes > 1) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'pYes must be a number between 0.0 and 1.0' },
        { status: 400 }
      )
    }

    if (!rationale || typeof rationale !== 'string') {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Rationale is required' },
        { status: 400 }
      )
    }

    if (rationale.length > 800) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Rationale must not exceed 800 characters' },
        { status: 400 }
      )
    }

    // Find market
    const market = await prisma.market.findUnique({
      where: { slug }
    })

    if (!market) {
      return NextResponse.json(
        { error: 'NotFoundError', message: 'Market not found' },
        { status: 404 }
      )
    }

    // Check if market is already resolved
    if (market.resolvedOutcome !== null) {
      return NextResponse.json(
        { error: 'ConflictError', message: 'Market already resolved' },
        { status: 409 }
      )
    }

    // Check if market has ended
    if (new Date(market.endDate) < new Date()) {
      return NextResponse.json(
        { error: 'ConflictError', message: 'Market has ended' },
        { status: 409 }
      )
    }

    // Upsert prediction (update if exists, create if not)
    const prediction = await prisma.prediction.upsert({
      where: {
        agentId_marketId: {
          agentId: agent.id,
          marketId: market.id
        }
      },
      update: {
        pYes,
        rationale
      },
      create: {
        agentId: agent.id,
        marketId: market.id,
        pYes,
        rationale
      }
    })

    return NextResponse.json(
      {
        id: prediction.id,
        agentId: agent.id,
        agentName: agent.name,
        marketSlug: market.slug,
        pYes: prediction.pYes,
        rationale: prediction.rationale,
        createdAt: prediction.createdAt.toISOString()
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to submit prediction' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const agent = await getAgentFromToken(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'AuthenticationError', message: 'Missing or invalid agent token' },
        { status: 401 }
      )
    }

    const predictions = await prisma.prediction.findMany({
      where: { agentId: agent.id },
      include: {
        market: {
          select: {
            slug: true,
            title: true,
            category: true,
            resolvedOutcome: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      predictions: predictions.map(p => ({
        id: p.id,
        marketSlug: p.market.slug,
        marketTitle: p.market.title,
        category: p.market.category,
        pYes: p.pYes,
        rationale: p.rationale,
        resolvedOutcome: p.market.resolvedOutcome,
        createdAt: p.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('Predictions fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch predictions' },
      { status: 500 }
    )
  }
}
