import { initWhatsApp, sendWhatsAppMessage, isWhatsAppReady } from './server/utils/whatsapp.js';

const test = async () => {
  console.log('⏳ Inicializando WhatsApp...');
  try {
    await initWhatsApp();
    console.log('✅ WhatsApp listo.');
    // Espera 2 segundos para asegurar que el cliente esté completamente listo
    await new Promise(r => setTimeout(r, 2000));
    console.log('📤 Enviando mensaje de prueba...');
    const result = await sendWhatsAppMessage("525555052424", "Hola, esto es una prueba desde script.");
    console.log('✅ Mensaje enviado:', result);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
};

test();