// ===== CONFIG =====
let WS_URL = 'ws://localhost:3000';
const MAX_POINTS = 20;

// ===== ALARM THRESHOLDS =====
let alarms = {
    voltage: 20,
    current: 4,
    error: 5
};

// ===== STATE =====
let logCount = 0;
let csvData = [['#','Time','Voltage(V)','Current(A)','Resistance(Ω)','Avg Voltage(V)','Avg Current(A)','Error(%)']];

// ===== SETTINGS =====
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('open');
}

function saveIP() {
    const ip = document.getElementById('serverIP').value.trim();
    if (ip) {
        WS_URL = `ws://${ip}:3000`;
        ws.close(); // reconnect with new IP
        alert('IP saved! Reconnecting...');
    }
}

function saveAlarms() {
    alarms.voltage = parseFloat(document.getElementById('voltageAlarm').value) || 20;
    alarms.current = parseFloat(document.getElementById('currentAlarm').value) || 4;
    alarms.error   = parseFloat(document.getElementById('errorAlarm').value)   || 5;
    alert('Alarm thresholds saved!');
}

// ===== ALARM =====
function checkAlarms(data) {
    const messages = [];

    if (data.voltage > alarms.voltage)
        messages.push(`⚡ Voltage high: ${data.voltage}V > ${alarms.voltage}V`);
    if (data.current > alarms.current)
        messages.push(`🔴 Current high: ${data.current}A > ${alarms.current}A`);
    if (data.error_percent > alarms.error)
        messages.push(`⚠️ Error high: ${data.error_percent}% > ${alarms.error}%`);

    const banner = document.getElementById('alarmBanner');
    const text   = document.getElementById('alarmText');

    if (messages.length > 0) {
        text.textContent = messages.join('  |  ');
        banner.classList.add('show');

        // Card alarm highlight
        document.getElementById('voltageCard').classList.toggle('alarm', data.voltage > alarms.voltage);
        document.getElementById('currentCard').classList.toggle('alarm', data.current > alarms.current);
        document.getElementById('errorCard').classList.toggle('alarm',   data.error_percent > alarms.error);
    } else {
        banner.classList.remove('show');
        document.getElementById('voltageCard').classList.remove('alarm');
        document.getElementById('currentCard').classList.remove('alarm');
        document.getElementById('errorCard').classList.remove('alarm');
    }
}

function dismissAlarm() {
    document.getElementById('alarmBanner').classList.remove('show');
}

// ===== WEBSOCKET =====
let ws;

function connectWebSocket() {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => setStatus('connected', 'Connected');

    ws.onclose = () => {
        setStatus('disconnected', 'Disconnected');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = () => setStatus('disconnected', 'Error');

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateDashboard(data);
    };
}

// ===== STATUS =====
function setStatus(state, text) {
    document.querySelector('.dot').className = 'dot ' + state;
    document.getElementById('statusText').textContent = text;
}

// ===== UPDATE DASHBOARD =====
function updateDashboard(data) {
    // Cards
    document.getElementById('voltageValue').textContent    = parseFloat(data.voltage).toFixed(2);
    document.getElementById('currentValue').textContent    = parseFloat(data.current).toFixed(2);
    document.getElementById('resistanceValue').textContent = parseFloat(data.resistance).toFixed(0);
    document.getElementById('errorValue').textContent      = parseFloat(data.error_percent).toFixed(2);
    document.getElementById('avgVoltage').textContent      = parseFloat(data.avg_voltage).toFixed(2);
    document.getElementById('avgCurrent').textContent      = parseFloat(data.avg_current).toFixed(2);

    // Progress Bars
    document.getElementById('voltageBar').style.width    = Math.min((data.voltage / 25) * 100, 100) + '%';
    document.getElementById('currentBar').style.width    = Math.min((data.current / 5) * 100, 100) + '%';
    document.getElementById('resistanceBar').style.width = Math.min((data.resistance / 10000) * 100, 100) + '%';
    document.getElementById('errorBar').style.width      = Math.min(data.error_percent * 10, 100) + '%';

    // Timestamp
    const timeStr = new Date().toLocaleTimeString();
    document.getElementById('lastUpdate').textContent = timeStr;

    // Charts + Log + Alarms + CSV
    updateCharts(data, timeStr);
    addLogRow(data, timeStr);
    checkAlarms(data);
    csvData.push([
        logCount, timeStr,
        parseFloat(data.voltage).toFixed(2),
        parseFloat(data.current).toFixed(2),
        parseFloat(data.resistance).toFixed(0),
        parseFloat(data.avg_voltage).toFixed(2),
        parseFloat(data.avg_current).toFixed(2),
        parseFloat(data.error_percent).toFixed(2)
    ]);
}

// ===== CHARTS =====
const voltageChart = new Chart(document.getElementById('voltageChart'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Voltage (V)', data: [],
        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.1)',
        borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#f59e0b',
        fill: true, tension: 0.4 }] },
    options: {
        responsive: true, animation: { duration: 300 },
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8b8fa8', maxTicksLimit: 6 }, grid: { color: '#2a2d3e' } },
            y: { min: 0, max: 25, ticks: { color: '#8b8fa8' }, grid: { color: '#2a2d3e' } }
        }
    }
});

const currentChart = new Chart(document.getElementById('currentChart'), {
    type: 'line',
    data: { labels: [], datasets: [{ label: 'Current (A)', data: [],
        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)',
        borderWidth: 2, pointRadius: 3, pointBackgroundColor: '#3b82f6',
        fill: true, tension: 0.4 }] },
    options: {
        responsive: true, animation: { duration: 300 },
        plugins: { legend: { display: false } },
        scales: {
            x: { ticks: { color: '#8b8fa8', maxTicksLimit: 6 }, grid: { color: '#2a2d3e' } },
            y: { min: 0, max: 5, ticks: { color: '#8b8fa8' }, grid: { color: '#2a2d3e' } }
        }
    }
});

function updateCharts(data, timeStr) {
    voltageChart.data.labels.push(timeStr);
    voltageChart.data.datasets[0].data.push(parseFloat(data.voltage));
    currentChart.data.labels.push(timeStr);
    currentChart.data.datasets[0].data.push(parseFloat(data.current));

    if (voltageChart.data.labels.length > MAX_POINTS) {
        voltageChart.data.labels.shift();
        voltageChart.data.datasets[0].data.shift();
    }
    if (currentChart.data.labels.length > MAX_POINTS) {
        currentChart.data.labels.shift();
        currentChart.data.datasets[0].data.shift();
    }

    voltageChart.update();
    currentChart.update();
}

// ===== LOG TABLE =====
function addLogRow(data, timeStr) {
    logCount++;
    const tbody = document.getElementById('logBody');
    if (logCount === 1) tbody.innerHTML = '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${logCount}</td><td>${timeStr}</td>
        <td>${parseFloat(data.voltage).toFixed(2)}</td>
        <td>${parseFloat(data.current).toFixed(2)}</td>
        <td>${parseFloat(data.resistance).toFixed(0)}</td>
        <td>${parseFloat(data.avg_voltage).toFixed(2)}</td>
        <td>${parseFloat(data.avg_current).toFixed(2)}</td>
        <td>${parseFloat(data.error_percent).toFixed(2)}</td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
    if (tbody.rows.length > 50) tbody.deleteRow(tbody.rows.length - 1);
}

// ===== CLEAR LOG =====
function clearLog() {
    logCount = 0;
    csvData = [['#','Time','Voltage(V)','Current(A)','Resistance(Ω)','Avg Voltage(V)','Avg Current(A)','Error(%)']];
    document.getElementById('logBody').innerHTML = `
        <tr class="empty-row"><td colspan="8">Waiting for data...</td></tr>`;
}

// ===== DOWNLOAD CSV =====
function downloadCSV() {
    const content = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `multimeter_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ===== START =====
connectWebSocket();