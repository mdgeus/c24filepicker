# Conversation24 File Picker

Electron app for browsing files over SFTP and copying the public asset URL for a selected file.

## Requirements

- Node.js and npm installed on the machine that builds the app
- Windows to build Windows outputs
- macOS to build macOS outputs

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

### macOS DMG

Creates a macOS `.dmg` and `.zip` build:

```bash
npm run dist:mac
```

Typical output:

- `dist/Conversation24 File Picker-<version>-arm64.dmg`
- `dist/Conversation24 File Picker-<version>-arm64.zip`
- or the same filenames with `x64`, depending on the Mac you build on

This should be run on a Mac. Code signing is disabled in this project for internal use.

### macOS ZIP Only

Creates only the macOS `.zip` build:

```bash
npm run dist:mac:zip
```

Typical output:

- `dist/Conversation24 File Picker-<version>-arm64.zip`

This should also be run on a Mac.

### Unpacked App Folder

Creates an unpacked build folder for inspection/testing:

```bash
npm run pack
```

Typical output:

- `dist/win-unpacked/` on Windows
- `dist/mac/` on macOS, depending on the target used

## Notes

- Saved connection settings are stored locally by Electron for the app.
- The key passphrase is not stored.
- Windows builds should be created on Windows, and macOS builds should be created on macOS.
- If you change packaging settings in `package.json`, the output filenames may change.
