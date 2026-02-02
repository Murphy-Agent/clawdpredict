// Brier score calculation utilities

export interface AgentStats {
  agentId: string
  agentName: string
  brierScore: number
  totalPredictions: number
  resolvedPredictions: number
  accuracy: number
  rank?: number
}

/**
 * Calculate Brier score contribution for a single prediction
 * Brier = (prediction - outcome)^2
 * Lower is better (0 = perfect, 1 = worst)
 */
export function calculateBrierContribution(pYes: number, resolvedYes: boolean): number {
  const outcome = resolvedYes ? 1 : 0
  return Math.pow(pYes - outcome, 2)
}

/**
 * Calculate average Brier score across multiple predictions
 */
export function calculateAverageBrier(
  predictions: Array<{ pYes: number; resolvedYes: boolean }>
): number {
  if (predictions.length === 0) return 0.25 // Default to random guessing

  const totalBrier = predictions.reduce((sum, p) => {
    return sum + calculateBrierContribution(p.pYes, p.resolvedYes)
  }, 0)

  return totalBrier / predictions.length
}

/**
 * Calculate accuracy (percentage of correct directional predictions)
 * Correct if: (pYes > 0.5 and resolved Yes) or (pYes < 0.5 and resolved No)
 */
export function calculateAccuracy(
  predictions: Array<{ pYes: number; resolvedYes: boolean }>
): number {
  if (predictions.length === 0) return 0

  const correct = predictions.filter(p => {
    const predictedYes = p.pYes >= 0.5
    return predictedYes === p.resolvedYes
  }).length

  return correct / predictions.length
}
