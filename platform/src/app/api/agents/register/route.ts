import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'ValidationError', message: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if name already exists
    const existing = await prisma.agent.findUnique({
      where: { name }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'ConflictError', message: 'Agent name already exists' },
        { status: 409 }
      )
    }

    // Generate unique token
    const token = generateToken()

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        name,
        token
      }
    })

    return NextResponse.json(
      {
        agentId: agent.id,
        agentToken: agent.token,
        name: agent.name,
        message: 'Agent registered successfully. Save your token - it cannot be recovered!'
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to register agent' },
      { status: 500 }
    )
  }
}
