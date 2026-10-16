#include "esp_camera.h"
#include "mbedtls/md.h"
#include <HTTPClient.h>
#include <NTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiUdp.h>

// ==========================================
// 1. NETWORK & CLOUD CONFIGURATION
// ==========================================
const char *WIFI_SSID = "Thejas";
const char *WIFI_PASSWORD = "9900449281";

// Supabase Edge Function URL for ingest-camera-snapshot
const char *CLOUD_SNAPSHOT_URL = "https://zavjkhdvrvfphxqgnhqq.supabase.co/"
                                 "functions/v1/ingest-camera-snapshot";

// Hardware Security Key (MUST match the backend ingest-camera-snapshot
// index.ts)
const String SECRET_KEY = "agro_secret_key_123";
const String DEVICE_ID = "ESP32_WAREHOUSE_01";

// Upload Interval (every 30 seconds)
const unsigned long CAPTURE_INTERVAL_MS = 10000;
unsigned long lastCaptureMillis = 0;

// Flash illumination on capture (set true if warehouse is dark)
const bool USE_FLASH_STROBE = false;

// ==========================================
// 2. CAMERA PIN DEFINITION (AI-THINKER OV2640)
// ==========================================
#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27
#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22
#define FLASH_LED_PIN 4

// ==========================================
// 3. NTP CLIENT & SECURITY HELPERS
// ==========================================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org");

// Generate HMAC-SHA256 signature for "deviceId:timestamp"
String generateSignature(String payload) {
  byte hmacResult[32];
  mbedtls_md_context_t ctx;
  mbedtls_md_type_t md_type = MBEDTLS_MD_SHA256;

  mbedtls_md_init(&ctx);
  mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(md_type), 1);
  mbedtls_md_hmac_starts(&ctx, (const unsigned char *)SECRET_KEY.c_str(),
                         SECRET_KEY.length());
  mbedtls_md_hmac_update(&ctx, (const unsigned char *)payload.c_str(),
                         payload.length());
  mbedtls_md_hmac_finish(&ctx, hmacResult);
  mbedtls_md_free(&ctx);

  String signature = "";
  for (int i = 0; i < 32; i++) {
    char str[3];
    sprintf(str, "%02x", (int)hmacResult[i]);
    signature += str;
  }
  return signature;
}

// ==========================================
// 4. CAMERA INITIALIZATION
// ==========================================
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;

  // Utilize external PSRAM if available
  if (psramFound()) {
    Serial.println("[CAM] PSRAM detected! Enabling SVGA (800x600) mode.");
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12; // 0-63, lower means higher quality
    config.fb_count =
        1; // Single buffer is optimal for snapshots and prevents DMA exhaustion
  } else {
    Serial.println("[CAM] No PSRAM detected. Falling back to QVGA (320x240).");
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 14;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM ERROR] Camera init failed with error 0x%x\n", err);
    return false;
  }

  // Adjust sensor settings for clear warehouse crop monitoring
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    s->set_brightness(s, 1); // -2 to 2
    s->set_contrast(s, 1);   // -2 to 2
    s->set_saturation(s, 0); // -2 to 2
    s->set_whitebal(s, 1);   // 0 = disable, 1 = enable
    s->set_awb_gain(s, 1);   // 0 = disable, 1 = enable
  }

  Serial.println("[CAM] Camera initialized successfully.");
  return true;
}

// ==========================================
// 5. CAPTURE & UPLOAD SNAPSHOT
// ==========================================
void captureAndUploadSnapshot() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Not connected. Attempting reconnection...");
    WiFi.reconnect();
    return;
  }

  // Update time for anti-replay timestamp verification
  timeClient.update();
  unsigned long timestamp = timeClient.getEpochTime();
  if (timestamp < 100000) {
    Serial.println("[NTP] Invalid time received. Skipping this cycle.");
    return;
  }

  Serial.println("\n[CAM] Capturing warehouse snapshot...");

  if (USE_FLASH_STROBE) {
    digitalWrite(FLASH_LED_PIN, HIGH);
    delay(50); // Small pre-flash delay
  }

  camera_fb_t *fb = esp_camera_fb_get();

  if (USE_FLASH_STROBE) {
    digitalWrite(FLASH_LED_PIN, LOW);
  }

  if (!fb) {
    Serial.println("[CAM ERROR] Camera capture failed!");
    return;
  }

  Serial.printf("[CAM] Captured frame size: %u bytes\n", fb->len);

  // Generate security signature: message = "deviceId:timestamp"
  String payloadSign = DEVICE_ID + ":" + String(timestamp);
  String signature = generateSignature(payloadSign);

  // Initialize secure HTTP client
  WiFiClientSecure client;
  client.setInsecure(); // Skip certificate verification for serverless endpoint

  HTTPClient http;
  if (http.begin(client, CLOUD_SNAPSHOT_URL)) {
    http.addHeader("Content-Type", "image/jpeg");
    http.addHeader("x-device-id", DEVICE_ID);
    http.addHeader("x-device-timestamp", String(timestamp));
    http.addHeader("x-device-signature", signature);

    Serial.println("[HTTP] Uploading snapshot to Supabase...");
    int httpResponseCode = http.sendRequest("POST", fb->buf, fb->len);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.printf("[HTTP] Success response (%d): %s\n", httpResponseCode,
                    response.c_str());
    } else {
      Serial.printf("[HTTP ERROR] Upload failed, error: %s\n",
                    http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("[HTTP ERROR] Unable to connect to snapshot endpoint.");
  }

  // MUST return frame buffer to avoid memory exhaustion
  esp_camera_fb_return(fb);
}

// ==========================================
// 6. SETUP & LOOP
// ==========================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n==========================================");
  Serial.println("  AGROBRIDGE ESP32-CAM WAREHOUSE MONITOR  ");
  Serial.println("==========================================");

  // Keep Flash LED off by default
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);

  // 1. Initialize camera FIRST before WiFi allocates DMA buffers
  if (!initCamera()) {
    Serial.println(
        "[FATAL] Camera could not be started. Check wiring / ribbon cable.");
    return;
  }

  // 2. Connect to Wi-Fi AFTER camera has successfully claimed its DMA buffers
  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WIFI] Connected successfully!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(
        "\n[WIFI WARNING] Wi-Fi connection timed out. Will retry in loop.");
  }

  // Start NTP
  timeClient.begin();

  // Send initial snapshot on startup
  delay(1000);
  captureAndUploadSnapshot();
  lastCaptureMillis = millis();
}

void loop() {
  // Capture snapshot on non-blocking timer interval
  if (millis() - lastCaptureMillis >= CAPTURE_INTERVAL_MS) {
    lastCaptureMillis = millis();
    captureAndUploadSnapshot();
  }

  delay(20);
}
