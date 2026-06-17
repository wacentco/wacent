/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

const nextAuth = NextAuth({
  providers: [
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account?.id_token) {
        token['googleIdToken'] = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      if (token['googleIdToken']) {
        (session as { googleIdToken?: string }).googleIdToken = token['googleIdToken'] as string
      }
      return session
    },
  },
})

export const handlers = nextAuth.handlers
export const signIn: any = nextAuth.signIn
export const signOut: any = nextAuth.signOut
export const auth: any = nextAuth.auth
