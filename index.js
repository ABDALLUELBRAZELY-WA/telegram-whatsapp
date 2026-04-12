const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

const randomWords = [
    "🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", 
    "💎 ثقة وأمان", "👑 خامات للتميز", "🌟 تابعونا للجديد", 
    "✅ خدمة ممتازة", "🔝 الأفضل دائما"
];

// --- نظام الطابور الاحترافي ---
let messageQueue = [];
let isProcessing = false;

whatsappClient.on('qr', qr => qrcode.generate(qr, { small: true }));
whatsappClient.on('ready', () => console.log('✅ السيستم السريع والمنظم جاهز يا نمر! البوت دلوقتي طلقة 🚀'));

telegramBot.on('message', (msg) => {
    // رص الرسايل في الطابور أول ما توصل
    messageQueue.push(msg);
    processQueue();
});

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    
    isProcessing = true;
    const msg = messageQueue.shift();

    try {
        const chats = await whatsappClient.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        let media = null;
        const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : (msg.document ? msg.document.file_id : null));
        
        // تجهيز الميديا لو موجودة (صور أو فيديوهات)
        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            media = await MessageMedia.fromUrl(link);
        }

        for (const group of groups) {
            try {
                if (media) {
                    // 1- إرسال الميديا لوحدها (بدون النص المتغير) لضمان النظافة والترتيب
                    await whatsappClient.sendMessage(group.id._serialized, media);
                    console.log(`🖼️ ميديا وصلت لـ: ${group.name}`);
                } 
                
                if (msg.text || msg.caption) {
                    // 2- إرسال النص مع الكلمات المتغيرة كرسالة منفصلة
                    const baseText = msg.text || msg.caption || "";
                    const randomSuffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    
                    await whatsappClient.sendMessage(group.id._serialized, baseText + randomSuffix);
                    console.log(`📝 النص المتغير وصل لـ: ${group.name}`);
                }

                // سرعة ممتازة مع أمان (800ms) عشان الواتساب ما يحظرش
                await new Promise(r => setTimeout(r, 800)); 
            } catch (err) {
                console.log(`❌ فشل في جروب ${group.name}`);
            }
        }
    } catch (e) {
        console.log('❌ خطأ في المعالجة:', e.message);
    }

    isProcessing = false;
    processQueue(); 
}

whatsappClient.initialize();
