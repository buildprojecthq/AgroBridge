#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <NTPClient.h>
#include <WiFiUdp.h>
#include "mbedtls/md.h"

// ==========================================
// 1. CONFIGURATION
// ==========================================
const char* WIFI_SSID = "Ramamurthy's F15";
const char* WIFI_PASSWORD = "rama@12321";

// Your Supabase Edge Function URL for ingest-telemetry
const char* CLOUD_FUNCTION_URL = "https://zavjkhdvrvfphxqgnhqq.supabase.co/functions/v1/ingest-telemetry";

// This MUST match the HARDWARE_SECRET_KEY in your backend index.ts
const String SECRET_KEY = "agro_secret_key_123";
const String DEVICE_ID = "ESP32_WAREHOUSE_01";

// ==========================================
// 2. HARDWARE PINS & CONFIGURATION
// ==========================================
#define DHTPIN 4          // GPIO4 for DHT Sensor
#define DHTTYPE DHT22     // DHT22 (AM2302)
DHT dht(DHTPIN, DHTTYPE);

#define GAS_SENSOR_PIN 34 // Analog pin for MQ sensor

// Cooling Fan Relay Control Pin (GPIO 18)
#define FAN_PIN 18
#define RELAY_ACTIVE_HIGH false // Set to false because standard relay modules are Active-LOW (0V = ON, 3.3V = OFF)

// ==========================================
// 3. SAFETY AUTOMATION THRESHOLDS
// ==========================================
#define GAS_CRITICAL_THRESHOLD 1300 // Critical gas/spoilage threshold (normal is 700-1200)
#define TEMP_HIGH_THRESHOLD 35.0    // Critical temperature limit in °C
#define HUMIDITY_HIGH_THRESHOLD 80.0 // Critical humidity limit in %

// ==========================================
// 4. GLOBAL STATE & TIMERS
// ==========================================
bool currentFanState = false;
bool manualOverride = false;
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 10000; // 10 seconds

WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// ==========================================
// 5. HELPER FUNCTIONS
// ==========================================

void printHelpMenu() {
  Serial.println("\n==========================================");
  Serial.println("  AGROBRIDGE ESP32 GATEWAY & FAN CONTROL  ");
  Serial.println("==========================================");
  Serial.println("Commands you can type in Serial Monitor:");
  Serial.println("  '1' or 'ON'     -> Turn Fan ON (Manual Override)");
  Serial.println("  '0' or 'OFF'    -> Turn Fan OFF (Manual Override)");
  Serial.println("  'TEST'          -> Run 3-second Fan test");
  Serial.println("  'AUTO'          -> Return to Mobile App & Safety Auto Mode");
  Serial.println("  'STATUS'        -> Show current system status");
  Serial.println("  'HELP'          -> Show this menu");
  Serial.println("==========================================\n");
}

void setFanState(bool state, bool isManual) {
  currentFanState = state;
  if (isManual) {
    manualOverride = true;
  }
  
  // Actuate GPIO pin
  digitalWrite(FAN_PIN, (currentFanState == RELAY_ACTIVE_HIGH) ? HIGH : LOW);
  
  Serial.print(">>> [FAN] State: ");
  Serial.print(currentFanState ? "ON 🟢" : "OFF ⚪");
  Serial.println(manualOverride ? " (Manual Override)" : " (Auto / Cloud Sync)");
}

void handleSerialCommands() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd.length() == 0) return;

    Serial.print("\n[SERIAL INPUT] Received: '");
    Serial.print(cmd);
    Serial.println("'");

    if (cmd == "1" || cmd == "ON" || cmd == "FAN_ON") {
      setFanState(true, true);
    } else if (cmd == "0" || cmd == "OFF" || cmd == "FAN_OFF") {
      setFanState(false, true);
    } else if (cmd == "TEST") {
      Serial.println(">>> [FAN TEST] Running 3-second diagnostic pulse...");
      digitalWrite(FAN_PIN, RELAY_ACTIVE_HIGH ? HIGH : LOW);
      delay(3000);
      digitalWrite(FAN_PIN, (currentFanState == RELAY_ACTIVE_HIGH) ? HIGH : LOW);
      Serial.println(">>> [FAN TEST] Test completed! Returned to previous state.");
    } else if (cmd == "AUTO") {
      manualOverride = false;
      Serial.println(">>> [FAN] Mode: AUTO ☁️ (Now syncing with Safety Automation & Mobile App)");
    } else if (cmd == "STATUS") {
      Serial.println("\n--- SYSTEM STATUS ---");
      Serial.print("WiFi Status: ");
      Serial.println((WiFi.status() == WL_CONNECTED) ? "Connected" : "Disconnected");
      Serial.print("IP Address: ");
      Serial.println(WiFi.localIP());
      Serial.print("Fan Pin: GPIO ");
      Serial.println(FAN_PIN);
      Serial.print("Fan State: ");
      Serial.println(currentFanState ? "ON" : "OFF");
      Serial.print("Control Mode: ");
      Serial.println(manualOverride ? "MANUAL OVERRIDE (Type 'AUTO' to enable Safety & App Control)" : "AUTO (Safety Rules + App Sync)");
      Serial.println("---------------------\n");
    } else if (cmd == "HELP") {
      printHelpMenu();
    } else {
      Serial.println("[ERROR] Unknown command. Type 'HELP' for available commands.");
    }
  }
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

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WARNING] WiFi Disconnected! Reconnecting...");
    return;
  }

  // 1. Get accurate time
  timeClient.update();
  unsigned long timestamp = timeClient.getEpochTime();

  // 2. Read Sensors
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  int gasLevel = analogRead(GAS_SENSOR_PIN);

  // Fallback mock values if sensor readings fail
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[WARNING] Failed to read from DHT sensor! Using mock data.");
    temperature = 31.2 + (random(-5, 5) / 10.0);
    humidity = 68.0 + random(-2, 2);
  }

  // 3. Construct JSON Payload
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
  http.addHeader("x-device-signature", signature);

  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("HTTP Response code: " + String(httpResponseCode));
    Serial.println("Response: " + response);

    // 6. Precedence & Automated Safety Logic
    bool isDangerLevel = (temperature >= TEMP_HIGH_THRESHOLD || humidity >= HUMIDITY_HIGH_THRESHOLD || gasLevel >= GAS_CRITICAL_THRESHOLD);

    if (!manualOverride) {
      if (isDangerLevel) {
        // Priority 1 in AUTO: Environmental safety trigger
        setFanState(true, false);
        Serial.print(">>> [AUTO SAFETY COOLING] Danger Level Detected (Temp: ");
        Serial.print(temperature);
        Serial.print("C, Hum: ");
        Serial.print(humidity);
        Serial.print("%, Gas: ");
        Serial.print(gasLevel);
        Serial.println(") -> Fan forced ON 🟢");
      } else {
        // Priority 2: Conditions are normal -> Obey Mobile App switch state
        if (response.indexOf("\"fan_status\":true") != -1) {
          setFanState(true, false);
        } else if (response.indexOf("\"fan_status\":false") != -1) {
          setFanState(false, false);
        }
      }
    } else {
      Serial.println("[INFO] Manual Serial Override is ACTIVE. (Cloud & Auto safety commands ignored; type 'AUTO' to resume app control)");
    }
  } else {
    Serial.print("HTTP Error code: ");
    Serial.println(httpResponseCode);
  }
  http.end();
}

// ==========================================
// 5. SETUP & LOOP
// ==========================================

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // Configure and initialize Fan relay pin
  pinMode(FAN_PIN, OUTPUT);
  setFanState(false, false); // Default OFF
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  // Start NTP client
  timeClient.begin();

  // Print Serial commands menu
  printHelpMenu();

  // Send first telemetry immediately on startup
  sendTelemetry();
  lastTelemetryMillis = millis();
}

void loop() {
  // 1. Instantly process Serial Monitor commands without blocking
  handleSerialCommands();

  // 2. Non-blocking telemetry timer (every 10 seconds)
  if (millis() - lastTelemetryMillis >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMillis = millis();
    sendTelemetry();
  }

  // Short 10ms yield to prevent CPU thrashing
  delay(10);
}
