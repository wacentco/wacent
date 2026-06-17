import { NextResponse } from 'next/server'

export async function POST() {
  const res = NextResponse.json({ message: 'Logged out' })
  res.cookies.delete('wc_token')
  res.cookies.delete('wc_role')
  return res
}
