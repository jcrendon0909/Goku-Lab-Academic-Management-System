// server/utils/whatsapp.js
import { Client } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

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

// 🔥 Función para asegurar que Chrome esté disponible
const ensureChrome = () => {
  // Si PUPPETEER_CACHE_DIR está definida, usarla; si no, usar la predeterminada de Render
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
    // Verificar nuevamente después de la descarga
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
  if (!client || !isReady) {
    try {
      await initWhatsApp();
      if (!isReady) {
        throw new Error('Cliente no listo después de reinicializar.');
      }
    } catch (e) {
      throw new Error('Cliente de WhatsApp no está disponible: ' + e.message);
    }
  }

  let cleanNumber = phoneNumber.replace(/\s/g, '').replace(/-/g, '');
  if (cleanNumber.startsWith('+')) cleanNumber = cleanNumber.substring(1);
  if (!cleanNumber.startsWith('52')) cleanNumber = '52' + cleanNumber;

  try {
    const numberId = await client.getNumberId(`+${cleanNumber}`);
    if (!numberId) {
      throw new Error(`El número ${cleanNumber} no parece ser un número de WhatsApp válido.`);
    }
    const chat = await client.getChatById(numberId._serialized);
    await chat.sendMessage(message);
    console.log(`✅ Mensaje enviado a +${cleanNumber}`);
    return { success: true, message: 'Enviado' };
  } catch (error) {
    console.error(`❌ Error al enviar mensaje a ${cleanNumber}:`, error.message);
    throw error;
  }
};

export const isWhatsAppReady = () => isReady;