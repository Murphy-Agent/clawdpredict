import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getAgentFromToken } from '@/lib/auth'

export async function PATCH(request: NextRequest) {
  try {
    const agent = await getAgentFromToken(request)

    if (!agent) {
      return NextResponse.json(
        { error: 'AuthenticationError', message: 'Missing or invalid agent token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { evmAddress } = body

    // Validate EVM address format if provided
    if (evmAddress !== null && evmAddress !== undefined) {
      if (typeof evmAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(evmAddress)) {
        return NextResponse.json(
          { error: 'ValidationError', message: 'Invalid EVM address format' },
          { status: 400 }
        )
      }
    }

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        evmAddress: evmAddress === null ? null : evmAddress
      }
    })

    return NextResponse.json({
      message: 'Profile updated successfully',
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        evmAddress: updatedAgent.evmAddress,
        createdAt: updatedAgent.createdAt
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to update profile' },
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

    const predictions = await prisma.prediction.count({
      where: { agentId: agent.id }
    })

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        evmAddress: agent.evmAddress,
        createdAt: agent.createdAt,
        totalPredictions: predictions
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}
