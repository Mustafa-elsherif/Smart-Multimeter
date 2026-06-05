# ⚡ Arduino-Based Smart Digital Multimeter

> Real-Time Measurement System with Web Dashboard  
> Elsewedy University of Technology — Polytechnic of Egypt  
> Supervised by: **Prof. Dalia Elsheakh**

---

## 📌 Project Overview

An Arduino-based smart digital multimeter that measures **Voltage**, **Current**, and **Resistance** in real time. Readings are transmitted over Wi-Fi to a Node.js server and displayed live on a web dashboard with charts, alarms, and CSV export — fully functional even without hardware via built-in Simulation Mode.

---

## 🏗️ System Architecture

```
Arduino + Sensors
      │
   C++ Firmware (10-sample averaging, error %, JSON)
      │
   Wi-Fi — HTTP POST every 1 second
      │
  Node.js Server — Port 3000
      │
  WebSocket — Real-time push
      │
  Dashboard Browser — localhost:3000
```

---

## 🚀 Features

- 📊 **Live Measurement Cards** — Voltage, Current, Resistance & Error % with animated progress bars, updated every second
- 📈 **Live Charts** — Voltage & Current history showing last 20 readings via Chart.js
- 🚨 **Smart Alarm System** — Red banner + card highlight when values exceed configurable thresholds
- ⚙️ **Settings Panel** — Configure Server IP for Arduino connection and set custom alarm thresholds
- 📋 **Data Log Table** — Live table keeping last 50 readings with timestamps
- 💾 **CSV Export** — One-click download of all recorded data, also auto-saved on server as `data.csv`
- 🎮 **Simulation Mode** — Fully functional without Arduino hardware connected

---

## 🛠️ Software Stack

| Layer | Technology |
|-------|-----------|
| Firmware | Arduino C++, ArduinoJson, ESP8266WiFi, ESP8266HTTPClient, LiquidCrystal_I2C, Wire.h |
| Backend | Node.js, Express, WebSocket (ws), fs |
| Frontend | HTML5, CSS3, JavaScript, Chart.js |
| Communication | HTTP POST (Arduino → Server), WebSocket (Server → Browser) |
| Logging | Local CSV — `data.csv` (auto-created on first run) |

---

## 📁 Project Structure

```
Smart-Multimeter/
├── firmware/
│   └── smart_multimeter.ino    ← Arduino C++ firmware
├── dashboard/
│   ├── index.html              ← Single-page web dashboard
│   ├── css/
│   │   └── style.css           ← Dark-themed responsive UI
│   └── js/
│       └── app.js              ← WebSocket client, Chart.js, alarms, CSV export
└── server/
    ├── server.js               ← Node.js backend
    ├── package.json
    └── data.csv                ← Auto-generated on first run
```

---

## ⚙️ How to Run

### Requirements
- [Node.js](https://nodejs.org/) installed on your PC

### Steps

```bash
# 1. Navigate to the server folder
cd Smart-Multimeter/server

# 2. Install dependencies
npm install

# 3. Start the server
node server.js
```

Open your browser at:
```
http://localhost:3000
```

The dashboard starts in **Simulation Mode** automatically — no Arduino needed.

---

## 🔌 Connecting Real Arduino Hardware

1. Open `firmware/smart_multimeter.ino` in Arduino IDE
2. Edit these lines:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL    = "http://<YOUR_PC_IP>:3000/api/data";
```

3. Get your PC IP: run `ipconfig` in PowerShell and look for **IPv4 Address**
4. Make sure Arduino and PC are on the **same Wi-Fi network**
5. Upload firmware via Arduino IDE

Once running, the Arduino sends JSON data every second:
```json
{
  "voltage": 12.08,
  "current": 2.52,
  "resistance": 1020,
  "avg_voltage": 12.05,
  "avg_current": 2.51,
  "error_percent": 0.25
}
```

---

## 👥 Team Members

| Name | Role |
|------|------|
| **Mustafa Nabil** | Software Lead — Full Server Development, Dashboard, Firmware, Wi-Fi Integration |
| **Omar Ahmed** | Software Assistant — Arduino Library Research, Testing, Debugging |
| Khaled Abdelkhaleq | Team Member |
| Farah Othman | Team Member |
| Maryem Shazly | Team Member |
| Yousef Mohamed | Team Member |
| Mohamed Mostafa | Team Member |
| Amr Khaled | Team Member |

---

## 🎓 Academic Info

- **University:** Elsewedy University of Technology — Polytechnic of Egypt
- **Supervisor:** Prof. Dalia Elsheakh
- **Project Type:** SUT Projects
