📄 Xendit Webhook Router — Simple Node.js (Vercel Compatible)

This document explains how to build a webhook router that receives callbacks from Xendit and forwards them to multiple applications (App 1, App 2, etc.).
This router is fully compatible with Vercel Serverless Functions.

✨ Features

Receives raw-body webhook from Xendit

Supports payload verification (optional)

Forwards the webhook to multiple target apps

Ignores 404/5xx errors from target apps

Always returns 200 to Xendit (prevents retries)

Lightweight and database-free

📁 Project Structure
/api/
  └─ xendit.js

🔧 Xendit Webhook Configuration

Set your webhook URL to:

https://<your-vercel-domain>/api/xendit

🧩 Full Code (api/xendit.js)
// Vercel config: required to read raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

import axios from "axios";

// List of target apps that should receive the forwarded webhook
const TARGETS = [
  "https://app1.com/webhook/xendit",
  "https://app2.dev/xendit",
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Read raw body (required for Xendit webhook compatibility)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Invalid JSON:", err.message);
    // Return OK to Xendit even if parsing fails
    return res.status(200).send("OK");
  }

  // Forward payload to all target applications
  await Promise.all(
    TARGETS.map(async (url) => {
      try {
        await axios.post(url, payload, { timeout: 5000 });
      } catch (err) {
        // Forwarding errors are ignored
        console.error(
          `Failed to forward to ${url}:`,
          err.response?.status || err.message
        );
      }
    })
  );

  // Important: always return 200 to Xendit
  return res.status(200).send("OK");
}

🛡️ Error Behavior
Scenario	Router Behavior	What Xendit Sees
App 1 returns 200	Forward succeeds	OK
App 2 returns 404	Ignored	OK
App returns 5xx	Ignored	OK
All apps fail	Still returns 200	OK
Router returns 500	❌ Xendit retries	Should be avoided
🧪 Testing the Router

Use CURL or Postman to send a test payload:

curl -X POST https://your-vercel-domain/api/xendit \
  -H "Content-Type: application/json" \
  -d '{"id":"test-invoice-123"}'

✔️ Recommended Best Practices

Never return anything other than 200 OK to Xendit.

Log errors from forwarded requests for debugging.

If you need retries → implement your own queue (Redis / RabbitMQ).

If required, add Xendit HMAC callback token verification.

