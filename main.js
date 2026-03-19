const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('list-sftp-files', async (_event, config) => {
  const sftp = new SftpClient();

  try {
    if (!config.host || !config.username || !config.privateKeyPath || !config.remotePath) {
      throw new Error('Missing required fields.');
    }

    const expandedKeyPath = config.privateKeyPath.replace(/^~(?=$|\/|\\)/, app.getPath('home'));

    if (!fs.existsSync(expandedKeyPath)) {
      throw new Error('SSH key file not found.');
    }

    const privateKey = fs.readFileSync(expandedKeyPath, 'utf8');

    await sftp.connect({
      host: config.host,
      port: Number(config.port || 22),
      username: config.username,
      privateKey,
      passphrase: config.passphrase || undefined
    });

    const items = await sftp.list(config.remotePath);

    return {
      success: true,
      items: items.map((item) => ({
        name: item.name,
        type: item.type === 'd' ? 'directory' : 'file',
        size: item.size,
        modifyTime: item.modifyTime,
        rights: item.rights ? item.rights.user + ' ' + item.rights.group + ' ' + item.rights.other : ''
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || String(error)
    };
  } finally {
    try {
      await sftp.end();
    } catch (e) {
      // ignore cleanup error
    }
  }
});