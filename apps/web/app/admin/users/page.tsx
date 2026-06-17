'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, UserX, UserCheck } from 'lucide-react'
import { PlanBadge } from '../../../components/ui/PlanBadge'
import { API_URL } from '../../../lib/config'

interface UserRow {
  id: string
  name: string
  email: string
  role: string
  planId: string | null
  createdAt: string
  lastLoginAt: string | null
  suspendedAt: string | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page] = useState(1)

  const getToken = useCallback(() => {
    const t = localStorage.getItem('wc_token')
    if (!t) router.push('/login')
    return t
  }, [router])

  const loadUsers = useCallback(async () => {
    const token = getToken()
    if (!token) return
    const params = new URLSearchParams({ page: String(page), limit: '20', ...(search ? { search } : {}) })
    const res = await fetch(`${API_URL}/admin/users?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 403) { router.push('/overview'); return }
    const json = await res.json() as { data: UserRow[] }
    setUsers(json.data ?? [])
    setLoading(false)
  }, [getToken, page, router, search])

  useEffect(() => { void loadUsers() }, [loadUsers])

  async function suspend(id: string) {
    const reason = prompt('Suspension reason?')
    if (!reason) return
    const token = getToken()
    if (!token) return
    await fetch(`${API_URL}/admin/users/${id}/suspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    void loadUsers()
  }

  async function unsuspend(id: string) {
    const token = getToken()
    if (!token) return
    await fetch(`${API_URL}/admin/users/${id}/unsuspend`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    void loadUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-sm text-text-secondary mt-1">{users.length} users</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void loadUsers() }}
            placeholder="Search users…"
            className="pl-9 pr-3 py-2 rounded-lg text-sm text-text-primary placeholder-text-muted bg-surface border border-border focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-danger border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
          <table className="w-full text-sm">
            <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
              <tr className="text-left text-xs text-text-muted border-b" style={{ borderColor: '#1E2D45' }}>
                <th className="px-4 py-3">Name / Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b last:border-0 hover:bg-white/2" style={{ borderColor: '#1E2D45' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{user.name}</p>
                    <p className="text-xs text-text-muted">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {user.planId ? <PlanBadge plan="starter" /> : <span className="text-xs text-text-muted">None</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium capitalize ${user.role === 'admin' ? 'text-danger' : 'text-text-muted'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${user.suspendedAt ? 'text-danger' : 'text-primary'}`}>
                      {user.suspendedAt ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {user.suspendedAt ? (
                      <button
                        onClick={() => void unsuspend(user.id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark"
                      >
                        <UserCheck className="w-3.5 h-3.5" /> Unsuspend
                      </button>
                    ) : (
                      <button
                        onClick={() => void suspend(user.id)}
                        className="flex items-center gap-1 text-xs text-danger hover:text-danger/80"
                      >
                        <UserX className="w-3.5 h-3.5" /> Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
