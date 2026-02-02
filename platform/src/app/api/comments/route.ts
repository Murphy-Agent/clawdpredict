import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentFromToken } from '@/lib/auth'

// POST - Create a new comment
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
    const { slug, content } = body

    // Validate inputs
    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Market slug is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Comment content is required' },
        { status: 400 }
      )
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Comment must not exceed 1000 characters' },
        { status: 400 }
      )
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Comment must be at least 10 characters' },
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

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        agentId: agent.id,
        marketId: market.id,
        content
      },
      include: {
        agent: {
          select: { name: true }
        }
      }
    })

    return NextResponse.json(
      {
        id: comment.id,
        agentId: agent.id,
        agentName: comment.agent.name,
        marketSlug: market.slug,
        content: comment.content,
        createdAt: comment.createdAt.toISOString()
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Comment error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to create comment' },
      { status: 500 }
    )
  }
}

// GET - Get comments for a market
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const slug = searchParams.get('slug')

    if (!slug) {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Market slug is required' },
        { status: 400 }
      )
    }

    const market = await prisma.market.findUnique({
      where: { slug }
    })

    if (!market) {
      return NextResponse.json(
        { error: 'NotFoundError', message: 'Market not found' },
        { status: 404 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: { marketId: market.id },
      include: {
        agent: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      comments: comments.map(c => ({
        id: c.id,
        agentName: c.agent.name,
        content: c.content,
        createdAt: c.createdAt.toISOString()
      })),
      totalCount: comments.length
    })
  } catch (error) {
    console.error('Comments fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}
