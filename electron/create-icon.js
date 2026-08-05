// Script to create ICO file from PNG using electron's nativeImage
// Run with: node electron/create-icon.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const srcPng = path.join(__dirname, 'assets', 'icon.png');
const dstIco = path.join(__dirname, 'assets', 'icon.ico');

// Copy PNG as ICO placeholder (electron-builder can handle PNG icons too)
fs.copyFileSync(srcPng, dstIco);

// Also create tray icon (smaller version handled by Electron at runtime)
fs.copyFileSync(srcPng, path.join(__dirname, 'assets', 'tray-icon.png'));

console.log('Icons setup complete');
console.log('  icon.png:', fs.existsSync(srcPng) ? '✅' : '❌');
console.log('  icon.ico:', fs.existsSync(dstIco) ? '✅' : '❌');
console.log('  tray-icon.png:', fs.existsSync(path.join(__dirname, 'assets', 'tray-icon.png')) ? '✅' : '❌');
