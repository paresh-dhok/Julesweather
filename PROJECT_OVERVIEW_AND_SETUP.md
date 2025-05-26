# Project Overview and Setup Guide

## 1. Project Overview

This project implements a comprehensive weather and environmental monitoring system. It consists of four main components:

*   **Arduino Nano/Uno:** Responsible for collecting data from various analog and digital sensors, including air quality, rain, UV index, sound level, temperature, humidity, pressure, light intensity, and wind data (via Modbus RS485). It sends this data as a CSV string to the ESP32-CAM.
*   **ESP32-CAM:** Acts as a bridge and a web server. It receives sensor data from the Arduino, posts this data to a backend server, and can serve this data locally. It also captures images using its camera and serves them over Wi-Fi.
*   **Backend Server (Node.js/Express):** Provides API endpoints for user login, storing sensor data received from the ESP32-CAM, and retrieving historical sensor data. It also provides a hint for the ESP32-CAM's IP address for image capture.
*   **Frontend Website (HTML, CSS, JavaScript):** A web interface for users to log in, view current and historical sensor data, and request live images from the ESP32-CAM.

## 2. Component Setup and Configuration

### Arduino (`arduino_weather_station.ino`)

*   **Sensors and Pins:**
    *   MQ-135 Air Quality Sensor: `A0` (Analog)
    *   Raindrop Detection Module: `D2` (Digital)
    *   CJMCU-GUVA-S12SD UV Index Sensor: `A1` (Analog)
    *   LM393 Sound Module: `A2` (Analog)
    *   BME280 (Temperature, Humidity, Pressure): I2C - `A4` (SDA), `A5` (SCL)
    *   BH1750 (Light Intensity): I2C - `A4` (SDA), `A5` (SCL)
    *   RS485 Wind Sensor (via MAX485):
        *   SoftwareSerial RX (RO): `D3`
        *   SoftwareSerial TX (DI): `D4`
        *   Driver/Receiver Enable (DE/RE): `D5`
*   **Serial Communication (to ESP32):** 9600 baud rate.
*   **Modbus Settings (Wind Sensor):**
    *   Slave ID: `1` (placeholder, configure as per your sensor)
    *   Wind Data Start Register: `0x0000` (placeholder, expecting speed at 0x0000, direction at 0x0001. Configure as per your sensor manual).
    *   Number of Registers to Read: `2`.
*   **Libraries Required:**
    *   `Wire.h`
    *   `Adafruit_Sensor.h`
    *   `Adafruit_BME280.h`
    *   `BH1750.h`
    *   `SoftwareSerial.h`
    *   `ModbusMaster.h`

### ESP32-CAM (`esp32_cam_controller.ino`)

*   **Wi-Fi Credentials:**
    *   `ssid`: "YOUR_WIFI_SSID" - **MUST BE CHANGED to your Wi-Fi network name.**
    *   `password`: "YOUR_WIFI_PASSWORD" - **MUST BE CHANGED to your Wi-Fi password.**
*   **Serial Communication (from Arduino):**
    *   Uses `Serial2` (UART2).
    *   RX2 pin: `GPIO16`
    *   TX2 pin: `GPIO17` (though TX2 is not strictly used to send to Arduino in this setup)
    *   Baud rate: 9600.
*   **Camera Model:** Assumes AI-THINKER model pin configuration.
*   **Backend Server URL:**
    *   `backend_host`: "http://your-backend-app.herokuapp.com" - **MUST BE CHANGED to your deployed backend server's address.** (e.g., Heroku URL, Vercel URL, or local IP for testing like "http://192.168.1.XXX").
    *   `backend_data_endpoint`: "/data" (usually no change needed).
*   **Local Endpoints Provided by ESP32-CAM:**
    *   `/`: Root path, provides basic HTML with links.
    *   `/sensordata`: Serves the latest CSV data string received from Arduino as plain text.
    *   `/capture_image`: Captures and serves a JPEG image from the camera.
*   **Libraries Required:**
    *   `WiFi.h`
    *   `esp_camera.h`
    *   `WebServer.h`
    *   `HTTPClient.h`

### Backend Server (`backend_server/server.js`)

*   **Login Credentials (Hardcoded):**
    *   Username: "anjweather"
    *   Password: "Paresh@4316"
    *   (Note: For demo purposes only. See security recommendations.)
*   **Port:** `process.env.PORT || 3000` (suitable for Heroku or local development).
*   **Data Storage:** Currently in-memory (`sensorDataStore` array). Data will be lost on server restart. **Strongly recommend replacing with a persistent database.**
*   **API Endpoints:**
    *   `POST /login`: For user authentication.
    *   `POST /data`: To store sensor data (expects `{"csvData":"..."}`).
    *   `GET /data`: To retrieve sensor data, filterable by query parameters (`period`, `date`).
    *   `GET /request_image_capture`: Provides ESP32-CAM IP hint and image endpoint to the frontend.
*   **Environment Variable for ESP32-CAM IP:**
    *   The `/request_image_capture` endpoint uses `process.env.ESP32_CAM_IP || "192.168.1.150"`. For deployed or dynamic IP scenarios, setting the `ESP32_CAM_IP` environment variable on the backend server is one way to manage this. Otherwise, the placeholder "192.168.1.150" is used, which **MUST BE CHANGED** if your ESP32-CAM has a different IP.
*   **Dependencies (from `package.json`):**
    *   `express`: "^4.17.1"

### Frontend (`frontend_website/`)

*   **Backend URL:**
    *   Hardcoded in `frontend_website/script.js` and `frontend_website/dashboard.js` as `const BACKEND_URL = 'http://localhost:3000';`.
    *   **MUST BE CHANGED to your deployed backend server's address when the frontend is deployed or if the backend is not running locally.**
*   **Assumed CSV Header Order (in `dashboard.js`):**
    *   `["MQ135 (Air Quality)", "Rain Digital", "UV Index", "Sound Level", "Temperature (C)", "Humidity (%)", "Pressure (hPa)", "Light (lx)", "Wind Speed (m/s)", "Wind Direction (deg)"]`
    *   This order must match the CSV string constructed by the Arduino.

## 3. Deployment Guidance

### Arduino (`arduino_weather_station.ino`)

1.  Open the sketch in the Arduino IDE.
2.  Install the required libraries (Adafruit BME280, BH1750, ModbusMaster) via the Library Manager.
3.  Select the correct board (e.g., Arduino Uno/Nano) and port.
4.  Upload the sketch.

### ESP32-CAM (`esp32_cam_controller.ino`)

1.  Open the sketch in the Arduino IDE.
2.  Ensure you have the ESP32 board definitions installed in the Arduino IDE.
3.  Select the correct board (e.g., "AI Thinker ESP32-CAM").
4.  **Modify Wi-Fi credentials and backend server URL in the sketch.**
5.  Upload the sketch. This often requires specific steps like holding down the GPIO0 button while powering on/resetting to enter bootloader mode.

### Backend Server (`backend_server/`)

1.  **Prerequisites:** Node.js and npm installed.
2.  Navigate to the `backend_server` directory.
3.  Run `npm install` to install dependencies.
4.  **Local Development:**
    *   Run `npm start` to start the server locally (typically on `http://localhost:3000`).
    *   You might need to set the `ESP32_CAM_IP` environment variable if your ESP32-CAM's IP is not the placeholder.
5.  **Deployment Options:**
    *   **Heroku:**
        *   The `Procfile` (`web: node server.js`) is included, making it Heroku-ready.
        *   Commit to a Git repository, create a Heroku app, and deploy.
        *   Set necessary environment variables on Heroku (e.g., `ESP32_CAM_IP`).
    *   **Vercel/Netlify (Serverless Functions):**
        *   The current Express server structure is more suited for traditional Node.js hosting (like Heroku) or a VPS.
        *   For Vercel/Netlify, you would typically refactor the endpoints into serverless functions. Vercel can sometimes auto-detect Express apps, but it's good to check their specific Node.js deployment guides.

### Frontend (`frontend_website/`)

1.  **Local Development:**
    *   Simply open `frontend_website/index.html` in a web browser.
    *   **Note:** If the backend server is running on a different origin (e.g., deployed Heroku vs. local file), you might encounter CORS (Cross-Origin Resource Sharing) issues. For development, serving the frontend via a local HTTP server (e.g., using VS Code Live Server extension, or `npx serve`) can mitigate this if the backend is also local or has CORS configured.
    *   **Ensure the `BACKEND_URL` in `script.js` and `dashboard.js` points to your running backend server.**
2.  **Deployment Options (Static Site Hosting):**
    *   **Vercel:** Connect your Git repository, and Vercel will automatically build and deploy the static files.
    *   **Netlify:** Similar to Vercel, connect Git, and Netlify will deploy.
    *   **GitHub Pages:** Another option for static sites.
    *   Remember to update `BACKEND_URL` in JavaScript files to point to the deployed backend before building for production if it's hardcoded.

## 4. Data Flow Summary

1.  **Arduino to ESP32:** Arduino reads all connected sensors, formats the data into a single CSV string, and sends it via Serial (TX pin) to the ESP32-CAM (RX2 pin) at 9600 baud.
2.  **ESP32 Processing & Local Serving:**
    *   The ESP32-CAM receives the CSV string from the Arduino.
    *   It updates its internal `latestSensorData` variable.
    *   This `latestSensorData` is served on its local `/sensordata` web endpoint when requested.
3.  **ESP32 to Backend:**
    *   After receiving and updating `latestSensorData`, the ESP32-CAM makes an HTTP POST request to the Backend Server's `/data` endpoint, sending the CSV data in a JSON payload (`{"csvData":"..."}`).
4.  **ESP32 Image Capture:**
    *   When a request is made to the ESP32-CAM's `/capture_image` endpoint, it captures an image using its camera and serves it as a JPEG.
5.  **Frontend Login:**
    *   User enters credentials on `frontend_website/index.html`.
    *   JavaScript sends a POST request to the Backend Server's `/login` endpoint.
    *   On success, redirects to `dashboard.html`.
6.  **Frontend Dashboard Operations:**
    *   **"Get Current Data":**
        1.  Frontend calls Backend's `/request_image_capture` to get the ESP32-CAM's IP and sensor data endpoint (`/sensordata`).
        2.  The current implementation in `dashboard.js` uses a workaround: it fetches data from the backend `/data?period=past_10_min` as a proxy for live ESP32 data. For direct ESP32 data, it *would* use the IP from step 1 to call `http://<ESP32_IP>/sensordata`.
    *   **"Get Historical Data":**
        1.  Frontend calls Backend's `/data` endpoint with a selected period (e.g., `?period=today`).
        2.  Backend returns historical data from its store.
    *   **"Capture New Image":**
        1.  Frontend calls Backend's `/request_image_capture` to get the ESP32-CAM's IP and image capture endpoint (`/capture_image`).
        2.  Frontend then makes a direct request to `http://<ESP32_IP>/capture_image` to display the image.

## 5. Recommendations for Improvement & Persistence

*   **Persistent Database:**
    *   The current backend uses an in-memory array (`sensorDataStore`) for data storage. This is volatile; data is lost when the server restarts.
    *   **Strongly recommend** migrating to a persistent database solution. Options include:
        *   **Cloud NoSQL:** MongoDB Atlas (free tier), Firebase Firestore (generous free tier).
        *   **Cloud SQL:** Supabase (PostgreSQL, free tier), ElephantSQL (PostgreSQL, free tier), PlanetScale (MySQL compatible, free tier).
    *   This will ensure data durability, enable more complex queries, and improve scalability.

*   **Configuration Management:**
    *   Sensitive data like Wi-Fi credentials, backend URLs, API keys, and database connection strings should not be hardcoded.
    *   **Use environment variables:**
        *   For ESP32-CAM: Consider using a `config.h` file (added to `.gitignore`) or a more advanced Wi-Fi provisioning method for credentials. Backend URL can also be managed this way.
        *   For Backend Server: Use `.env` files for local development (with `dotenv` package) and configure environment variables directly in the deployment platform (Heroku, Vercel).

*   **Error Handling:**
    *   Current error handling is basic (e.g., `Serial.println` for Arduino/ESP32, `console.error` and simple messages for backend/frontend).
    *   **Enhance error handling:**
        *   Provide more specific and user-friendly error messages on the frontend.
        *   Implement more robust error catching and logging in all components.
        *   Consider retry mechanisms for network requests (e.g., ESP32 to backend).

*   **Security:**
    *   **Login:** The hardcoded username/password in the backend is for demonstration only. For any real application:
        *   Implement proper user authentication (e.g., OAuth, JWT).
        *   Hash and salt passwords in the database.
        *   Store tokens securely on the client-side (e.g., HttpOnly cookies for web).
    *   **HTTPS:** Use HTTPS for the backend server to encrypt data in transit. Most deployment platforms (Heroku, Vercel) provide this automatically. For the ESP32-CAM, HTTPS is more complex but possible for local communication if you manage certificates.
    *   **Input Validation:** Implement comprehensive input validation on the backend for all incoming data (body, query parameters, headers) to prevent common vulnerabilities.
    *   **API Rate Limiting & Authorization:** For public-facing APIs, consider rate limiting and more granular authorization for different endpoints.

*   **ESP32-CAM IP Address Discovery:**
    *   The current method of getting the ESP32-CAM's IP to the frontend (via backend `/request_image_capture` which uses an environment variable or a hardcoded placeholder) can be brittle, especially with dynamic IP addresses.
    *   **More robust solutions:**
        *   **mDNS (Multicast DNS):** Implement mDNS on the ESP32-CAM (e.g., using `ESPmDNS.h` library) to allow discovery by hostname (e.g., `http://esp32cam.local`) on the local network. The frontend would need to be on the same network.
        *   **Registration Service:** The ESP32-CAM could register its IP address with the backend server on startup or periodically. The backend then provides the latest registered IP.
        *   **Static IP:** Assign a static IP address to the ESP32-CAM on your local network (via router configuration).

This document provides a comprehensive guide to understanding, setting up, and deploying the weather station project. Remember to address the highlighted **MUST BE CHANGED** sections for successful operation.
