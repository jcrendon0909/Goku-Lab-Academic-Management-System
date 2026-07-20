// server/utils/whatsapp.js (versión sin executablePath)
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SESSION_FOLDER = path.join(__dirname, '../../whatsapp-session');

if (!fs.existsSync(SESSION_FOLDER)) {
  fs.mkdirSync(SESSION_FOLDER, { recursive: true });
}

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
    
    // 🔥 Configuración SIN executablePath
    client = new Client({
      puppeteer: {
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
        ],
        userDataDir: SESSION_FOLDER,
      },
    });

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
  // ... (sin cambios)
};

export const isWhatsAppReady = () => isReady;