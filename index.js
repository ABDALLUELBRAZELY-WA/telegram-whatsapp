const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// --- إعدادات الإرسال لرقمك الشخصي ---
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const WHATSAPP_TARGET = '201040960807@c.us'; // رقمك الشخصي (تأكد من كود الدولة 20 في الأول)

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true, // لو شغال من جهازك ممكن تخليها false عشان تشوف المتصفح
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

whatsappClient.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('⚠️ امسح الكود بموبايلك الآن:');
});

whatsappClient.on('ready', () => {
    console.log('✅✅ السيستم جاهز للإرسال لرقمك الشخصي!');
});

telegramBot.on('message', async (msg) => {
    console.log('📥 استلمت رسالة من تليجرام، جاري التحويل...');
    try {
        // تحويل النص
        if (msg.text) {
            await whatsappClient.sendMessage(WHATSAPP_TARGET, msg.text);
        }
        
        // تحويل الصور أو الفيديو
        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : null);
        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            const media = await MessageMedia.fromUrl(link);
            await whatsappClient.sendMessage(WHATSAPP_TARGET, media, { caption: msg.caption || '' });
        }
        console.log('🚀 تم الإرسال لرقمك بنجاح!');
    } catch (e) {
        console.log('❌ خطأ في الإرسال:', e.message);
    }
});

whatsappClient.initialize();
