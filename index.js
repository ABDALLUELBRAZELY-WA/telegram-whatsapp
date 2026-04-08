const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// --- الإعدادات الصحيحة للجروب ---
const TELEGRAM_TOKEN = '8262731260:AAHmY8o00TdGm8Wz_86CdkgrVJYFB2Ivybw';
const WHATSAPP_TARGET = '1203634242525565248@g.us'; // لاحظ الـ @g.us في الآخر

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

whatsappClient.on('qr', qr => qrcode.generate(qr, { small: true }));
whatsappClient.on('ready', () => console.log('✅ البوت جاهز للإرسال للجروب!'));

telegramBot.on('message', async (msg) => {
    try {
        // لو رسالة نصية
        if (msg.text) {
            await whatsappClient.sendMessage(WHATSAPP_TARGET, msg.text);
        }
        
        // لو صورة أو فيديو
        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : null);
        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            const media = await MessageMedia.fromUrl(link);
            await whatsappClient.sendMessage(WHATSAPP_TARGET, media, { caption: msg.caption || '' });
        }
    } catch (e) {
        console.log('❌ خطأ في الإرسال:', e.message);
    }
});

whatsappClient.initialize();
