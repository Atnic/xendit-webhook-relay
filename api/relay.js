import axios from "axios";

// Vercel config: required to read raw body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).send("Method Not Allowed");
  }

  // Parse target URLs from environment variable (comma-separated)
  // Example: WEBHOOK_TARGETS="https://app1.com/webhook,https://app2.com/webhook"
  const TARGETS = process.env.WEBHOOK_TARGETS
    ? process.env.WEBHOOK_TARGETS.split(',').map(url => url.trim()).filter(Boolean)
    : [];

  // Validate targets are configured
  if (TARGETS.length === 0) {
    console.error('No WEBHOOK_TARGETS configured');
    return res.status(500).send('No webhook targets configured');
  }

  // Track results from all targets
  const results = await Promise.all(
    TARGETS.map(async (url) => {
      try {
        const response = await axios.get(url, { timeout: 5000 });
        console.log(`✓ ${url} returned ${response.status}`);
        return { url, success: true, status: response.status };
      } catch (err) {
        const status = err.response?.status || 'timeout/error';
        console.error(`✗ ${url} returned ${status}`);
        return { url, success: false, status };
      }
    })
  );

  const hasSuccess = results.some(r => r.success);

  if (hasSuccess) {
    // At least one app handled it successfully
    return res.status(200).send("OK");
  } else {
    // All apps failed (404, 5xx, timeout) - let Xendit retry
    return res.status(500).send("All targets failed");
  }
}
