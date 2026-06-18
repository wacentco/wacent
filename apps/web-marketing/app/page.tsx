import { Code2, Megaphone, Flame, Zap, ImageIcon, Smartphone, QrCode, TrendingUp, CheckCircle, X } from 'lucide-react'
import Link from 'next/link'
import { CONTACT_EMAIL, APP_URL } from '../lib/config'
import { LandingNav } from '../components/LandingNav'

const FEATURES = [
  { icon: Code2, title: 'REST API + SDKs', desc: 'Strict TypeScript SDK, Python client, and REST API. First message in under 5 minutes.' },
  { icon: Megaphone, title: 'Campaign Manager', desc: 'No-code bulk broadcasts. Import CSV, design messages, schedule and send.' },
  { icon: Flame, title: 'Auto Warmer', desc: 'Automatically warm new numbers to avoid bans. Gradual ramp-up over 14 days.' },
  { icon: Zap, title: 'Real-time Webhooks', desc: 'Instant delivery events. message.sent, message.delivered, message.read.' },
  { icon: ImageIcon, title: 'Rich Media', desc: 'Send images, videos, audio, documents, and location via API and dashboard.' },
  { icon: Smartphone, title: 'Multi-Account', desc: 'Connect unlimited numbers. Manage support, sales, and bots from one account.' },
]

const COMPARISON = [
  { feature: 'Marketing msg (USA)', wacent: 'Free', official: '$0.025 / msg' },
  { feature: 'Marketing msg (UK)', wacent: 'Free', official: '$0.048 / msg' },
  { feature: 'Marketing msg (Germany)', wacent: 'Free', official: '$0.113 / msg' },
  { feature: '10K msgs/mo — USA', wacent: '$5.90 flat', official: '$250+' },
  { feature: '10K msgs/mo — Germany', wacent: '$5.90 flat', official: '$1,131+' },
  { feature: 'Setup time', wacent: '2 minutes', official: '1–2 weeks' },
  { feature: 'Template approval', wacent: 'Not required', official: 'Required by Meta' },
]

const PLANS = [
  {
    name: 'Starter',
    price: '$5.90',
    yearlyPrice: '$49',
    devices: 1,
    features: ['1 WhatsApp number', 'Unlimited messages', 'REST API', '1 webhook', 'Email support'],
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$14.90',
    yearlyPrice: '$124',
    devices: 5,
    features: ['5 numbers', 'Auto Warmer', 'Contact manager', 'CSV import', '3 webhooks', 'Priority support'],
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$34.90',
    yearlyPrice: '$290',
    devices: 15,
    features: ['15 numbers', 'Campaign Manager', '10 webhooks', '99.9% SLA', 'Full analytics'],
    highlight: false,
  },
  {
    name: 'Agency',
    price: 'Custom',
    yearlyPrice: 'Custom',
    devices: 50,
    features: ['50+ numbers', 'Unlimited webhooks', 'Dedicated SLA', 'Custom onboarding', 'Sub-accounts'],
    highlight: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#0A0F1E', color: '#F1F5F9' }}>
      <LandingNav />

      {/* Hero */}
      <section
        className="pt-28 sm:pt-32 pb-16 sm:pb-24 px-5 text-center"
        style={{ backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(0,214,143,0.08) 0%, transparent 70%)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs text-[#00D68F] mb-6" style={{ borderColor: 'rgba(0,214,143,0.25)', background: 'rgba(0,214,143,0.05)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D68F] animate-pulse" />
            Flat pricing · No per-message fees
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-5">
            WhatsApp API.{' '}
            <span className="text-[#00D68F]">Flat Pricing.</span>
            <br />No Surprises.
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-[#94A3B8] max-w-2xl mx-auto mb-8">
            Send unlimited messages for one flat monthly fee.
            No per-message fees. No Meta markup.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`${APP_URL}/register`}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-[#0A0F1E] bg-[#00D68F] hover:bg-[#00A36C] transition-colors text-base text-center"
              style={{ boxShadow: '0 0 30px rgba(0,214,143,0.3)' }}
            >
              Start Free
            </a>
            <Link
              href="/docs"
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-[#CBD5E1] border border-[#1E2D45] hover:border-[#00D68F]/40 hover:text-white transition-colors text-base text-center"
            >
              View Docs
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-[#94A3B8]">
            {['99.9% Uptime', '<50ms Latency', '2,400+ Developers', 'Unlimited Messages'].map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                {i > 0 && <span className="hidden sm:inline text-[#1E2D45]">·</span>}
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section className="py-16 sm:py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-center mb-3">
            10,000 messages.
            <br />
            <span className="text-[#00D68F]">One costs $5.90.</span>
            <br />
            The other costs $1,131.
          </h2>
          <p className="text-center text-[#94A3B8] text-sm mb-8">
            Official WhatsApp API rates per Meta&apos;s January 2026 rate card.
          </p>

          {/* Scrollable table on mobile */}
          <div className="-mx-5 sm:mx-0 overflow-x-auto">
            <div className="px-5 sm:px-0 min-w-[520px]">
              <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#1E2D45' }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: '#111827' }}>
                      <th className="px-4 sm:px-6 py-4 text-left text-[#94A3B8] font-medium">Scenario</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-[#00D68F] font-semibold">Wacent</th>
                      <th className="px-4 sm:px-6 py-4 text-center text-[#EF4444] font-semibold whitespace-nowrap">Official API</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COMPARISON.map((row, i) => (
                      <tr
                        key={row.feature}
                        style={{
                          background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                          borderTop: '1px solid #1E2D45',
                        }}
                      >
                        <td className="px-4 sm:px-6 py-3 text-[#CBD5E1]">{row.feature}</td>
                        <td className="px-4 sm:px-6 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[#00D68F] font-medium whitespace-nowrap">
                            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> {row.wacent}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-center">
                          <span className="flex items-center justify-center gap-1 text-[#EF4444] whitespace-nowrap">
                            <X className="w-3.5 h-3.5 flex-shrink-0" /> {row.official}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 sm:py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">Everything you need to scale</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border p-5 space-y-3"
                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                <div className="p-2 rounded-lg w-fit" style={{ background: 'rgba(0,214,143,0.1)' }}>
                  <Icon className="w-4 h-4 text-[#00D68F]" />
                </div>
                <p className="font-semibold text-white">{title}</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-10">Up and running in 3 steps</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
            {[
              { icon: QrCode, step: '01', title: 'Connect', desc: 'Scan a QR code to link your WhatsApp number. Takes under 2 minutes. No Meta approval needed.' },
              { icon: Code2, step: '02', title: 'Build', desc: 'Call our REST API or use the official SDK. Send your first message in 3 lines of code.' },
              { icon: TrendingUp, step: '03', title: 'Scale', desc: 'Add more numbers as you grow. Upgrade your plan anytime. No migration needed.' },
            ].map(({ icon: Icon, step, title, desc }, i) => (
              <div key={title} className="flex sm:flex-col items-start sm:items-center sm:text-center gap-4 sm:gap-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,214,143,0.1)' }}>
                    <Icon className="w-5 h-5 text-[#00D68F]" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-mono text-[#00D68F] mb-1">{step}</p>
                  <p className="font-bold text-white text-base sm:text-lg">{title}</p>
                  <p className="text-sm text-[#94A3B8] mt-1 leading-relaxed">{desc}</p>
                </div>
                {i < 2 && <div className="hidden sm:block absolute" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20 px-5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-center mb-2">Simple, flat pricing</h2>
          <p className="text-center text-[#94A3B8] mb-8 sm:mb-10">No per-message fees. No surprises. Ever.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-5 flex flex-col ${plan.highlight ? 'border-[#00D68F]/50' : 'border-[#1E2D45]'}`}
                style={{ background: plan.highlight ? 'rgba(0,214,143,0.04)' : 'rgba(255,255,255,0.02)' }}
              >
                {plan.highlight && (
                  <span className="inline-block text-xs bg-[#00D68F] text-[#0A0F1E] px-2 py-0.5 rounded-full self-start mb-3 font-semibold">
                    Most popular
                  </span>
                )}
                <p className="font-bold text-white capitalize">{plan.name}</p>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-extrabold text-white">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-[#94A3B8] text-sm">/mo</span>}
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {plan.devices} device{plan.devices !== 1 ? 's' : ''}
                  </p>
                </div>
                <ul className="space-y-1.5 flex-1 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-xs text-[#CBD5E1]">
                      <CheckCircle className="w-3.5 h-3.5 text-[#00D68F] flex-shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                {plan.price !== 'Custom' ? (
                  <a
                    href={`${APP_URL}/register`}
                    className={`text-center text-sm font-semibold py-2.5 rounded-lg transition-colors ${
                      plan.highlight
                        ? 'bg-[#00D68F] text-[#0A0F1E] hover:bg-[#00A36C]'
                        : 'border border-[#1E2D45] text-[#CBD5E1] hover:border-[#00D68F]/40 hover:text-white'
                    }`}
                  >
                    Get started
                  </a>
                ) : (
                  <a
                    href={`mailto:${CONTACT_EMAIL}?subject=Agency Plan`}
                    className="text-center text-sm font-semibold py-2.5 rounded-lg border border-[#1E2D45] text-[#CBD5E1] hover:border-[#00D68F]/40 hover:text-white transition-colors"
                  >
                    Contact sales
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-5 text-center">
        <div
          className="max-w-2xl mx-auto rounded-2xl border p-8 sm:p-12"
          style={{ background: 'rgba(0,214,143,0.04)', borderColor: 'rgba(0,214,143,0.2)' }}
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">Ready to ship?</h2>
          <p className="text-[#94A3B8] mb-6">Join 2,400+ developers. Start free, upgrade when you need.</p>
          <a
            href={`${APP_URL}/register`}
            className="inline-block px-8 py-3 rounded-xl font-semibold text-[#0A0F1E] bg-[#00D68F] hover:bg-[#00A36C] transition-colors"
            style={{ boxShadow: '0 0 30px rgba(0,214,143,0.3)' }}
          >
            Start Building Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-10 px-5 border-t" style={{ borderColor: '#1E2D45' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#00D68F] flex items-center justify-center">
                <span className="text-[#0A0F1E] font-bold text-xs">W</span>
              </div>
              <span className="font-bold text-white text-sm">Wacent</span>
            </div>
            <span className="text-xs text-[#64748B] sm:ml-1">WhatsApp API &amp; Messaging Platform</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#64748B]">
            <Link href="/privacy" className="hover:text-[#94A3B8] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#94A3B8] transition-colors">Terms of Service</Link>
            <span>© 2026 Wacent</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
