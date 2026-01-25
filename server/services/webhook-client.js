const axios = require('axios');

class WebhookClient {
    constructor() {
        this.config = {
            url: null,
            apiKey: null
        };
    }

    updateConfig(url, apiKey) {
        console.log(`[WebhookClient] Configuration updated. URL: ${url}`);
        this.config.url = url;
        this.config.apiKey = apiKey;
    }

    async sendEvent(eventType, payload) {
        if (!this.config.url) {
            console.log(`[WebhookClient] No URL configured. Skipping event: ${eventType}`);
            return;
        }

        const body = {
            event: eventType,
            timestamp: new Date().toISOString(),
            machine_id: "VM-SIM-001",
            data: payload
        };

        console.log(`[WebhookClient] Sending ${eventType} to ${this.config.url}...`);

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.config.apiKey) {
                headers['Authorization'] = `Bearer ${this.config.apiKey}`;
            }

            await axios.post(this.config.url, body, { headers, timeout: 5000 });
            console.log(`[WebhookClient] Event ${eventType} sent successfully.`);
        } catch (error) {
            console.error(`[WebhookClient] Failed to send event: ${error.message}`);
        }
    }
}

module.exports = new WebhookClient();
