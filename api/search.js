// استيراد الأدوات الجديدة والمحسّنة
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// هذه هي الوظيفة السحابية التي ستعمل على Vercel
module.exports = async (req, res) => {
    // احصل على المعلومات من رابط الطلب
    const { target, query, selector } = req.query;

    // تحقق من أن كل المعلومات المطلوبة موجودة
    if (!target || !query || !selector) {
        return res.status(400).json({ 
            error: 'Please provide target, query, and selector parameters.' 
        });
    }

    let browser = null;

    try {
        // تشغيل المتصفح الخفي بالإعدادات الصحيحة والحديثة لخوادم Vercel
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(), // الطريقة الجديدة للحصول على المسار
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // خداع الموقع الهدف ليعتقد أننا متصفح حقيقي
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        
        // بناء الرابط الديناميكي والإبحار إليه
        const searchUrl = target.replace('QUERY_PLACEHOLDER', encodeURIComponent(query));
        await page.goto(searchUrl, { waitUntil: 'networkidle0' });

        // تنفيذ كود "كشط" البيانات داخل المتصفح
        const searchResults = await page.evaluate((dynamicSelector) => {
            const results = [];
            // ابحث عن كل العناصر التي تطابق الوصف (Selector) الذي أرسلناه
            const items = document.querySelectorAll(dynamicSelector);

            // خذ أول 5 نتائج فقط
            items.forEach((item, index) => {
                if (index < 5) {
                    const title = item.innerText;
                    // ابحث عن أقرب رابط للعنصر للحصول على اللينك
                    const link = item.closest('a') ? item.closest('a').href : null; 
                    
                    results.push({ title, link });
                }
            });
            return results;
        }, selector); // تمرير الـ selector كمتغير إلى داخل الدالة
        
        // أرسل النتائج التي حصلنا عليها كاستجابة ناجحة
        res.status(200).json(searchResults);

    } catch (error) {
        // في حال حدوث أي خطأ، قم بطباعته في السجلات وأرسل رسالة خطأ
        console.error(error);
        res.status(500).json({ error: 'Something went wrong during the scraping process.' });
    } finally {
        // تأكد من إغلاق المتصفح دائمًا في النهاية لتحرير الموارد
        if (browser !== null) {
            await browser.close();
        }
    }
};
