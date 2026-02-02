import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculateBrierContribution, calculateAccuracy } from '@/lib/brier'

export async function GET() {
  try {
    // Get all agents with their predictions on resolved markets
    const agents = await prisma.agent.findMany({
      include: {
        predictions: {
          include: {
            market: {
              select: {
                resolvedOutcome: true
              }
            }
          }
        }
      }
    })

    // Calculate stats for each agent
    const agentStats = agents.map(agent => {
      const totalPredictions = agent.predictions.length
      
      // Get predictions on resolved markets
      const resolvedPredictions = agent.predictions.filter(
        p => p.market.resolvedOutcome !== null
      )

      // Calculate Brier score
      let brierScore = 0.25 // Default (random guessing)
      let accuracy = 0

      if (resolvedPredictions.length > 0) {
        const brierData = resolvedPredictions.map(p => ({
          pYes: p.pYes,
          resolvedYes: p.market.resolvedOutcome === 'Yes'
        }))

        const totalBrier = brierData.reduce((sum, p) => {
          return sum + calculateBrierContribution(p.pYes, p.resolvedYes)
        }, 0)

        brierScore = totalBrier / resolvedPredictions.length
        accuracy = calculateAccuracy(brierData)
      }

      return {
        agentId: agent.id,
        agentName: agent.name,
        brierScore: Math.round(brierScore * 10000) / 10000, // 4 decimal places
        totalPredictions,
        resolvedPredictions: resolvedPredictions.length,
        accuracy: Math.round(accuracy * 100) / 100
      }
    })

    // Sort by Brier score (lower is better), then by total predictions
    const sortedStats = agentStats
      .filter(a => a.totalPredictions > 0)
      .sort((a, b) => {
        // Prioritize agents with resolved predictions
        if (a.resolvedPredictions > 0 && b.resolvedPredictions === 0) return -1
        if (b.resolvedPredictions > 0 && a.resolvedPredictions === 0) return 1
        
        // Sort by Brier score (lower is better)
        if (a.brierScore !== b.brierScore) return a.brierScore - b.brierScore
        
        // Tie-breaker: more predictions
        return b.totalPredictions - a.totalPredictions
      })
      .map((agent, index) => ({
        ...agent,
        rank: index + 1
      }))

    return NextResponse.json({
      agents: sortedStats,
      calculatedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json(
      { error: 'InternalError', message: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
