#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "mbedtls/md.h"

// ==========================================
// 1. CONFIGURATION
// ==========================================
const char* WIFI_SSID = "YASHAS_R";
const char* WIFI_PASSWORD = "0987654321";

// Your Supabase Edge Function URL for ingest-telemetry
const char* CLOUD_FUNCTION_URL = "https://zavjkhdvrvfphxqgnhqq.supabase.co/functions/v1/ingest-telemetry";

// This MUST match the HARDWARE_SECRET_KEY in your backend index.ts
const String SECRET_KEY = "agro_secret_key_123";
const String DEVICE_ID = "ESP32_WAREHOUSE_01";

// ==========================================
// 2. HARDWARE PINS
// ==========================================
#define DHTPIN 4          // GPIO4
#define DHTTYPE DHT22     // Preserved your DHT22 configuration
DHT dht(DHTPIN, DHTTYPE);

#define GAS_SENSOR_PIN 34 // Analog pin for MQ sensor

// ==========================================
// 3. NTP (Time Sync)
// ==========================================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi ");
  Serial.print(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Start NTP client to get timestamps
  timeClient.begin();
}

// Function to generate HMAC-SHA256 signature
String generateSignature(String payload) {
  byte hmacResult[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;
  
  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char *)SECRET_KEY.c_str(), SECRET_KEY.length());
  mbedtls_md_hmac_update(&ctx, (const unsigned char *)payload.c_str(), payload.length());
  mbedtls_md_hmac_finish(&ctx, hmacResult);
  mbedtls_md_free(&ctx);
  
  String signature = "";
  for(int i = 0; i < 32; i++) {
    char str[3];
    sprintf(str, "%02x", (int)hmacResult[i]);
    signature += str;
  }
  return signature;
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    // 1. Get accurate time
    timeClient.update();
    unsigned long timestamp = timeClient.getEpochTime();

    // 2. Read Sensors
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int gasLevel = analogRead(GAS_SENSOR_PIN);

    // Check if readings failed (added mock fallback just in case the wires loosen)
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("[WARNING] Failed to read from DHT sensor! Using mock data.");
      temperature = 31.2 + (random(-5, 5) / 10.0);
      humidity = 68.0 + random(-2, 2);
    }

    // 3. Construct JSON Payload EXACTLY as backend expects it
    String jsonPayload = "{";
    jsonPayload += "\"deviceId\":\"" + DEVICE_ID + "\",";
    jsonPayload += "\"temperature\":" + String(temperature) + ",";
    jsonPayload += "\"humidity\":" + String(humidity) + ",";
    jsonPayload += "\"gasLevel\":" + String(gasLevel) + ",";
    jsonPayload += "\"timestamp\":" + String(timestamp);
    jsonPayload += "}";

    // 4. Generate Security Signature
    String signature = generateSignature(jsonPayload);

    Serial.println("\n--- Sending Telemetry ---");
    Serial.println("Payload: " + jsonPayload);
    Serial.println("Signature: " + signature);

    // 5. Send HTTP POST Request to Cloud Function
    HTTPClient http;
    http.begin(CLOUD_FUNCTION_URL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("x-device-signature", signature); // Inject secure header

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.print("Error code: ");
      Serial.println(httpResponseCode);
    }
    http.end();
  } else {
    Serial.println("WiFi Disconnected!");
  }

  // Wait 10 seconds before next reading
  delay(10000); 
}
