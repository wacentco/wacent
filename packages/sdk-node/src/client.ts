import { HttpClient } from './http.js'
import { CampaignsResource } from './resources/campaigns.js'
import { ContactsResource } from './resources/contacts.js'
import { DevicesResource } from './resources/devices.js'
import { MessagesResource } from './resources/messages.js'
import { WebhooksResource } from './resources/webhooks.js'

const DEFAULT_BASE_URL = 'https://api.wazap.sh/v1'

export interface WazapClientOptions {
  apiKey: string
  baseUrl?: string
}

export class WazapClient {
  readonly messages: MessagesResource
  readonly devices: DevicesResource
  readonly campaigns: CampaignsResource
  readonly contacts: ContactsResource
  readonly webhooks: WebhooksResource

  constructor(options: WazapClientOptions) {
    const http = new HttpClient(options.apiKey, options.baseUrl ?? DEFAULT_BASE_URL)
    this.messages = new MessagesResource(http)
    this.devices = new DevicesResource(http)
    this.campaigns = new CampaignsResource(http)
    this.contacts = new ContactsResource(http)
    this.webhooks = new WebhooksResource(http)
  }
}
