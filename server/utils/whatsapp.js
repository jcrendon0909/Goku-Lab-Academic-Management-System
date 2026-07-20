// server/utils/whatsapp.js
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 CAMBIO CLAVE: Usar una nueva carpeta de sesión para evitar bloqueos
const SESSION_FOLDER = path.join(__dirname, '../../whatsapp-session-clean');

if (!fs.existsSync(SESSION_FOLDER)) {
  fs.mkdirSync(SESSION_FOLDER, { recursive: true });
}

// 🔥 Función para asegurar que Chrome esté disponible
const ensureChrome = () => {
  const cacheDir = process.env.PUPPETEER_CACHE_DIR || '/opt/render/.cache/puppeteer';
  const chromePath = path.join(cacheDir, 'chrome', 'linux-150.0.7871.24', 'chrome-linux64', 'chrome');
  
  console.log(`🔍 Buscando Chrome en: ${chromePath}`);
  
  if (fs.existsSync(chromePath)) {
    console.log('✅ Chrome encontrado en caché.');
    return chromePath;
  }
  
  console.warn('⚠️ Chrome no encontrado en caché. Descargando en runtime...');
  try {
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
    console.log('✅ Chrome descargado en runtime.');
    if (fs.existsSync(chromePath)) {
      return chromePath;
    } else {
      console.error('❌ No se pudo encontrar Chrome incluso después de la descarga.');
      return null;
    }
  } catch (error) {
    console.error('❌ Error al descargar Chrome:', error.message);
    return null;
  }
};

const CHROME_PATH = ensureChrome();

let client = null;
let isReady = false;
let initPromise = null;
let authAttempts = 0;

export const initWhatsApp = () => {
  if (initPromise) return initPromise;
  if (client && isReady) return Promise.resolve(client);

  if (client) {
    try { client.destroy(); } catch (e) {}
    client = null;
  }

  initPromise = new Promise((resolve, reject) => {
    console.log('🔄 Inicializando cliente de WhatsApp...');
    
    const puppeteerConfig = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        // 🔥 Opciones para evitar bloqueos
        '--disable-features=LockProfileCookieDatabase',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
      ],
      userDataDir: SESSION_FOLDER,
    };

    if (CHROME_PATH) {
      puppeteerConfig.executablePath = CHROME_PATH;
      console.log(`🔧 Usando Chrome en: ${CHROME_PATH}`);
    } else {
      console.warn('⚠️ No se encontró Chrome. Puppeteer intentará usar el sistema.');
    }

    client = new Client({ puppeteer: puppeteerConfig });

    client.on('qr', (qr) => {
      console.log('📱 Escanea el siguiente código QR:');
      qrcode.generate(qr, { small: true });
    });

    client.on('authenticated', () => {
      console.log('✅ WhatsApp autenticado. Sesión guardada automáticamente.');
      authAttempts = 0;
    });

    client.on('ready', () => {
      console.log('🚀 Cliente de WhatsApp listo para enviar mensajes.');
      isReady = true;
      initPromise = null;
      resolve(client);
    });

    client.on('auth_failure', (msg) => {
      console.error('❌ Error de autenticación:', msg);
      authAttempts++;
      if (authAttempts > 3) {
        if (fs.existsSync(SESSION_FOLDER)) {
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          console.log('🗑️ Carpeta de sesión eliminada por fallos repetidos.');
        }
        authAttempts = 0;
      }
      isReady = false;
      client = null;
      initPromise = null;
      reject(new Error('Auth failure'));
    });

    client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp desconectado:', reason);
      isReady = false;
      setTimeout(() => {
        console.log('🔄 Intentando reconectar WhatsApp...');
        client = null;
        initPromise = null;
        initWhatsApp().catch(console.error);
      }, 15000);
    });

    client.initialize().catch((error) => {
      console.error('❌ Error al inicializar WhatsApp:', error.message);
      if (error.message.includes('Execution context was destroyed')) {
        if (fs.existsSync(SESSION_FOLDER)) {
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          console.log('🗑️ Carpeta de sesión eliminada por error de contexto.');
        }
      }
      client = null;
      initPromise = null;
      reject(error);
    });
  });

  return initPromise;
};

export const sendWhatsAppMessage = async (phoneNumber, message) => {
  // ... (sin cambios, igual que antes)
};

export const isWhatsAppReady = () => isReady;