const { app, BrowserWindow, Menu, Notification, ipcMain, shell, dialog, nativeTheme } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const smoke = process.env.MAVIE_SMOKE === '1';
if (smoke && process.env.FINANCES_DATA_DIR) app.setPath('userData', process.env.FINANCES_DATA_DIR);
process.env.FINANCES_DATA_DIR = app.getPath('userData');
let window, child, origin, timer, quitting = false, restarts = 0, initialized = false;
const seen = new Set();
const notifications = new Set();
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function log(message) {
  const dir = path.join(app.getPath('userData'), 'logs');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'main.log');
  if (fs.existsSync(file) && fs.statSync(file).size > 1024 * 1024) fs.renameSync(file, `${file}.1`);
  fs.appendFileSync(file, `${new Date().toISOString()} ${String(message).slice(0, 32768)}\n`);
}
function local(url) { try { return new URL(url).origin === origin; } catch { return false; } }
function external(url) { if (/^https?:\/\//i.test(url)) shell.openExternal(url).catch(log); }
async function openFolder(receipts) {
  const dir = receipts ? path.join(app.getPath('home'), 'Library/Mobile Documents/com~apple~CloudDocs/MaVie') : app.getPath('userData');
  fs.mkdirSync(dir, { recursive: true });
  const error = await shell.openPath(dir);
  if (error) throw new Error(error);
}
function menu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'MaVie', submenu: [{ role: 'about', label: 'À propos de MaVie' }, { type: 'separator' },
      { label: 'Ouvrir le dossier iCloud des reçus', click: () => openFolder(true).catch(log) },
      { label: 'Ouvrir le dossier des données', click: () => openFolder(false).catch(log) },
      { type: 'separator' }, { role: 'hide', label: 'Masquer MaVie' }, { role: 'hideOthers', label: 'Masquer les autres' },
      { role: 'unhide', label: 'Tout afficher' }, { type: 'separator' }, { role: 'quit', label: 'Quitter MaVie' }] },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
      { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Présentation', submenu: [{ role: 'reload', label: 'Actualiser' }, { role: 'resetZoom', label: 'Taille réelle' },
      { role: 'zoomIn', label: 'Agrandir' }, { role: 'zoomOut', label: 'Réduire' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
    { label: 'Fenêtre', submenu: [{ role: 'minimize', label: 'Réduire' }, { role: 'zoom', label: 'Agrandir la fenêtre' }, { role: 'front', label: 'Tout ramener au premier plan' }] },
  ]));
}
async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(error => error ? reject(error) : resolve(port)); });
  });
}
async function startServer() {
  const port = await freePort();
  origin = `http://127.0.0.1:${port}`;
  const server = path.join(process.resourcesPath, 'server/server.js');
  child = spawn(process.execPath, [path.join(__dirname, 'server.cjs'), server], {
    cwd: app.getPath('userData'), env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const current = child;
  current.stdout.on('data', log); current.stderr.on('data', log); current.on('error', log);
  current.once('exit', (code, signal) => {
    log(`Serveur arrêté : ${code} ${signal}`);
    if (!quitting && current.ready) recover().catch(fatal);
  });
  for (let i = 0; i < 120; i++) {
    if (current.exitCode !== null || current.signalCode !== null) throw new Error('Serveur arrêté pendant le démarrage');
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(1000) }); if (response.status < 500) { current.ready = true; return; } } catch {}
    await delay(250);
  }
  throw new Error('Le serveur ne répond pas après 150 secondes');
}
async function startWithRetry() {
  while (!quitting) {
    try { await startServer(); return; }
    catch (error) {
      if (child) { child.ready = false; child.kill(); }
      if (restarts++ >= 3) throw error;
      log(`Nouvelle tentative : ${error.message}`);
      await delay(500);
    }
  }
}
async function recover() {
  clearInterval(timer);
  if (restarts++ >= 3) return fatal(new Error('Le serveur a épuisé ses trois relances'));
  await delay(500);
  if (quitting) return;
  await startWithRetry();
  if (window && !window.isDestroyed()) await window.loadURL(origin);
  polling();
}
async function poll() {
  await Promise.allSettled([
    (async () => {
      const response = await fetch(`${origin}/api/inbox/status`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return;
      const { recent = [] } = await response.json();
      for (const item of recent) {
        const key = String(item.receiptId);
        if (seen.has(key)) continue;
        seen.add(key);
        if (!initialized || !Notification.isSupported()) continue;
        const total = Number(item.total || 0).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const note = new Notification({ title: `Nouveau reçu lu : ${item.store || 'Reçu'} · ${total} $ · ${item.itemsCount || 0} articles` });
        notifications.add(note);
        note.on('close', () => notifications.delete(note));
        note.on('click', () => { if (!window || window.isDestroyed()) createWindow(); window.show(); window.focus(); window.loadURL(`${origin}/recus/${encodeURIComponent(key)}`).catch(log); });
        note.show();
      }
      initialized = true;
    })(),
    (async () => {
      const response = await fetch(`${origin}/api/summary`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return;
      const { pendingReceipts } = await response.json();
      app.dock?.setBadge(Number(pendingReceipts) > 0 ? String(pendingReceipts) : '');
    })(),
  ]);
}
function polling() { if (!smoke) { poll().catch(log); timer = setInterval(() => poll().catch(log), 20000); } }
function createWindow() {
  nativeTheme.themeSource = 'system';
  window = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 720, show: !smoke,
    title: 'MaVie', backgroundColor: '#0d0f13',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, paintWhenInitiallyHidden: true, backgroundThrottling: !smoke } });
  window.webContents.setWindowOpenHandler(({ url }) => { if (local(url)) window.loadURL(url).catch(log); else external(url); return { action: 'deny' }; });
  for (const event of ['will-navigate', 'will-redirect', 'will-frame-navigate']) {
    window.webContents.on(event, (e, url) => { if (!local(url || e.url)) { e.preventDefault(); external(url || e.url); } });
  }
  window.webContents.on('will-attach-webview', e => e.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  return window;
}
async function loading() {
  let html = fs.readFileSync(path.join(__dirname, 'loading.html'), 'utf8');
  const logo = fs.readFileSync(app.isPackaged ? path.join(process.resourcesPath, 'logo.svg') : path.join(__dirname, '../public/logo.svg'));
  html = html.replace('id="logo"', `id="logo" src="data:image/svg+xml;base64,${logo.toString('base64')}"`);
  await window.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}
async function runSmoke() {
  const output = process.env.MAVIE_SMOKE_OUT;
  if (!output) throw new Error('MAVIE_SMOKE_OUT manquant');
  const result = { dataDir: app.getPath('userData'), pages: [] };
  let errors = [];
  window.webContents.on('console-message', (_event, details) => { if (details.level === 'error') errors.push(details.message); });
  for (const route of ['/', '/transactions', '/ajouter', '/recus', '/depenses-fixes', '/budgets', '/analyses', '/parametres']) {
    errors = [];
    const response = await fetch(`${origin}${route}`, { signal: AbortSignal.timeout(30000) });
    await window.loadURL(`${origin}${route}`);
    await delay(1200);
    const capture = path.join(path.dirname(output), `${route === '/' ? 'accueil' : route.slice(1)}.png`);
    fs.writeFileSync(capture, (await window.webContents.capturePage()).toPNG());
    result.pages.push({ route, status: response.status, errors: [...errors], capture });
  }
  fs.writeFileSync(output, JSON.stringify(result, null, 2));
  app.quit();
}
function fatal(error) {
  log(error.stack || error);
  if (smoke && process.env.MAVIE_SMOKE_OUT) fs.writeFileSync(process.env.MAVIE_SMOKE_OUT, JSON.stringify({ error: String(error) }));
  else dialog.showErrorBox('MaVie ne peut pas démarrer', `${error.message}\nConsulte les journaux dans le dossier des données.`);
  app.quit();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window && !window.isDestroyed()) { if (window.isMinimized()) window.restore(); window.show(); window.focus(); } });
  app.on('before-quit', event => {
    if (quitting) return;
    quitting = true; clearInterval(timer);
    if (child && child.exitCode === null && child.signalCode === null) {
      event.preventDefault();
      const processToKill = child;
      const force = setTimeout(() => processToKill.kill('SIGKILL'), 2000);
      processToKill.once('exit', () => { clearTimeout(force); app.quit(); });
      processToKill.kill('SIGTERM');
    }
  });
  app.on('window-all-closed', () => app.quit());
  app.whenReady().then(async () => {
    fs.mkdirSync(app.getPath('userData'), { recursive: true });
    // Mode d'affichage choisi dans l'app : la barre de titre macOS suit.
    ipcMain.handle('mavie:theme', (_event, mode) => { if (['light', 'dark', 'system'].includes(mode)) nativeTheme.themeSource = mode; });
    for (const [channel, receipts] of [['mavie:receipts', true], ['mavie:data', false]]) ipcMain.handle(channel, event => {
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame || !local(event.senderFrame.url)) throw new Error('Origine non autorisée');
      return openFolder(receipts);
    });
    menu(); createWindow(); await loading();
    if (!app.isPackaged && process.env.MAVIE_URL) {
      const url = new URL(process.env.MAVIE_URL);
      if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('MAVIE_URL doit pointer vers un serveur local HTTP');
      origin = url.origin;
    } else await startWithRetry();
    if (smoke) await runSmoke(); else { await window.loadURL(origin); polling(); }
  }).catch(fatal);
}
