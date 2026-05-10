const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer'); // هادا هو اللي كيدخل لـ Avito
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// 1. إعداد الواتساب
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox'] }
});

client.on('ready', () => console.log('WhatsApp Ready! ✅'));
client.initialize();

// 2. الميساج الاحترافي اللي غايوصل للكليان (أوتوماتيك)
const autoMessage = `السلام عليكم أخاي،
شفت الإعلان ديالك وبان ليا بلي تقدر تكون محتاج لخدمة كراء السيارات (Location de voitures).

حنا وكالة كراء السيارات، كنقدمو ليك عروض خاصة للمهنيين وأصحاب العقارات:
🚗 أسطول سيارات جديد ونقي.
💰 أثمنة جد مناسبة (يومية/أسبوعية).
🚚 التوصيل حتى لعندك.

إيلا كنتي مهتم، جاوبني على هاد الميساج ونرسل ليك التصاور والأثمنة. نهارك مبروك!`;

// 3. سكريبت "الحرّاث" ديال Avito (Scraper)
async function getLeadsFromAvito(keyword, city) {
    const browser = await puppeteer.launch({ headless: false }); // خليه false باش تشوفو كيجلب النماري
    const page = await browser.newPage();
    await page.goto(`https://www.avito.ma/fr/maroc/${keyword}--أجهزة_منزلية`); // مثال

    // هنا الكود كيبقا يكليكي على "Afficher le numéro" ويجمع النماري
    // هادي غير مصفوفة تجريبية، السكريبت الحقيقي كيعمرها من الموقع
    let leads = [
        { name: "Annonceur 1", number: "2126XXXXXXXX" },
        { name: "Annonceur 2", number: "2127XXXXXXXX" }
    ];
    
    await browser.close();
    return leads;
}

// 4. تشغيل الحملة (القلب ديال البوت)
async function runBot(data) {
    io.emit('status', `جاري البحث عن ${data.keyword} في ${data.city}...`);
    
    // جمع النماري
    const leads = await getLeadsFromAvito(data.keyword, data.city);
    
    io.emit('status', `لقيت ${leads.length} نمرة. بدأت كنصيفط الميساج الاحترافي...`);

    for (let lead of leads) {
        try {
            const chatId = `${lead.number}@c.us`;
            await client.sendMessage(chatId, autoMessage); // صيفط الميساج اللي كتبنا الفوق
            
            io.emit('log', `تم الإرسال لـ ${lead.name} ✅`);
            
            // راحة مابين 15 لـ 20 ثانية (بحال الفيديو) باش ما يتبلوكاش الواتساب
            await new Promise(r => setTimeout(r, 18000)); 
            
        } catch (err) {
            io.emit('log', `خطأ في الإرسال لـ ${lead.number}`);
        }
    }
    io.emit('status', 'الحملة سالات! 🏁');
}

// الربط مع واجهة التحكم
io.on('connection', (socket) => {
    socket.on('start_bot', (data) => runBot(data));
});

http.listen(3000, () => console.log('السيستيم واجد في http://localhost:3000'));