const socket = io();

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const sourceSelect = document.getElementById('sourceSelect');
const citySelect = document.getElementById('citySelect');
const categorySelect = document.getElementById('categorySelect');
const qrImage = document.getElementById('qrImage');
const qrWrapper = document.getElementById('qrWrapper');
const resultsBody = document.getElementById('resultsBody');
const logList = document.getElementById('logList');
const appStatus = document.getElementById('appStatus');
const totalLeadsEl = document.getElementById('totalLeads');
const sentCountEl = document.getElementById('sentCount');

const leadsMap = new Map();

function updateStatus(text, type = 'default') {
  appStatus.textContent = text;
  appStatus.className = 'status-badge';
  if (type === 'running') appStatus.classList.add('running');
  else if (type === 'error') appStatus.classList.add('error');
  else if (type === 'complete') appStatus.classList.add('complete');
}

function addLog(message) {
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.textContent = `${new Date().toLocaleTimeString()} — ${message}`;
  logList.insertBefore(entry, logList.firstChild);
  while (logList.children.length > 100) {
    logList.removeChild(logList.lastChild);
  }
}

function setQrImage(dataUrl) {
  qrImage.src = dataUrl;
  qrImage.style.display = 'block';
  const placeholder = qrWrapper.querySelector('.qr-placeholder');
  if (placeholder) placeholder.style.display = 'none';
}

function clearResults() {
  resultsBody.innerHTML = '<tr class="empty-row"><td colspan="4">No leads yet. Start a campaign to begin.</td></tr>';
  leadsMap.clear();
  totalLeadsEl.textContent = '0';
  sentCountEl.textContent = '0';
}

function addLead(lead) {
  if (resultsBody.querySelector('.empty-row')) {
    resultsBody.innerHTML = '';
  }

  const row = document.createElement('tr');
  row.id = `lead-${lead.number}`;
  row.innerHTML = `
    <td>${lead.source}</td>
    <td>${lead.businessName}</td>
    <td>${lead.number}</td>
    <td class="status-${lead.status.toLowerCase().replace(/\s/g, '-')}">${lead.status}</td>
  `;
  resultsBody.appendChild(row);
  leadsMap.set(lead.number, row);
  updateStats();
}

function updateLead(lead) {
  const row = leadsMap.get(lead.number);
  if (row) {
    row.cells[3].textContent = lead.status;
    row.cells[3].className = `status-${lead.status.toLowerCase().replace(/\s/g, '-')}`;
    updateStats();
  }
}

function updateStats() {
  totalLeadsEl.textContent = String(leadsMap.size);
  sentCountEl.textContent = String(
    Array.from(leadsMap.values()).filter(row => row.cells[3].textContent.includes('✅')).length
  );
}

function setRunning(enabled) {
  startButton.disabled = enabled;
  stopButton.disabled = !enabled;
  sourceSelect.disabled = enabled;
  citySelect.disabled = enabled;
  categorySelect.disabled = enabled;
  updateStatus(enabled ? 'Running...' : 'Ready', enabled ? 'running' : 'default');
}

startButton.addEventListener('click', () => {
  const source = sourceSelect.value;
  const city = citySelect.value;
  const category = categorySelect.value;

  qrImage.src = '';
  qrImage.style.display = 'none';
  const placeholder = qrWrapper.querySelector('.qr-placeholder');
  if (placeholder) placeholder.style.display = 'block';

  clearResults();
  logList.innerHTML = '';
  setRunning(true);
  addLog(`Campaign started: ${source} / ${category} / ${city}`);
  socket.emit('start_campaign', { source, category, city });
});

stopButton.addEventListener('click', () => {
  socket.emit('stop_campaign');
  setRunning(false);
  addLog('Campaign stopped by user.');
});

socket.on('qr', (dataUrl) => {
  if (dataUrl) setQrImage(dataUrl);
});

socket.on('lead_added', (lead) => {
  addLead(lead);
  addLog(`Lead found: ${lead.number} (${lead.businessName})`);
});

socket.on('lead_updated', (lead) => {
  updateLead(lead);
  addLog(`Lead updated: ${lead.number} -> ${lead.status}`);
});

socket.on('status', (text) => {
  updateStatus(text, 'running');
  addLog(text);
});

socket.on('finished', () => {
  updateStatus('Campaign completed', 'complete');
  setRunning(false);
  addLog('Campaign completed.');
});

socket.on('error', (message) => {
  addLog(`Error: ${message}`);
  updateStatus('Error', 'error');
  setRunning(false);
});

socket.on('connect', () => {
  addLog('Connected to server');
});

socket.on('disconnect', () => {
  addLog('Disconnected from server');
});

clearResults();
