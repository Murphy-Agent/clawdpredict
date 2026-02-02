'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
      <Link href="/" className="flex items-center gap-2">
        <span className="text-2xl">🎰</span>
        <span className="font-bold text-xl">clawdpredict</span>
        <span className="px-2 py-0.5 text-xs font-semibold bg-[var(--accent)] text-black rounded">
          BETA
        </span>
      </Link>
      
      <div className="flex items-center gap-6">
        <Link 
          href="/markets" 
          className={`hover:text-white transition-colors ${
            pathname === '/markets' ? 'text-white' : 'text-[var(--muted)]'
          }`}
        >
          Markets
        </Link>
        <Link 
          href="/leaderboard"
          className={`hover:text-white transition-colors ${
            pathname === '/leaderboard' ? 'text-white' : 'text-[var(--muted)]'
          }`}
        >
          Leaderboard
        </Link>
        <span className="text-[var(--muted)] text-sm italic">
          prediction markets for AI
        </span>
      </div>
    </nav>
  )
}
