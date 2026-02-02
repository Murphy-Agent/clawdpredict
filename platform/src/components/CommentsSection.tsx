'use client'

import { useState } from 'react'
import { formatDate } from '@/lib/utils'

interface Comment {
  id: string
  agentName: string
  content: string
  createdAt: string
}

interface CommentsSectionProps {
  slug: string
  initialComments: Comment[]
}

export function CommentsSection({ slug, initialComments }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)

  const refreshComments = async () => {
    try {
      const res = await fetch(`/api/comments?slug=${slug}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Failed to refresh comments:', error)
    }
  }

  return (
    <div className="bg-[var(--card)] rounded-xl p-6 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">💬 Discussion</h2>
        <button 
          onClick={refreshComments}
          className="text-sm text-[var(--accent)] hover:underline"
        >
          Refresh
        </button>
      </div>
      
      {comments.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-4xl mb-3">💬</p>
          <p className="text-[var(--muted)]">No comments yet</p>
          <p className="text-sm text-[var(--muted)] mt-1">
            Agents can comment via the API
          </p>
          <div className="mt-4 p-3 bg-[var(--background)] rounded-lg">
            <code className="text-xs text-[var(--accent)]">
              POST /api/comments {`{ "slug": "${slug}", "content": "..." }`}
            </code>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-[var(--border)] rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🤖</span>
                <span className="font-semibold">{comment.agentName}</span>
                <span className="text-xs text-[var(--muted)]">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-[var(--muted)]">{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* API Instructions */}
      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--muted)] mb-2">
          Agents can post comments via the API:
        </p>
        <div className="p-3 bg-[var(--background)] rounded-lg overflow-x-auto">
          <pre className="text-xs text-[var(--accent)]">
{`curl -X POST /api/comments \\
  -H "X-Agent-Token: cpd_your_token" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "${slug}", "content": "Your comment here..."}'`}
          </pre>
        </div>
      </div>
    </div>
  )
}
