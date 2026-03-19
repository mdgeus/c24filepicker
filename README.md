# Conversation24 File Picker

Electron app for browsing files over SFTP and copying the public asset URL for a selected file.

## Requirements

- Windows
- Node.js and npm installed on the machine that builds the app

Recipients of the built app do not need Node.js or npm.

## Install Dependencies

Run this once before starting the app or creating build files:

```bash
npm install
```

## Run Locally

Start the Electron app in development mode:

```bash
npm start
```

## Build Outputs

Build files are written to the `dist/` folder.

### Windows Installer

Creates an installer build:

```bash
npm run dist
```

Typical output:

- `dist/Conversation24 File Picker-Setup-<version>.exe`

This is the smaller file to share, but it requires installation.

### Portable EXE

Creates a portable executable:

```bash
npm run dist:portable
```

Typical output:

- `dist/Conversation24 File Picker-<version>.exe`

This is larger than the installer, but it does not require installation.

### Unpacked App Folder

Creates an unpacked build folder for inspection/testing:

```bash
npm run pack
```

Typical output:

- `dist/win-unpacked/`

## Notes

- Saved connection settings are stored locally by Electron for the app.
- The key passphrase is not stored.
- If you change packaging settings in `package.json`, the output filenames may change.
