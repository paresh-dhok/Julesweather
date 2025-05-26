const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Placeholder for user credentials (in a real app, use a database)
const validUsername = "anjweather";
const validPassword = "Paresh@4316";

// In-memory data store
let sensorDataStore = [];
const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

// Function to prune old data (older than 7 days)
function pruneOldData() {
  const now = new Date().getTime();
  sensorDataStore = sensorDataStore.filter(entry => {
    return (now - new Date(entry.timestamp).getTime()) < SEVEN_DAYS_IN_MS;
  });
}

// Login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Username and password are required" });
  }

  if (username === validUsername && password === validPassword) {
    res.status(200).json({ success: true, message: "Login successful" });
  } else {
    res.status(401).json({ success: false, message: "Invalid credentials" });
  }
});

// POST endpoint to store sensor data
app.post('/data', (req, res) => {
  const { csvData } = req.body;

  if (!csvData) {
    return res.status(400).json({ success: false, message: "csvData is required in the request body" });
  }

  const newEntry = {
    timestamp: new Date().toISOString(), // Store timestamp in ISO format for easier parsing
    data: csvData
  };
  sensorDataStore.push(newEntry);

  // Prune old data after adding new entry
  pruneOldData();

  res.status(201).json({ success: true, message: "Data stored successfully" });
});

// GET endpoint to retrieve sensor data
app.get('/data', (req, res) => {
  const { period, date } = req.query;
  let filteredData = [];
  const now = new Date().getTime();

  if (period) {
    if (period === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filteredData = sensorDataStore.filter(entry => new Date(entry.timestamp).getTime() >= todayStart.getTime());
    } else if (period === 'past_hour') {
      const oneHourAgo = now - (60 * 60 * 1000);
      filteredData = sensorDataStore.filter(entry => new Date(entry.timestamp).getTime() >= oneHourAgo);
    } else if (period === 'past_10_min') {
      const tenMinutesAgo = now - (10 * 60 * 1000);
      filteredData = sensorDataStore.filter(entry => new Date(entry.timestamp).getTime() >= tenMinutesAgo);
    } else {
      // Default for unrecognized period or if period is specified without a valid value
      // Could also return an error or all data. For now, return all.
      filteredData = sensorDataStore;
    }
  } else if (date) {
    // Expects date in YYYY-MM-DD format
    try {
      const specificDateStart = new Date(date);
      specificDateStart.setHours(0, 0, 0, 0); // Start of the specific day
      const specificDateEnd = new Date(date);
      specificDateEnd.setHours(23, 59, 59, 999); // End of the specific day

      filteredData = sensorDataStore.filter(entry => {
        const entryTime = new Date(entry.timestamp).getTime();
        return entryTime >= specificDateStart.getTime() && entryTime <= specificDateEnd.getTime();
      });
    } catch (error) {
      return res.status(400).json({ success: false, message: "Invalid date format. Please use YYYY-MM-DD." });
    }
  } else {
    // Default: return all data if no specific query parameter is provided
    // Alternative: return data from the last 24 hours
    const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
    filteredData = sensorDataStore.filter(entry => new Date(entry.timestamp).getTime() >= twentyFourHoursAgo);
    // Or simply: filteredData = sensorDataStore; to return all data
  }

  res.status(200).json({ success: true, data: filteredData });
});

// GET endpoint to provide ESP32-CAM image capture details
app.get('/request_image_capture', (req, res) => {
  // In a real application, this IP might be stored in a config file,
  // environment variable, or discovered via mDNS or a registration process.
  const esp32CamIp = process.env.ESP32_CAM_IP || "192.168.1.150"; // Placeholder or from env

  res.status(200).json({
    success: true,
    esp32_cam_ip: esp32CamIp,
    capture_endpoint: "/capture_image" // As defined in esp32_cam_controller.ino
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Optional: Periodically prune data even if no new data is posted
  setInterval(pruneOldData, 6 * 60 * 60 * 1000); // e.g., every 6 hours
});
