const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const SftpClient = require('ssh2-sftp-client');

let mainWindow = null;
let helpWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    icon: path.join(__dirname, 'c24 blok logo.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function openHelpWindow() {
  if (helpWindow && !helpWindow.isDestroyed()) {
    helpWindow.focus();
    return;
  }

  helpWindow = new BrowserWindow({
    width: 760,
    height: 620,
    title: 'Help',
    icon: path.join(__dirname, 'c24 blok logo.png'),
    resizable: true,
    minimizable: true,
    maximizable: false,
    parent: mainWindow || undefined,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  helpWindow.loadFile('help.html');
  helpWindow.on('closed', () => {
    helpWindow = null;
  });
}

function buildAppMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    ...(isMac ? [{
      label: 'Help',
      submenu: [
        {
          label: 'View Help',
          click: () => openHelpWindow()
        },
        {
          label: 'About Conversation24 File Picker',
          click: () => openHelpWindow()
        }
      ]
    }] : [{
      label: 'Help',
      click: () => openHelpWindow()
    }])
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildAppMenu();
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
