document.addEventListener('DOMContentLoaded', () => {
    const currentDataDisplay = document.getElementById('currentDataDisplay');
    const historicalDataDisplay = document.getElementById('historicalDataDisplay');
    const getCurrentDataBtn = document.getElementById('getCurrentData');
    const getHistoricalDataBtn = document.getElementById('getHistoricalData');
    const dataPeriodSelect = document.getElementById('dataPeriod');

    // Image related elements
    const weatherImage = document.getElementById('weatherImage');
    const imageMessage = document.getElementById('imageMessage');
    const captureImageBtn = document.getElementById('captureImageBtn');
    const downloadImageBtn = document.getElementById('downloadImageBtn');


    // Backend server URL
    const BACKEND_URL = 'http://localhost:3000';

    // CSV data headers in order
    const CSV_HEADERS = [
        "MQ135 (Air Quality)", "Rain Digital", "UV Index", "Sound Level", 
        "Temperature (C)", "Humidity (%)", "Pressure (hPa)", "Light (lx)",
        "Wind Speed (m/s)", "Wind Direction (deg)"
    ];

    // --- Helper Functions ---
    function parseCSVData(csvString) {
        if (!csvString || typeof csvString !== 'string') {
            console.error("Invalid CSV string:", csvString);
            return null;
        }
        const values = csvString.split(',');
        const dataObject = {};
        CSV_HEADERS.forEach((header, index) => {
            dataObject[header] = values[index] ? values[index].trim() : 'N/A';
        });
        return dataObject;
    }

    function displayData(element, dataObject, isCurrent = true) {
        if (!dataObject) {
            element.innerHTML = '<p>Error parsing data or no data received.</p>';
            return;
        }
        let html = '<ul>';
        for (const key in dataObject) {
            html += `<li><strong>${key}:</strong> ${dataObject[key]}</li>`;
        }
        html += '</ul>';
        if (isCurrent) {
            element.innerHTML = html;
        } else {
            // For historical data, we might want to append or format differently
            const entryDiv = document.createElement('div');
            entryDiv.classList.add('historical-entry');
            if (dataObject.timestamp) { // Assuming historical data objects will have a timestamp
                 entryDiv.innerHTML = `<h4>Timestamp: ${new Date(dataObject.timestamp).toLocaleString()}</h4>${html}`;
            } else {
                entryDiv.innerHTML = html;
            }
            element.appendChild(entryDiv);
        }
    }
    
    function displayHistoricalTable(element, dataArray) {
        if (!dataArray || dataArray.length === 0) {
            element.innerHTML = '<p>No historical data found for this period.</p>';
            return;
        }

        let tableHtml = '<table><thead><tr><th>Timestamp</th>';
        CSV_HEADERS.forEach(header => {
            tableHtml += `<th>${header}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        dataArray.forEach(entry => {
            const parsedData = parseCSVData(entry.data);
            if (parsedData) {
                tableHtml += `<tr><td>${new Date(entry.timestamp).toLocaleString()}</td>`;
                CSV_HEADERS.forEach(header => {
                    tableHtml += `<td>${parsedData[header] || 'N/A'}</td>`;
                });
                tableHtml += '</tr>';
            }
        });

        tableHtml += '</tbody></table>';
        element.innerHTML = tableHtml;
    }


    // --- Fetch Functions ---
    async function fetchCurrentData() {
        currentDataDisplay.innerHTML = '<p>Fetching current data...</p>';
        try {
            // 1. Get ESP32 IP and image capture endpoint from our backend
            const backendResponse = await fetch(`${BACKEND_URL}/request_image_capture`);
            if (!backendResponse.ok) {
                throw new Error(`Backend request failed: ${backendResponse.statusText}`);
            }
            const backendResult = await backendResponse.json();

            if (!backendResult.success || !backendResult.esp32_cam_ip) {
                throw new Error('Backend did not provide ESP32 IP.');
            }

            const esp32Ip = backendResult.esp32_cam_ip;
            // The ESP32-CAM itself should have an endpoint that serves sensor data
            // Assuming it's directly at '/sensordata' on the ESP32-CAM, not proxied by our backend server
            // The Arduino sketch sends data as a single CSV string via Serial.println(dataPacket)
            // The ESP32 sketch reads this via ArduinoSerial.readStringUntil('\n') and should expose it.
            // Let's assume the esp32_cam_controller.ino was updated to have a /sensordata endpoint
            // that just returns the latestSensorData string.
            
            // For this step, we assume the ESP32-CAM has a /sensordata endpoint
            // that returns the CSV string directly.
            // If the ESP32-CAM's /sensordata endpoint is not yet implemented, this will fail.
            // We will simulate this for now as the ESP32-CAM sketch modification for /sensordata is not explicitly part of this step.
            // The current esp32_cam_controller.ino only logs it to its own Serial.
            // We will need to modify esp32_cam_controller.ino to serve `latestSensorData` on a GET request to `/sensordata`.
            // For now, let's proceed with the frontend logic assuming such an endpoint exists on ESP32.
            
            // SIMULATED ESP32 Direct Data Fetch:
            // This part will be updated if the ESP32-CAM sketch is modified to serve data.
            // For now, we'll display a message that this is a placeholder.
            // currentDataDisplay.innerHTML = `<p>Attempting to fetch from ESP32 at http://${esp32Ip}/sensordata ... (This needs ESP32 to serve data on this path)</p>`;
            // const espResponse = await fetch(`http://${esp32Ip}/sensordata`); // THIS IS THE TARGET
            // if (!espResponse.ok) {
            //    throw new Error(`ESP32 direct data fetch failed: ${espResponse.statusText}`);
            // }
            // const csvData = await espResponse.text();
            
            // For now, as the ESP32 is not serving this directly yet,
            // let's use the backend's /data endpoint with 'past_10_min' as a proxy for "current"
            // This is a temporary workaround until ESP32 serves its own /sensordata endpoint.
            console.warn("Using backend's 'past_10_min' as a proxy for current ESP32 data. ESP32 should ideally serve its own /sensordata.");
            const proxyResponse = await fetch(`${BACKEND_URL}/data?period=past_10_min`);
            if (!proxyResponse.ok) throw new Error(`Proxy data fetch failed: ${proxyResponse.statusText}`);
            const proxyResult = await proxyResponse.json();
            if (proxyResult.success && proxyResult.data.length > 0) {
                // Get the latest entry from the "past 10 min"
                const latestEntry = proxyResult.data[proxyResult.data.length - 1];
                const parsedData = parseCSVData(latestEntry.data);
                displayData(currentDataDisplay, parsedData);
            } else if (proxyResult.data.length === 0) {
                currentDataDisplay.innerHTML = '<p>No current data available from proxy (past 10 min).</p>';
            } else {
                 currentDataDisplay.innerHTML = '<p>Could not fetch current data via proxy.</p>';
            }

        } catch (error) {
            console.error('Error fetching current data:', error);
            currentDataDisplay.innerHTML = `<p>Error fetching current data: ${error.message}</p>`;
        }
    }

    async function fetchHistoricalData(period) {
        historicalDataDisplay.innerHTML = `<p>Fetching historical data for ${period}...</p>`;
        try {
            const response = await fetch(`${BACKEND_URL}/data?period=${period}`);
            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }
            const result = await response.json();

            if (result.success && result.data) {
                displayHistoricalTable(historicalDataDisplay, result.data);
            } else {
                historicalDataDisplay.innerHTML = '<p>No data found or error fetching data.</p>';
            }
        } catch (error) {
            console.error('Error fetching historical data:', error);
            historicalDataDisplay.innerHTML = `<p>Error fetching historical data: ${error.message}</p>`;
        }
    }

    // --- Event Listeners ---
    if (getCurrentDataBtn) {
        getCurrentDataBtn.addEventListener('click', fetchCurrentData);
    }

    if (getHistoricalDataBtn && dataPeriodSelect) {
        getHistoricalDataBtn.addEventListener('click', () => {
            const selectedPeriod = dataPeriodSelect.value;
            fetchHistoricalData(selectedPeriod);
        });
    }

    // --- Initial Load ---
    fetchCurrentData(); // Load current data when the page loads
    // Optionally, load default historical data too
    // fetchHistoricalData(dataPeriodSelect.value); 


    // --- Image Handling Functions ---
    async function captureImage() {
        if (!weatherImage || !imageMessage || !downloadImageBtn) {
            console.error("Image related DOM elements not found.");
            return;
        }

        imageMessage.textContent = "Requesting image capture info...";
        weatherImage.style.display = 'none'; // Hide previous image
        downloadImageBtn.style.display = 'none'; // Hide download button

        try {
            const response = await fetch(`${BACKEND_URL}/request_image_capture`);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Backend request for image info failed: ${errorResult.message || response.statusText}`);
            }
            const result = await response.json();

            if (result.success && result.esp32_cam_ip && result.capture_endpoint) {
                const imageUrl = `http://${result.esp32_cam_ip}${result.capture_endpoint}`;
                
                imageMessage.textContent = "Capturing image from ESP32-CAM...";
                
                // Preload image to handle potential errors before showing
                const tempImg = new Image();
                tempImg.onload = () => {
                    weatherImage.src = imageUrl;
                    weatherImage.style.display = 'block';
                    downloadImageBtn.style.display = 'inline-block';
                    imageMessage.textContent = "Image loaded successfully.";
                };
                tempImg.onerror = () => {
                    throw new Error(`Failed to load image from ESP32-CAM at ${imageUrl}. Check ESP32-CAM status and network.`);
                };
                tempImg.src = imageUrl; // Start loading

            } else {
                throw new Error(result.message || "Failed to get valid image capture details from backend.");
            }
        } catch (error) {
            console.error('Error capturing image:', error);
            imageMessage.textContent = `Error: ${error.message}`;
            weatherImage.style.display = 'none';
            downloadImageBtn.style.display = 'none';
        }
    }

    // --- Event Listeners ---
    // (Existing listeners for data)
    if (getCurrentDataBtn) {
        getCurrentDataBtn.addEventListener('click', fetchCurrentData);
    }

    if (getHistoricalDataBtn && dataPeriodSelect) {
        getHistoricalDataBtn.addEventListener('click', () => {
            const selectedPeriod = dataPeriodSelect.value;
            fetchHistoricalData(selectedPeriod);
        });
    }

    // New listener for image capture
    if (captureImageBtn) {
        captureImageBtn.addEventListener('click', captureImage);
    }

    // Optional: Listener for download button
    if (downloadImageBtn && weatherImage) {
        downloadImageBtn.addEventListener('click', () => {
            if (weatherImage.src && weatherImage.src !== '#') { // Ensure there's a valid image source
                window.open(weatherImage.src, '_blank');
            } else {
                imageMessage.textContent = "No image to download.";
            }
        });
    }

    // --- Initial Load ---
    fetchCurrentData(); // Load current data when the page loads
    // Optionally, load default historical data too
    // fetchHistoricalData(dataPeriodSelect.value); 
});
