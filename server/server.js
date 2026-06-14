const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CSV file path
const CSV_PATH = path.join(__dirname, 'data.csv');

// Create CSV with headers if not exists
if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, 'Time,Voltage,Current,Resistance,Avg Voltage,Avg Current,Error%\n');
    console.log('📄 data.csv created');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dashboard')));

// Create HTTP & WebSocket servers
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store last reading
let lastReading = {
    voltage: 0,
    current: 0,
    resistance: 0,
    avg_voltage: 0,
    avg_current: 0,
    error_percent: 0,
    timestamp: ''
};

// Send data to all connected dashboards
function broadcastData(data) {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Save reading to CSV
function saveToCSV(data) {
    const time = new Date().toLocaleTimeString();
    const row  = `${time},${data.voltage},${data.current},${data.resistance},${data.avg_voltage},${data.avg_current},${data.error_percent}\n`;
    fs.appendFileSync(CSV_PATH, row);
}

// WebSocket connection
wss.on('connection', (ws) => {
    console.log('✅ Dashboard connected');
    ws.send(JSON.stringify(lastReading));
    ws.on('close', () => console.log('❌ Dashboard disconnected'));
});

// Receive data from Arduino
app.post('/api/data', (req, res) => {
    lastReading = { ...req.body, timestamp: new Date().toISOString() };
    console.log('📊 Arduino Reading:', lastReading);
    broadcastData(lastReading);
    saveToCSV(lastReading);
    res.json({ status: 'ok' });
});

// Get last reading
app.get('/api/last', (req, res) => {
    res.json(lastReading);
});

// ===== SIMULATION MODE =====
let simVoltage    = 12.0;
let simCurrent    = 2.5;
let simResistance = 1000;

function simulate() {
    simVoltage    += (Math.random() - 0.5) * 0.4;
    simCurrent    += (Math.random() - 0.5) * 0.2;
    simResistance += (Math.random() - 0.5) * 50;

    simVoltage    = Math.max(0, Math.min(25, simVoltage));
    simCurrent    = Math.max(0, Math.min(5,  simCurrent));
    simResistance = Math.max(0, Math.min(10000, simResistance));

    const avgV = simVoltage  + (Math.random() - 0.5) * 0.1;
    const avgA = simCurrent  + (Math.random() - 0.5) * 0.05;
    const err  = Math.abs(simVoltage - avgV) / avgV * 100;

    lastReading = {
        voltage:       parseFloat(simVoltage.toFixed(2)),
        current:       parseFloat(simCurrent.toFixed(2)),
        resistance:    parseFloat(simResistance.toFixed(0)),
        avg_voltage:   parseFloat(avgV.toFixed(2)),
        avg_current:   parseFloat(avgA.toFixed(2)),
        error_percent: parseFloat(err.toFixed(2)),
        timestamp:     new Date().toISOString()
    };

    broadcastData(lastReading);
    saveToCSV(lastReading);
    console.log('🔄 Sim:', lastReading);
}

// Start simulation
setInterval(simulate, 1000);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Server → http://localhost:${PORT}`);
    console.log('🎮 Simulation Mode: ON');
    console.log('📄 Saving to: ' + CSV_PATH);
    console.log('📡 Also waiting for real Arduino data...');
});
