# @wazap/node

Official Node.js SDK for [Wazap](https://wazap.sh) — WhatsApp API & Messaging Platform.

## Installation

```bash
npm install @wazap/node
# or
pnpm add @wazap/node
# or
yarn add @wazap/node
```

Requires **Node.js 18+** (uses native `fetch`).

## Quick Start

```typescript
import { WazapClient } from '@wazap/node'

const wazap = new WazapClient({ apiKey: 'wz_live_your_api_key' })

// Send a text message
const result = await wazap.messages.send({
  whatsapp_account_id: 'device-uuid',
  phone_number: '+628123456789',
  type: 'text',
  content: 'Hello from Wazap!',
})

console.log(result.message_id, result.status) // => "uuid" "queued"
```

## Authentication

Generate an API key in the [Wazap Dashboard](https://app.wazap.sh/api-keys). Keys are prefixed with `wz_live_`.

```typescript
const wazap = new WazapClient({
  apiKey: process.env.WAZAP_API_KEY!,
  baseUrl: 'https://api.wazap.sh/v1', // optional, this is the default
})
```

## Resources

### Messages

```typescript
// Send text
await wazap.messages.send({
  whatsapp_account_id: deviceId,
  phone_number: '+628123456789',
  type: 'text',
  content: 'Hi there!',
})

// Send image
await wazap.messages.send({
  whatsapp_account_id: deviceId,
  phone_number: '+628123456789',
  type: 'image',
  media_url: 'https://example.com/photo.jpg',
  caption: 'Check this out!',
})

// List messages
const { data, meta } = await wazap.messages.list({ page: 1, limit: 20 })

// Get single message
const message = await wazap.messages.get('message-uuid')
```

### Devices

```typescript
// List all connected devices
const { data: devices } = await wazap.devices.list()

// Get device status
const device = await wazap.devices.get('device-uuid')
console.log(device.status) // 'connected' | 'disconnected' | 'connecting' | 'banned'

// Get QR code for new device
const { qrCode } = await wazap.devices.getQR('device-uuid')

// Create device
const newDevice = await wazap.devices.create('My Business Phone')

// Disconnect / reconnect
await wazap.devices.disconnect('device-uuid')
await wazap.devices.reconnect('device-uuid')
```

### Campaigns

```typescript
// Create a campaign
const campaign = await wazap.campaigns.create({
  deviceId: 'device-uuid',
  name: 'Black Friday Promo',
  messageType: 'text',
  content: 'Get 50% off today only!',
  delayMs: 3000,
})

// Add recipients
await wazap.campaigns.addRecipients(campaign.id, [
  { phoneNumber: '+628123456789', name: 'Alice' },
  { phoneNumber: '+628987654321', name: 'Bob' },
])

// Start the campaign
await wazap.campaigns.start(campaign.id)

// Poll status
const status = await wazap.campaigns.get(campaign.id)
console.log(`${status.sentCount}/${status.recipientCount} sent`)
```

### Contacts

```typescript
// List contacts with search
const { data: contacts } = await wazap.contacts.list({ search: 'alice', limit: 50 })

// Create contact
const contact = await wazap.contacts.create({
  phoneNumber: '+628123456789',
  name: 'Alice',
  tags: ['vip', 'customer'],
})

// Bulk import
const result = await wazap.contacts.import([
  { phoneNumber: '+628111111111', name: 'Carol' },
  { phoneNumber: '+628222222222', name: 'Dave' },
])
console.log(`Imported ${result.created}, failed ${result.failed}`)
```

### Webhooks

```typescript
// Register a webhook
const webhook = await wazap.webhooks.create({
  url: 'https://yourapp.com/wazap-events',
  secret: 'your-signing-secret',
  events: ['message.delivered', 'message.read', 'message.received'],
})

// List webhooks
const { data: hooks } = await wazap.webhooks.list()

// View delivery logs
const { data: logs } = await wazap.webhooks.getLogs(webhook.id)

// Send a test event
await wazap.webhooks.test(webhook.id)
```

## Error Handling

All non-2xx responses throw a `WazapError`:

```typescript
import { WazapClient, WazapError } from '@wazap/node'

try {
  await wazap.messages.send({ ... })
} catch (err) {
  if (err instanceof WazapError) {
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
app.post('/wazap-events', (req, res) => {
  const sig = req.headers['x-wazap-signature'] as string
  const valid = verifyWebhook(req.rawBody, sig, process.env.WAZAP_WEBHOOK_SECRET!)
  if (!valid) return res.status(401).send('Invalid signature')

  const { event, data } = req.body
  console.log(event, data)
  res.sendStatus(200)
})
```

## TypeScript

The SDK is written in TypeScript and ships full type definitions. All payloads and responses are typed:

```typescript
import type { Device, Message, Campaign, SendMessagePayload } from '@wazap/node'
```

## License

MIT — see [LICENSE](LICENSE).
