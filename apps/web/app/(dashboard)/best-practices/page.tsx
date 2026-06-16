import { CheckCircle, XCircle, Flame, Shield, AlertTriangle, HeartPulse } from 'lucide-react'
import { GlassCard } from '../../../components/ui/GlassCard'

const DOS = [
  'Keep messages conversational and relevant',
  'Respect recipient time zones when scheduling',
  'Always include an opt-out option',
  'Use Auto Warmer for new numbers',
  'Space messages at least 1.5 seconds apart',
  'Monitor your health score daily',
  'Segment your audience for relevance',
  'Test messages on small batches first',
]

const DONTS = [
  'Do not send unsolicited bulk messages',
  'Do not use unofficial number activation methods',
  'Do not send the same message repeatedly',
  'Do not exceed 200 messages/hour per number',
  'Do not ignore delivery failures',
  'Do not send to unverified numbers',
  'Do not use link shorteners in mass campaigns',
  'Do not skip the warming period',
]

const WARM_STEPS = [
  { day: 'Days 1–2', msgs: '5–10 messages', note: 'Warm-up contacts only' },
  { day: 'Days 3–5', msgs: '20–50 messages', note: 'Mix warm and real contacts' },
  { day: 'Days 6–10', msgs: '100–200 messages', note: 'Gradual volume increase' },
  { day: 'Days 11–14', msgs: '300–500 messages', note: 'Near-production volume' },
  { day: 'Day 15+', msgs: 'Full volume', note: 'Number is fully warmed' },
]

export default function BestPracticesPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Best Practices</h1>
        <p className="text-sm text-text-secondary mt-1">Keep your numbers healthy and avoid bans.</p>
      </div>

      {/* Golden Rules */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3">The Golden Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Send to opt-ins only', desc: 'Only message people who have explicitly agreed to receive messages from you.' },
            { icon: Flame, title: 'Warm new numbers', desc: 'Never blast a fresh number. Use Auto Warmer for 14+ days before production volume.' },
            { icon: HeartPulse, title: 'Watch your health score', desc: 'A score below 50 triggers alerts. Below 30, campaigns auto-pause to protect your number.' },
          ].map(({ icon: Icon, title, desc }) => (
            <GlassCard key={title} className="space-y-2">
              <div className="p-2 rounded-lg w-fit" style={{ background: 'rgba(0,214,143,0.1)' }}>
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-text-primary">{title}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" /> Do&apos;s
          </h2>
          <ul className="space-y-2">
            {DOS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-danger" /> Don&apos;ts
          </h2>
          <ul className="space-y-2">
            {DONTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                <XCircle className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Warming Schedule */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Flame className="w-4 h-4 text-warning" /> Warming Up a New Number
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Enable Auto Warmer on your device and let Wacent handle the schedule automatically. Manual warmer timeline:
        </p>
        <div className="space-y-2">
          {WARM_STEPS.map((step) => (
            <div
              key={step.day}
              className="flex items-center gap-4 rounded-lg border p-3"
              style={{ background: 'rgba(255,255,255,0.02)', borderColor: '#1E2D45' }}
            >
              <span className="text-xs font-semibold text-text-muted w-24 flex-shrink-0">{step.day}</span>
              <span className="text-sm font-medium text-primary w-36 flex-shrink-0">{step.msgs}</span>
              <span className="text-xs text-text-secondary">{step.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Health Score */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
          <HeartPulse className="w-4 h-4 text-primary" /> Understanding Number Health
        </h2>
        <GlassCard className="space-y-3 text-sm text-text-secondary">
          <p>Health score starts at 100 and is updated hourly based on message delivery rates.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { range: '80–100', color: 'text-primary', label: 'Healthy' },
              { range: '50–79', color: 'text-warning', label: 'Caution' },
              { range: '0–49', color: 'text-danger', label: 'At risk' },
            ].map(({ range, color, label }) => (
              <div key={range} className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <p className={`text-lg font-bold ${color}`}>{range}</p>
                <p className="text-xs text-text-muted">{label}</p>
              </div>
            ))}
          </div>
          <p>Campaigns auto-pause if health drops below 30. Improve health by reducing failure rate and slowing send speed.</p>
        </GlassCard>
      </div>

      {/* If banned */}
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger" /> If Your Number Gets Banned
        </h2>
        <ol className="space-y-2 list-none">
          {[
            'Stop all sending immediately — disconnect the device in Wacent.',
            'Appeal via WhatsApp Support if the ban is in error.',
            'Register a fresh SIM card and create a new WhatsApp account.',
            'Add the new number as a device in Wacent and enable Auto Warmer.',
            'Do not send any production messages until the warm-up is complete (14+ days).',
            'Review your recipient list — remove anyone who may have marked you as spam.',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-text-secondary">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center text-danger border border-danger/50"
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
