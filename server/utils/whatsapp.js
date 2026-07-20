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

export const initWhatsApp = () => {
  // Si ya hay una promesa de inicialización en curso, devolverla
  if (initPromise) {
    return initPromise;
  }

  // Si el cliente ya está listo, resolver inmediatamente
  if (client && isReady) {
    return Promise.resolve(client);
  }

  // Si hay un cliente pero no está listo, cerrarlo y crear uno nuevo
  if (client) {
    try {
      client.destroy();
    } catch (e) {
      // Ignorar errores al destruir
    }
    client = null;
  }

  initPromise = new Promise((resolve, reject) => {
    console.log('🔄 Inicializando cliente de WhatsApp...');
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
      authAttempts = 0; // Reiniciar contador de fallos
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
      // Si falla varias veces, eliminar sesión corrupta
      if (authAttempts > 3) {
        if (fs.existsSync(SESSION_FOLDER)) {
          fs.rmSync(SESSION_FOLDER, { recursive: true, force: true });
          console.log('🗑️ Carpeta de sesión eliminada por fallos repetidos.');
        }
        authAttempts = 0;
      }
      // Rechazar la promesa para que el servidor sepa que falló
      isReady = false;
      client = null;
      initPromise = null;
      reject(new Error('Auth failure'));
    });

    client.on('disconnected', (reason) => {
      console.warn('⚠️ WhatsApp desconectado:', reason);
      isReady = false;
      // Intentar reconectar después de 15 segundos
      setTimeout(() => {
        console.log('🔄 Intentando reconectar WhatsApp...');
        client = null;
        initPromise = null;
        initWhatsApp().catch(console.error);
      }, 15000);
    });

    client.initialize().catch((error) => {
      console.error('❌ Error al inicializar WhatsApp:', error.message);
      // Si el error es de contexto, eliminar sesión corrupta
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
    // Intentar reinicializar si el cliente no está listo
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