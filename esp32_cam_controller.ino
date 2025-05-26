// Include necessary libraries
#include <WiFi.h>
#include "esp_camera.h" // For camera functions
#include <WebServer.h>   // For the web server
#include <HTTPClient.h>  // For making HTTP POST requests

// Define placeholder Wi-Fi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Define the serial port for communication with Arduino
HardwareSerial ArduinoSerial(2); // Use UART2 (Serial2) -> RX2=GPIO16, TX2=GPIO17

// Backend Server Details (IMPORTANT: Replace with your actual server details)
const char* backend_host = "http://your-backend-app.herokuapp.com"; // Or "http://192.168.1.XXX" for local LAN
const int backend_port = 80; // Or 3000 for local, 443 for HTTPS if your server uses it
const char* backend_data_endpoint = "/data";
// Note: If backend_host includes http:// or https://, HTTPClient handles it.
// If backend_port is 80 for HTTP or 443 for HTTPS, it's often not needed in the URL for http.begin().

// ESP32-CAM (AI-THINKER model) Pin Configuration
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1 // -1 if not used
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26 // SDA
#define SIOC_GPIO_NUM     27 // SCL
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Web Server object
WebServer server(80);

// Global variable to store the latest sensor data from Arduino
String latestSensorData = "No data yet"; // Initialize with a default message

// Function to initialize the camera
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
  config.pin_sscb_sda = SIOD_GPIO_NUM; // Changed from pin_sccb_sda
  config.pin_sscb_scl = SIOC_GPIO_NUM; // Changed from pin_sccb_scl
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG; // JPEG format for web streaming
  config.frame_size = FRAMESIZE_QVGA; // (320x240) - Small size for faster transmission
  config.jpeg_quality = 12; // 0-63 lower number means higher quality
  config.fb_count = 1;      // Use 1 frame buffer in PSRAM

  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }
  Serial.println("Camera initialized successfully.");
  return true;
}

// Handler for the root path
void handleRoot() {
  String html = "<h1>ESP32-CAM Weather Station</h1>";
  html += "<p>Welcome! Use the following endpoints:</p>";
  html += "<ul>";
  html += "<li><a href='/sensordata'>/sensordata</a> - Get the latest sensor readings from Arduino.</li>";
  html += "<li><a href='/capture_image'>/capture_image</a> - Capture and view an image.</li>";
  html += "</ul>";
  server.send(200, "text/html", html);
}

// Handler for sensor data
void handleSensorData() {
  server.send(200, "text/plain", latestSensorData);
}

// Handler for the ESP32's own sensor data endpoint
void handleEspSensorData() {
  server.send(200, "text/plain", latestSensorData);
}

// Handler for capturing and sending an image
void handleCaptureImage() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    server.send(500, "text/plain", "Failed to capture image");
    return;
  }

  server.setContentLength(fb->len);
  server.sendHeader("Content-Type", "image/jpeg");
  WiFiClient client = server.client();
  client.write(fb->buf, fb->len);
  
  esp_camera_fb_return(fb); // Return frame buffer to be reused
  Serial.println("Image captured and sent.");
}

void setup() {
  // Initialize Serial communication for ESP32 debugging
  Serial.begin(115200);
  while (!Serial) {
    ; // wait for serial port to connect.
  }
  Serial.println("ESP32-CAM Controller Sketch Initialized");

  // Initialize Camera
  if (!initCamera()) {
    Serial.println("Camera initialization failed! Halting.");
    // You might want to add specific error handling here, e.g. reboot or indicate error via LED
    // For now, we'll let it proceed to try and connect to WiFi for sensor data,
    // but image capture will likely fail.
  }

  // Initialize Serial2 for communication with Arduino
  ArduinoSerial.begin(9600, SERIAL_8N1, 16, 17); // RX2=GPIO16, TX2=GPIO17
  Serial.println("Serial2 initialized for Arduino communication (RX2 on GPIO16, TX2 on GPIO17)");

  // Connect to Wi-Fi
  Serial.print("Connecting to WiFi SSID: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    // Define server routes
    server.on("/", HTTP_GET, handleRoot);
    server.on("/sensordata", HTTP_GET, handleEspSensorData); // Endpoint for ESP32's own data
    server.on("/capture_image", HTTP_GET, handleCaptureImage);

    // Start the server
    server.begin();
    Serial.println("Web server started. Access it at http://" + WiFi.localIP().toString() + "/");
  } else {
    Serial.println("\nFailed to connect to WiFi. Web server not started.");
  }
}

void loop() {
  // Handle client requests
  server.handleClient();

  // Check if data is available from Arduino on Serial2
  if (ArduinoSerial.available() > 0) {
    String dataFromArduino = ArduinoSerial.readStringUntil('\n');
    dataFromArduino.trim(); 

    if (dataFromArduino.length() > 0) { // Ensure we received some data
        latestSensorData = dataFromArduino; // Update the global variable

        Serial.print("Received from Arduino & updated latestSensorData: ");
        Serial.println(latestSensorData);

        // Send the newly received data to the backend server
        sendDataToBackend(latestSensorData);
    }
  }
  
  delay(10); // Small delay to yield to other tasks
}

// Function to send sensor data to the backend server
void sendDataToBackend(String csvData) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    
    // Construct URL:
    // Option 1: If backend_host is just the domain/IP (e.g., "your-backend.com")
    // String serverUrl = String(backend_host) + ":" + String(backend_port) + String(backend_data_endpoint);
    // Option 2: If backend_host includes http:// (e.g., "http://your-backend.com")
    String serverUrl = String(backend_host) + String(backend_data_endpoint);
    // If your backend_host does not include "http://" and your port is not 80, you might need:
    // http.begin(backend_host, backend_port, backend_data_endpoint);
    // For now, assuming backend_host is like "http://server.com" or IP "http://192.168.1.100" and port is part of it or standard.

    Serial.print("Connecting to backend: ");
    Serial.println(serverUrl);
    
    // For local IP without http, use: http.begin(client, backend_host, backend_port, backend_data_endpoint);
    // WiFiClient client; // if needed for http.begin(client,...)
    // http.begin(client, serverUrl); // If serverUrl is just domain/IP and port
    http.begin(serverUrl); // Preferred if serverUrl is "http://..."

    http.addHeader("Content-Type", "application/json");

    // Create JSON payload
    String payload = "{\"csvData\":\"" + csvData + "\"}";
    Serial.print("Sending payload: ");
    Serial.println(payload);

    int httpResponseCode = http.POST(payload);

    if (httpResponseCode > 0) {
      String responsePayload = http.getString();
      Serial.print("HTTP Response code: ");
      Serial.println(httpResponseCode);
      Serial.print("Response payload: ");
      Serial.println(responsePayload);
    } else {
      Serial.print("Error on sending POST: ");
      Serial.println(httpResponseCode);
      Serial.printf("HTTPClient error: %s\n", http.errorToString(httpResponseCode).c_str());
    }

    http.end();
  } else {
    Serial.println("WiFi Disconnected. Cannot send data to backend.");
  }
}
