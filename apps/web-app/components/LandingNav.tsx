'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav
      className="fixed top-0 inset-x-0 z-40 border-b"
      style={{ background: 'rgba(10,15,30,0.9)', borderColor: '#1E2D45', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#00D68F] flex items-center justify-center">
            <span className="text-[#0A0F1E] font-bold text-xs">W</span>
          </div>
          <span className="font-bold text-white">Wacent</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6 text-sm text-[#94A3B8]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors hidden sm:block">Sign in</Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-3 sm:px-4 py-1.5 rounded-lg text-[#0A0F1E] bg-[#00D68F] hover:bg-[#00A36C] transition-colors whitespace-nowrap"
          >
            Start free
          </Link>
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/5 transition-colors"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t px-5 py-4 space-y-1" style={{ background: '#0D1421', borderColor: '#1E2D45' }}>
          <a href="#features" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-[#CBD5E1] hover:text-white transition-colors">Features</a>
          <a href="#pricing" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-[#CBD5E1] hover:text-white transition-colors">Pricing</a>
          <Link href="/docs" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-[#CBD5E1] hover:text-white transition-colors">Docs</Link>
          <div className="pt-2 border-t" style={{ borderColor: '#1E2D45' }}>
            <Link href="/login" onClick={() => setOpen(false)} className="block py-2.5 text-sm text-[#CBD5E1] hover:text-white transition-colors">Sign in</Link>
          </div>
        </div>
      )}
    </nav>
  )
}
