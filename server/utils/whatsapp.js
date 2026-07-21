// server/utils/whatsapp.js
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

// 🔥 DETECTAR CHROME EN macOS
const getChromePath = () => {
  const paths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      console.log(`✅ Chrome encontrado en: ${p}`);
      return p;
    }
  }
  return null;
};

const CHROME_PATH = getChromePath();

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
        // 🔥 FLAGS PARA EVITAR ERRORES DE CONTEXTO
        '--disable-features=LockProfileCookieDatabase',
        '--disable-session-crashed-bubble',
        '--disable-infobars',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
        '--disable-features=BlockInsecurePrivateNetworkRequests',
        '--disable-blink-features=AutomationControlled',
        '--remote-debugging-port=0',
      ],
      userDataDir: SESSION_FOLDER,
    };

    if (CHROME_PATH) {
      puppeteerConfig.executablePath = CHROME_PATH;
      console.log(`🔧 Usando Chrome del sistema: ${CHROME_PATH}`);
    } else {
      console.warn('⚠️ No se encontró Chrome. Puppeteer intentará usar el que descargue.');
    }

    client = new Client({ puppeteer: puppeteerConfig });

    client.on('qr', (qr) => {
      console.log('📱 Escanea el siguiente código QR:');
      qrcode.generate(qr, { small: true });
      console.log('\n🔗 O genera el QR desde aquí (copia esta URL en tu navegador):');
      console.log(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qr)}\n`);
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