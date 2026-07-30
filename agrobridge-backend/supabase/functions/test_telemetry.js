import crypto from 'crypto';

// The secret key must match the one in the Edge Function
const HARDWARE_SECRET_KEY = "agro_secret_key_123";

// Replace with your actual deployed Edge Function URL
// e.g. "https://[PROJECT_REF].supabase.co/functions/v1/ingest-telemetry"
// Or for local testing: "http://127.0.0.1:54321/functions/v1/ingest-telemetry"
const EDGE_FUNCTION_URL = "http://127.0.0.1:54321/functions/v1/ingest-telemetry";

const payload = {
  deviceId: "ESP32-GATEWAY-001",
  temperature: (Math.random() * (35 - 20) + 20).toFixed(1), // Random temp between 20-35
  humidity: Math.floor(Math.random() * (90 - 40) + 40),      // Random humidity 40-90
  gasLevel: Math.floor(Math.random() * (400 - 50) + 50),     // Random gas level
  timestamp: Math.floor(Date.now() / 1000)
};

const payloadString = JSON.stringify(payload);

// Calculate HMAC-SHA256
const hmac = crypto.createHmac('sha256', HARDWARE_SECRET_KEY);
hmac.update(payloadString);
const signature = hmac.digest('hex');

console.log("Sending payload:", payloadString);
console.log("Signature:", signature);

// Send to Edge Function
fetch(EDGE_FUNCTION_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-device-signature': signature
  },
  body: payloadString
})
.then(res => res.text().then(text => console.log("Response:", res.status, text)))
.catch(err => console.error("Error:", err));
