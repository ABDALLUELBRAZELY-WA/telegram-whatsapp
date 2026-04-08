const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const TelegramBot = require('node-telegram-bot-api');

// التوكن الخاص بك والرقم المستهدف
const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const WHATSAPP_TARGET = '201159349164@c.us';

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    // السطر ده هو الحل لخطأ null (reading '1') اللي في صورتك
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
    },
    puppeteer: { 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] 
    }
});

whatsappClient.on('qr', (qr) => {
    console.log('✅ امسح الكود الآن:');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('🚀 البوت شغال وجاهز!');
});

telegramBot.on('message', async (msg) => {
    try {
        if (msg.text && !msg.photo && !msg.video) {
            await whatsappClient.sendMessage(WHATSAPP_TARGET, msg.text);
            console.log('📤 نص تم إرساله');
        } else if (msg.photo || msg.video) {
            const fileId = msg.photo ? msg.photo[msg.photo.length - 1].file_id : msg.video.file_id;
            const fileLink = await telegramBot.getFileLink(fileId);
            const media = await MessageMedia.fromUrl(fileLink);
            await whatsappClient.sendMessage(WHATSAPP_TARGET, media, { caption: msg.caption || '' });
            console.log('📸 ميديا تم إرسالها');
        }
    } catch (err) {
        console.log('❌ Error: ' + err.message);
    }
});

whatsappClient.initialize();