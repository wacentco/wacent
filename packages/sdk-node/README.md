# @wacent/node

Official Node.js SDK for [WACENT](https://wacent.io) — WhatsApp API & Messaging Platform.

## Installation

```bash
npm install @wacent/node
# or
pnpm add @wacent/node
# or
yarn add @wacent/node
```

Requires **Node.js 18+** (uses native `fetch`).

## Quick Start

```typescript
import { WACENTClient } from '@wacent/node'

const WACENT = new WACENTClient({ apiKey: 'wz_live_your_api_key' })

// Send a text message
const result = await WACENT.messages.send({
  whatsapp_account_id: 'device-uuid',
  phone_number: '+628123456789',
  type: 'text',
  content: 'Hello from WACENT!',
})

console.log(result.message_id, result.status) // => "uuid" "queued"
```

## Authentication

Generate an API key in the [WACENT Dashboard](https://app.wacent.io/api-keys). Keys are prefixed with `wz_live_`.

```typescript
const WACENT = new WACENTClient({
  apiKey: process.env.WACENT_API_KEY!,
  baseUrl: 'https://api.wacent.io/v1', // optional, this is the default
})
```

## Resources

### Messages

```typescript
// Send text
await WACENT.messages.send({
  whatsapp_account_id: deviceId,
  phone_number: '+628123456789',
  type: 'text',
  content: 'Hi there!',
})

// Send image
await WACENT.messages.send({
  whatsapp_account_id: deviceId,
  phone_number: '+628123456789',
  type: 'image',
  media_url: 'https://example.com/photo.jpg',
  caption: 'Check this out!',
})

// List messages
const { data, meta } = await WACENT.messages.list({ page: 1, limit: 20 })

// Get single message
const message = await WACENT.messages.get('message-uuid')
```

### Devices

```typescript
// List all connected devices
const { data: devices } = await WACENT.devices.list()

// Get device status
const device = await WACENT.devices.get('device-uuid')
console.log(device.status) // 'connected' | 'disconnected' | 'connecting' | 'banned'

// Get QR code for new device
const { qrCode } = await WACENT.devices.getQR('device-uuid')

// Create device
const newDevice = await WACENT.devices.create('My Business Phone')

// Disconnect / reconnect
await WACENT.devices.disconnect('device-uuid')
await WACENT.devices.reconnect('device-uuid')
```

### Campaigns

```typescript
// Create a campaign
const campaign = await WACENT.campaigns.create({
  deviceId: 'device-uuid',
  name: 'Black Friday Promo',
  messageType: 'text',
  content: 'Get 50% off today only!',
  delayMs: 3000,
})

// Add recipients
await WACENT.campaigns.addRecipients(campaign.id, [
  { phoneNumber: '+628123456789', name: 'Alice' },
  { phoneNumber: '+628987654321', name: 'Bob' },
])

// Start the campaign
await WACENT.campaigns.start(campaign.id)

// Poll status
const status = await WACENT.campaigns.get(campaign.id)
console.log(`${status.sentCount}/${status.recipientCount} sent`)
```

### Contacts

```typescript
// List contacts with search
const { data: contacts } = await WACENT.contacts.list({ search: 'alice', limit: 50 })

// Create contact
const contact = await WACENT.contacts.create({
  phoneNumber: '+628123456789',
  name: 'Alice',
  tags: ['vip', 'customer'],
})

// Bulk import
const result = await WACENT.contacts.import([
  { phoneNumber: '+628111111111', name: 'Carol' },
  { phoneNumber: '+628222222222', name: 'Dave' },
])
console.log(`Imported ${result.created}, failed ${result.failed}`)
```

### Webhooks

```typescript
// Register a webhook
const webhook = await WACENT.webhooks.create({
  url: 'https://yourapp.com/WACENT-events',
  secret: 'your-signing-secret',
  events: ['message.delivered', 'message.read', 'message.received'],
})

// List webhooks
const { data: hooks } = await WACENT.webhooks.list()

// View delivery logs
const { data: logs } = await WACENT.webhooks.getLogs(webhook.id)

// Send a test event
await WACENT.webhooks.test(webhook.id)
```

## Error Handling

All non-2xx responses throw a `WACENTError`:

```typescript
import { WACENTClient, WACENTError } from '@wacent/node'

try {
  await WACENT.messages.send({ ... })
} catch (err) {
  if (err instanceof WACENTError) {
    console.error(err.code)    // e.g. 'DEVICE_NOT_CONNECTED'
    console.error(err.message) // human-readable description
    console.error(err.status)  // HTTP status code
  }
}
```

## Verifying Webhook Signatures

```typescript
import { createHmac } from 'node:crypto'

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + createHmac('sha256', secret).update(rawBody).digest('hex')
  return expected === signature
}

// In your Express/Hono handler:
app.post('/WACENT-events', (req, res) => {
  const sig = req.headers['x-WACENT-signature'] as string
  const valid = verifyWebhook(req.rawBody, sig, process.env.WACENT_WEBHOOK_SECRET!)
  if (!valid) return res.status(401).send('Invalid signature')

  const { event, data } = req.body
  console.log(event, data)
  res.sendStatus(200)
})
```

## TypeScript

The SDK is written in TypeScript and ships full type definitions. All payloads and responses are typed:

```typescript
import type { Device, Message, Campaign, SendMessagePayload } from '@wacent/node'
```

## License

MIT — see [LICENSE](LICENSE).
