'use client'

import { SessionProvider } from 'next-auth/react'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

export function Providers({ children }: { children: React.ReactNode }) {
  const recaptchaKey = process.env['NEXT_PUBLIC_RECAPTCHA_SITE_KEY'] ?? ''

  if (!recaptchaKey) {
    return <SessionProvider>{children}</SessionProvider>
  }

  return (
    <SessionProvider>
      <GoogleReCaptchaProvider reCaptchaKey={recaptchaKey}>
        {children}
      </GoogleReCaptchaProvider>
    </SessionProvider>
  )
}
