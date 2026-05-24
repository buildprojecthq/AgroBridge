// agrobridge-backend/functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

// This MUST match the key you will eventually hardcode into the ESP32 C++ script
const HARDWARE_SECRET_KEY = "agro_secret_key_123";

exports.ingestTelemetry = functions.https.onRequest(async (req, res) => {
    // 1. Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const payloadString = JSON.stringify(req.body);
        const signatureFromDevice = req.headers['x-device-signature'];

        // 2. Cryptographic Security Check
        const expectedSignature = crypto
            .createHmac('sha256', HARDWARE_SECRET_KEY)
            .update(payloadString)
            .digest('hex');

        if (signatureFromDevice !== expectedSignature) {
            console.error("Security Alert: Invalid Signature");
            return res.status(401).send('Unauthorized: Bad Signature');
        }

        // 3. Anti-Replay Attack Check (Reject data older than 5 minutes)
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime - req.body.timestamp > 300) {
            return res.status(401).send('Unauthorized: Payload Expired');
        }

        // 4. Extract Data
        const { deviceId, temperature, humidity, gasLevel, timestamp } = req.body;

        // 5. Smart Spoilage Logic
        // Determine status based on MQ gas sensor thresholds
        const SPOILAGE_THRESHOLD = 250;
        let unitStatus = "NORMAL";

        if (gasLevel >= SPOILAGE_THRESHOLD) {
            unitStatus = "CRITICAL_SPOILAGE_DETECTED";
        } else if (gasLevel >= 150) {
            unitStatus = "WARNING_ELEVATED_GAS";
        }

        // 6. Save securely to Firestore
        await db.collection('storage_telemetry').doc(deviceId).set({
            currentTemperature: temperature,
            currentHumidity: humidity,
            gasLevel: gasLevel,
            status: unitStatus,
            lastUpdated: timestamp
        }, { merge: true });

        return res.status(200).send('Telemetry processed successfully');

    } catch (error) {
        console.error("Error processing telemetry:", error);
        return res.status(500).send('Internal Server Error');
    }
});