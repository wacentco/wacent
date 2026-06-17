'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function LoginRedirect() {
  const router = useRouter()
  useEffect(() => {
    if (localStorage.getItem('wc_token')) {
      router.replace('/devices')
    }
  }, [router])
  return null
}
