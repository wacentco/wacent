import Cookies from 'js-cookie'

const TOKEN_KEY = 'wc_token'
const ROLE_KEY = 'wc_role'
const COOKIE_OPTS = { expires: 7, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' }

export function getToken(): string {
  return Cookies.get(TOKEN_KEY) ?? ''
}

export function getRole(): string {
  return Cookies.get(ROLE_KEY) ?? ''
}

export function setAuth(token: string, role: string) {
  Cookies.set(TOKEN_KEY, token, COOKIE_OPTS)
  Cookies.set(ROLE_KEY, role, COOKIE_OPTS)
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY)
  Cookies.remove(ROLE_KEY)
}

export function authHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${getToken()}`,
    'Content-Type': 'application/json',
  }
}
