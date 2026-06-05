// ============================================
// Smart Digital Multimeter - Arduino Firmware
// Elsewedy University of Technology
// Supervised by: Prof. Dalia Elsheakh
// ============================================

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// ===== Wi-Fi CONFIG =====
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://192.168.1.100:3000/api/data"; // PC IP

// ===== PINS =====
#define VOLTAGE_PIN    A0   // Voltage divider output
#define CURRENT_PIN    A1   // ACS712 output
#define RESISTANCE_PIN A2   // Resistance divider output
#define MODE_BTN       D5   // Button to switch mode

// ===== LCD =====
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===== CALIBRATION =====
const float VOLTAGE_RATIO    = 5.0;     // Divider ratio (R1+R2)/R2 for 0-25V
const float ADC_REF          = 5.0;     // Arduino reference voltage
const float ADC_MAX          = 1023.0;
const float ACS712_OFFSET    = 2.5;     // ACS712 zero current output (V)
const float ACS712_SENS      = 0.185;   // ACS712 5A sensitivity (V/A)
const float REF_RESISTOR     = 10000.0; // Reference resistor for ohmmeter (10kΩ)
const int   NUM_SAMPLES      = 10;      // Samples for averaging

// ===== MODES =====
enum Mode { VOLTAGE, CURRENT, RESISTANCE };
Mode currentMode = VOLTAGE;

// ===== VARIABLES =====
float voltage    = 0;
float current    = 0;
float resistance = 0;
float avgVoltage = 0;
float avgCurrent = 0;
float errorPercent = 0;

unsigned long lastSend    = 0;
const long    SEND_INTERVAL = 1000; // Send every 1 second

// ============================================
// SETUP
// ============================================
void setup() {
    Serial.begin(115200);

    // LCD init
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("Smart Multimeter");
    lcd.setCursor(0, 1);
    lcd.print("Initializing...");

    // Button
    pinMode(MODE_BTN, INPUT_PULLUP);

    // Connect Wi-Fi
    connectWiFi();

    delay(1500);
    lcd.clear();
}

// ============================================
// LOOP
// ============================================
void loop() {
    // Check mode button
    checkModeButton();

    // Take measurements
    takeReadings();

    // Update LCD
    updateLCD();

    // Send data to server every second
    if (millis() - lastSend >= SEND_INTERVAL) {
        sendToServer();
        lastSend = millis();
    }

    delay(100);
}

// ============================================
// CONNECT Wi-Fi
// ============================================
void connectWiFi() {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    lcd.setCursor(0, 1);
    lcd.print("WiFi connecting.");

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Connected: " + WiFi.localIP().toString());
        lcd.setCursor(0, 1);
        lcd.print("WiFi OK!        ");
    } else {
        Serial.println("\n❌ WiFi Failed - Running offline");
        lcd.setCursor(0, 1);
        lcd.print("WiFi Failed!    ");
    }
}

// ============================================
// MODE BUTTON
// ============================================
void checkModeButton() {
    static bool lastState = HIGH;
    bool state = digitalRead(MODE_BTN);

    if (lastState == HIGH && state == LOW) {
        // Cycle through modes
        if      (currentMode == VOLTAGE)    currentMode = CURRENT;
        else if (currentMode == CURRENT)    currentMode = RESISTANCE;
        else                                currentMode = VOLTAGE;

        lcd.clear();
        delay(200);
    }
    lastState = state;
}

// ============================================
// TAKE READINGS (10 samples + average + error)
// ============================================
void takeReadings() {
    float vSamples[NUM_SAMPLES];
    float aSamples[NUM_SAMPLES];
    float rSamples[NUM_SAMPLES];

    float vSum = 0, aSum = 0, rSum = 0;

    // Collect 10 samples
    for (int i = 0; i < NUM_SAMPLES; i++) {
        // --- Voltage ---
        float vRaw = analogRead(VOLTAGE_PIN) * (ADC_REF / ADC_MAX);
        vSamples[i] = vRaw * VOLTAGE_RATIO;
        vSum += vSamples[i];

        // --- Current (ACS712) ---
        float aRaw = analogRead(CURRENT_PIN) * (ADC_REF / ADC_MAX);
        aSamples[i] = (aRaw - ACS712_OFFSET) / ACS712_SENS;
        if (aSamples[i] < 0) aSamples[i] = 0;
        aSum += aSamples[i];

        // --- Resistance (Voltage divider method) ---
        float rRaw = analogRead(RESISTANCE_PIN) * (ADC_REF / ADC_MAX);
        if (rRaw > 0.01) {
            rSamples[i] = REF_RESISTOR * (ADC_REF - rRaw) / rRaw;
        } else {
            rSamples[i] = 0;
        }
        rSum += rSamples[i];

        delay(10);
    }

    // --- Averages ---
    avgVoltage = vSum / NUM_SAMPLES;
    avgCurrent = aSum / NUM_SAMPLES;
    float avgResistance = rSum / NUM_SAMPLES;

    // --- Last reading ---
    voltage    = vSamples[NUM_SAMPLES - 1];
    current    = aSamples[NUM_SAMPLES - 1];
    resistance = rSamples[NUM_SAMPLES - 1];

    // --- Error % (deviation of last reading from average) ---
    if (avgVoltage > 0.01) {
        errorPercent = abs(voltage - avgVoltage) / avgVoltage * 100.0;
    } else {
        errorPercent = 0;
    }

    // Use averaged resistance
    resistance = avgResistance;
}

// ============================================
// UPDATE LCD
// ============================================
void updateLCD() {
    lcd.setCursor(0, 0);

    if (currentMode == VOLTAGE) {
        lcd.print("Volt: ");
        lcd.print(voltage, 2);
        lcd.print(" V    ");
        lcd.setCursor(0, 1);
        lcd.print("Avg:  ");
        lcd.print(avgVoltage, 2);
        lcd.print(" V    ");
    }
    else if (currentMode == CURRENT) {
        lcd.print("Curr: ");
        lcd.print(current, 2);
        lcd.print(" A    ");
        lcd.setCursor(0, 1);
        lcd.print("Avg:  ");
        lcd.print(avgCurrent, 2);
        lcd.print(" A    ");
    }
    else if (currentMode == RESISTANCE) {
        lcd.print("Res:  ");
        lcd.print(resistance, 0);
        lcd.print(" Ohm  ");
        lcd.setCursor(0, 1);
        lcd.print("Err:  ");
        lcd.print(errorPercent, 2);
        lcd.print(" %    ");
    }
}

// ============================================
// SEND DATA TO SERVER
// ============================================
void sendToServer() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("❌ WiFi not connected");
        return;
    }

    // Build JSON
    StaticJsonDocument<256> doc;
    doc["voltage"]      = round(voltage * 100) / 100.0;
    doc["current"]      = round(current * 100) / 100.0;
    doc["resistance"]   = round(resistance);
    doc["avg_voltage"]  = round(avgVoltage * 100) / 100.0;
    doc["avg_current"]  = round(avgCurrent * 100) / 100.0;
    doc["error_percent"]= round(errorPercent * 100) / 100.0;

    String jsonStr;
    serializeJson(doc, jsonStr);

    // Send HTTP POST
    WiFiClient client;
    HTTPClient http;
    http.begin(client, SERVER_URL);
    http.addHeader("Content-Type", "application/json");

    int responseCode = http.POST(jsonStr);

    if (responseCode == 200) {
        Serial.println("✅ Data sent: " + jsonStr);
    } else {
        Serial.println("❌ Send failed: " + String(responseCode));
    }

    http.end();
}