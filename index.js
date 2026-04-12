// حل مشكلة التشفير والوحدات المفقودة في منصات الاستضافة
const crypto = require('crypto'); 
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// توكن التيليجرام بتاعك (زي ما هو)
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    }
});

const randomWords = ["🔥 بالتوفيق للجميع", "✨ عروض حصرية", "🚀 جودة وسعر لا يقارن", "💎 ثقة وأمان"];

whatsappClient.on('qr', qr => {
    console.log('--- سجل دخول من الكود ده يا نمر ---');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => console.log('✅ البوت شغال يا نمر على السيرفر الجديد!'));

telegramBot.on('message', async (msg) => {
    try {
        const chats = await whatsappClient.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        
        let media = null;
        let fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : (msg.video ? msg.video.file_id : (msg.document ? msg.document.file_id : null));
        
        if (fileId) {
            const link = await telegramBot.getFileLink(fileId);
            media = await MessageMedia.fromUrl(link);
        }

        for (const group of groups) {
            try {
                if (media) await whatsappClient.sendMessage(group.id._serialized, media);
                if (msg.text || msg.caption) {
                    const suffix = "\n\n" + randomWords[Math.floor(Math.random() * randomWords.length)];
                    await whatsappClient.sendMessage(group.id._serialized, (msg.text || msg.caption) + suffix);
                }
                await new Promise(r => setTimeout(r, 1000)); // انتظار ثانية بين كل جروب للأمان
            } catch (err) {
                console.log(`❌ فشل في جروب ${group.name}`);
            }
        }
    } catch (e) { console.log('Error:', e.message); }
});

whatsappClient.initialize();
