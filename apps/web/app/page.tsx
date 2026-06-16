import Link from 'next/link'

const PLANS = [
  { name: 'Starter', price: '$2.90', devices: 1, highlight: false },
  { name: 'Growth', price: '$7.90', devices: 3, highlight: true },
  { name: 'Scale', price: '$19.90', devices: 10, highlight: false },
  { name: 'Agency', price: 'Custom', devices: 50, highlight: false },
]

const FEATURES = [
  { icon: '⚡', title: 'REST API', desc: 'Send messages, manage devices, and handle webhooks via a clean REST API.' },
  { icon: '📡', title: 'Real-time Webhooks', desc: 'Get instant delivery events — sent, delivered, read, received — to your endpoint.' },
  { icon: '🔥', title: 'Auto Warmer', desc: 'Automatically ramp new numbers to avoid bans. We handle the warming schedule.' },
  { icon: '📣', title: 'Campaign Manager', desc: 'Bulk broadcast to thousands of contacts with anti-spam delays built in.' },
  { icon: '🔑', title: 'API Keys', desc: 'Issue multiple keys per account. Revoke instantly. Full usage visibility.' },
  { icon: '📊', title: 'Analytics', desc: 'Track message volume, delivery rates, and device health in real time.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-green-600">WACENT</span>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#docs" className="hover:text-gray-900">Docs</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Log in</Link>
            <Link
              href="/register"
              className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          WhatsApp API — flat pricing, no per-message fees
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
          WhatsApp API &<br className="hidden md:block" /> Messaging Platform
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Send messages, run campaigns, and receive webhooks via a simple REST API.
          Connect your WhatsApp number in 60 seconds. Starting at $2.90/mo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-green-600 text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-green-700"
          >
            Get started free
          </Link>
          <a
            href="#docs"
            className="border border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-gray-50"
          >
            View docs
          </a>
        </div>
        <p className="mt-5 text-sm text-gray-400">No credit card required · 7-day free trial</p>
      </section>

      {/* Code snippet */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-gray-950 rounded-2xl p-6 overflow-x-auto">
          <pre className="text-sm text-gray-300 font-mono leading-relaxed">
{`curl -X POST https://api.wacent.io/v1/messages/send \\
  -H "Authorization: Bearer wz_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "whatsapp_account_id": "device-uuid",
    "phone_number": "+628123456789",
    "type": "text",
    "content": "Hello from WACENT! 🚀"
  }'`}
          </pre>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Everything you need to send at scale</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-3">Flat pricing. No surprises.</h2>
          <p className="text-center text-gray-500 mb-12">Unlimited messages on every plan. Pay for devices, not volume.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col ${plan.highlight ? 'ring-2 ring-green-500' : ''}`}
              >
                {plan.highlight && (
                  <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full self-start mb-3 font-medium">
                    Popular
                  </span>
                )}
                <h3 className="font-bold text-lg">{plan.name}</h3>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-gray-400 text-sm">/mo</span>}
                </div>
                <p className="text-sm text-gray-500 flex-1">Up to <strong>{plan.devices}</strong> WhatsApp {plan.devices === 1 ? 'number' : 'numbers'}</p>
                <Link
                  href="/register"
                  className={`mt-4 text-center text-sm font-medium py-2.5 rounded-lg ${
                    plan.highlight
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {plan.price === 'Custom' ? 'Contact us' : 'Get started'}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-600 py-20 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Start sending in 60 seconds</h2>
        <p className="text-green-100 mb-8 text-lg">Connect your WhatsApp number, grab an API key, send your first message.</p>
        <Link
          href="/register"
          className="inline-block bg-white text-green-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-green-50"
        >
          Create free account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <span className="font-bold text-green-600">WACENT</span>
          <p>© {new Date().getFullYear()} WACENT. Built with ♥ for developers.</p>
          <div className="flex gap-6">
            <a href="/terms" className="hover:text-gray-600">Terms</a>
            <a href="/privacy" className="hover:text-gray-600">Privacy</a>
            <a href="mailto:hello@wacent.io" className="hover:text-gray-600">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
