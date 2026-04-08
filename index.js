const TelegramBot = require('node-telegram-bot-api');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const TELEGRAM_TOKEN = '8262731260:AAHmY8o0OTdGm8Wz_86CdkgRVJYFB2Ivybw';
const WHATSAPP_TARGET = '120363424525565248@g.us';

const telegramBot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

const whatsappClient = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

whatsappClient.on('qr', qr => {
    console.log('امسح الـ QR Code بواتساب:');
    qrcode.generate(qr, { small: true });
});

whatsappClient.on('ready', () => {
    console.log('واتساب جاهز!');
});
whatsappClient.on('message', async (msg) => {
    console.log('ID:', msg.from, '| اسم:', msg._data.notifyName);
});whatsappClient.on('message', async (msg) => {
    console.log('ID:', msg.from, '| اسم:', msg._data.notifyName);
});

telegramBot.on('message', async (msg) => {
    try {
        if (msg.text) {
            await whatsappClient.sendMessage(WHATSAPP_TARGET, msg.text);
        } else if (msg.photo) {
            const photo = msg.photo[msg.photo.length - 1];
            const fileLink = await telegramBot.getFileLink(photo.file_id);
            const media = await MessageMedia.fromUrl(fileLink);
            await whatsappClient.sendMessage(WHATSAPP_TARGET, media);
        } else if (msg.video) {
            const fileLink = await telegramBot.getFileLink(msg.video.file_id);
            const media = await MessageMedia.fromUrl(fileLink);
            await whatsappClient.sendMessage(WHATSAPP_TARGET, media);
        }
    } catch (err) {
        console.log('خطأ:', err.message);
    }
});

whatsappClient.initialize();
console.log('البوت شغال...');
