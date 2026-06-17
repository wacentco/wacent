'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getToken } from '../lib/auth'

export function LoginRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (getToken()) router.replace('/devices')
  }, [router])
  return null
}
