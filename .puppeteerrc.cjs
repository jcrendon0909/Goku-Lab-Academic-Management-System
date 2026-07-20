// .puppeteerrc.js
const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Cambia la ruta de descarga a la carpeta del proyecto
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
  // Forzar la descarga de Chrome (por defecto ya es false, pero lo dejamos explícito)
  chrome: {
    skipDownload: false,
  },
};