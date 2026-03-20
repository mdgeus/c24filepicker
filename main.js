const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'favicon.png'),
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

function expandHomePath(filePath) {
  return filePath.replace(/^~(?=$|\/|\\)/, app.getPath('home'));
}

function validateConfig(config) {
  if (!config.host || !config.username || !config.privateKeyPath || !config.remotePath) {
    throw new Error('Missing required fields.');
  }
}

function getRemoteFilePath(remotePath, fileName) {
  const normalizedRemotePath = String(remotePath || '')
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  const normalizedFileName = path.posix.basename(String(fileName || '').replace(/\\/g, '/'));
  return `${normalizedRemotePath}/${normalizedFileName}`;
}

async function withSftp(config, callback) {
  const sftp = new SftpClient();

  try {
    validateConfig(config);

    const expandedKeyPath = expandHomePath(config.privateKeyPath);

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

    return await callback(sftp);
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
}

ipcMain.handle('list-sftp-files', async (_event, config) => {
  return withSftp(config, async (sftp) => {
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
  });
});

ipcMain.handle('upload-sftp-file', async (_event, payload) => {
  const { config, localFilePath } = payload || {};

  return withSftp(config || {}, async (sftp) => {
    if (!localFilePath) {
      throw new Error('No local file selected.');
    }

    const expandedLocalPath = expandHomePath(localFilePath);

    if (!fs.existsSync(expandedLocalPath)) {
      throw new Error('Selected file was not found on disk.');
    }

    const fileStats = fs.statSync(expandedLocalPath);
    if (!fileStats.isFile()) {
      throw new Error('Selected path is not a file.');
    }

    const fileName = path.basename(expandedLocalPath);
    const remoteFilePath = getRemoteFilePath(config.remotePath, fileName);

    await sftp.put(expandedLocalPath, remoteFilePath, {
      flags: 'w'
    });

    return {
      success: true,
      fileName,
      remoteFilePath
    };
  });
});
