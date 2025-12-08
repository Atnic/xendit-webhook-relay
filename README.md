# Xendit Webhook Relay

A lightweight webhook router that receives callbacks from Xendit and forwards them to multiple applications. This solves Xendit's limitation of only allowing one webhook URL per user.

## 🚀 Features

- ✅ Receives raw-body webhooks from Xendit
- ✅ Forwards webhooks to multiple target applications
- ✅ Ignores 404/5xx errors from target apps
- ✅ Always returns 200 to Xendit (prevents retries)
- ✅ Lightweight and database-free
- ✅ Deployed as Vercel Serverless Function

## 📁 Project Structure

```
xendit-webhook-relay/
├── api/
│   └── xendit.js       # Main webhook handler
├── package.json
├── vercel.json
└── README.md
```

## 🛠️ Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Target Applications

Edit `api/xendit.js` and update the `TARGETS` array with your application webhook URLs:

```javascript
const TARGETS = [
  "https://your-app-1.com/webhook/xendit",
  "https://your-app-2.com/webhook/xendit",
  "https://your-app-3.com/webhook/xendit",
];
```

### 3. Deploy to Vercel

```bash
# Install Vercel CLI if you haven't
pnpm add -g vercel

# Deploy
pnpm run deploy
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 4. Configure Xendit

Set your webhook URL in Xendit dashboard to:

```
https://your-vercel-domain.vercel.app/api/xendit
```

## 🧪 Testing Locally

```bash
# Start local development server
pnpm run dev

# Test with curl
curl -X POST http://localhost:3000/api/xendit \
  -H "Content-Type: application/json" \
  -d '{"id":"test-invoice-123","status":"PAID"}'
```

## 🧩 How It Works

1. Xendit sends a webhook to your Vercel function
2. The function receives the raw payload
3. Payload is forwarded to all target applications in parallel
4. Function always returns 200 OK to Xendit (even if targets fail)
5. Errors are logged but don't affect the response to Xendit

## 🛡️ Error Behavior

| Scenario | Router Behavior | What Xendit Sees |
|----------|----------------|------------------|
| App 1 returns 200 | Forward succeeds | OK |
| App 2 returns 404 | Ignored | OK |
| App returns 5xx | Ignored | OK |
| All apps fail | Still returns 200 | OK |

## 📝 Important Notes

- The router **always** returns 200 to Xendit to prevent retries
- Failed forwards to target apps are logged but don't block the response
- Target apps must handle duplicate webhooks gracefully
- Consider adding HMAC verification for production use

## 🔒 Adding Webhook Verification (Optional)

To verify Xendit webhooks with callback token:

```javascript
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN;

// In handler function, before forwarding:
const callbackToken = req.headers['x-callback-token'];
if (callbackToken !== XENDIT_CALLBACK_TOKEN) {
  console.error('Invalid callback token');
  return res.status(200).send('OK'); // Still return 200
}
```

## 📄 License

MIT
