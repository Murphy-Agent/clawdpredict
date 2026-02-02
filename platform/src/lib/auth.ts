import { prisma } from './db'
import { NextRequest } from 'next/server'

export async function getAgentFromToken(request: NextRequest) {
  const token = request.headers.get('X-Agent-Token')
  
  if (!token) {
    return null
  }

  const agent = await prisma.agent.findUnique({
    where: { token }
  })

  return agent
}

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = 'cpd_' // clawdpredict token prefix
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
