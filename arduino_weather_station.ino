// Include libraries for I2C communication and sensors
#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <BH1750.h>

// Include libraries for RS485 Modbus communication
#include <SoftwareSerial.h>
#include <ModbusMaster.h>

// Define sensor pins for non-I2C sensors
const int MQ135_PIN = A0;      // Analog pin for MQ-135 Air Quality Sensor
const int RAIN_PIN = 2;        // Digital pin for Raindrop Detection Module
const int UV_PIN = A1;         // Analog pin for CJMCU-GUVA-S12SD UV Index Sensor
const int SOUND_PIN = A2;      // Analog pin for LM393 Sound Module

// Define pins for MAX485 RS485 module
const int RS485_RO_PIN = 3;    // SoftwareSerial Receive Pin
const int RS485_DI_PIN = 4;    // SoftwareSerial Transmit Pin
const int RS485_DE_RE_PIN = 5; // Driver Enable / Receiver Enable Pin

// Declare I2C sensor objects
Adafruit_BME280 bme; // BME280 sensor object (I2C)
BH1750 lightMeter;   // BH1750 sensor object (I2C, default address 0x23)

// Declare SoftwareSerial for RS485 communication
SoftwareSerial rs485Serial(RS485_RO_PIN, RS485_DI_PIN);

// Declare ModbusMaster node object
ModbusMaster node;

// Modbus settings
const int MODBUS_SLAVE_ID = 1;
const uint16_t WIND_DATA_START_REG = 0x0000; // Assuming wind speed is at 0x0000, direction at 0x0001
const uint16_t NUM_WIND_REGISTERS = 2;      // Read 2 registers (speed and direction)

// Callback functions for ModbusMaster to control DE/RE pin
void preTransmission() {
  digitalWrite(RS485_DE_RE_PIN, HIGH); // Enable transmitter
}

void postTransmission() {
  digitalWrite(RS485_DE_RE_PIN, LOW);  // Disable transmitter, enable receiver
}

void setup() {
  // Initialize Serial communication for ESP32 data transfer (and Arduino debugging)
  Serial.begin(9600); 

  // Initialize I2C communication
  Wire.begin();

  // Initialize BME280 sensor
  if (!bme.begin(0x76)) {
    Serial.println("BME280 init error"); // Short error for ESP32, more detail if needed for direct debug
    // while (1); // Optional: Halt if critical
  } else {
    Serial.println("BME280 OK");
  }

  // Initialize BH1750 sensor
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    Serial.println("BH1750 OK");
  } else {
    Serial.println("BH1750 init error");
  }

  // Set pin modes for non-I2C sensors
  pinMode(MQ135_PIN, INPUT);
  pinMode(RAIN_PIN, INPUT);
  pinMode(UV_PIN, INPUT);
  pinMode(SOUND_PIN, INPUT);

  // Set pin mode for RS485 DE/RE control pin and set to receive mode
  pinMode(RS485_DE_RE_PIN, OUTPUT);
  digitalWrite(RS485_DE_RE_PIN, LOW);

  // Initialize SoftwareSerial for RS485 communication (wind sensor baud rate)
  rs485Serial.begin(9600); // Assuming wind sensor baud rate is 9600

  // Initialize ModbusMaster
  node.begin(MODBUS_SLAVE_ID, rs485Serial);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);
  
  Serial.println("Setup complete. Starting sensor readings...");
}

void loop() {
  // Read analog values from non-I2C sensors
  int mq135Value = analogRead(MQ135_PIN);
  int uvValue = analogRead(UV_PIN);
  int soundValue = analogRead(SOUND_PIN);

  // Read digital value from Raindrop Detection Module
  int rainValue = digitalRead(RAIN_PIN); // 0 typically means rain detected

  // Read values from BME280 sensor
  float temperature = bme.readTemperature();
  float humidity = bme.readHumidity();
  float pressure = bme.readPressure() / 100.0F; // Convert Pa to hPa

  // Read value from BH1750 sensor
  float lux = lightMeter.readLightLevel();

  // Variables for wind sensor data
  float windSpeed = -1.0;    // Default to -1.0 or other error indicator
  float windDirection = -1.0; // Default to -1.0 or other error indicator
  uint8_t modbusResult;

  // Read wind sensor data via Modbus
  modbusResult = node.readHoldingRegisters(WIND_DATA_START_REG, NUM_WIND_REGISTERS);

  if (modbusResult == node.ku8MBSuccess) {
    // Assuming wind speed is in the first register, direction in the second.
    // Data might need scaling or conversion based on sensor specs.
    // For example, if data is uint16_t and needs to be divided by 10:
    windSpeed = node.getResponseBuffer(0) / 10.0f; 
    windDirection = node.getResponseBuffer(1) / 10.0f;
  } else {
    // Modbus read error - windSpeed and windDirection will remain -1.0
    // This error message is for Arduino debugging, not part of the ESP32 data packet
    // Serial.print("Modbus read error: 0x"); // Optional: for direct Arduino debugging
    // Serial.println(modbusResult, HEX);
  }

  // Consolidate all sensor data into a single CSV string for ESP32
  String dataPacket = "";
  dataPacket += String(mq135Value);
  dataPacket += ",";
  dataPacket += String(rainValue);
  dataPacket += ",";
  dataPacket += String(uvValue);
  dataPacket += ",";
  dataPacket += String(soundValue);
  dataPacket += ",";
  dataPacket += String(temperature, 2); // Temperature with 2 decimal places
  dataPacket += ",";
  dataPacket += String(humidity, 2);    // Humidity with 2 decimal places
  dataPacket += ",";
  dataPacket += String(pressure, 2);    // Pressure with 2 decimal places
  dataPacket += ",";
  dataPacket += String(lux, 2);         // Light intensity with 2 decimal places
  dataPacket += ",";
  dataPacket += String(windSpeed, 1);   // Wind speed with 1 decimal place
  dataPacket += ",";
  dataPacket += String(windDirection, 1); // Wind direction with 1 decimal place

  // Send the consolidated data packet over Serial to ESP32
  Serial.println(dataPacket);

  // Delay before next round of readings
  delay(2000); // Adjust delay as needed for Modbus polling and overall responsiveness
}
