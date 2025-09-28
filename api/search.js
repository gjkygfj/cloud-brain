// استيراد الأدوات الأحدث والأكثر استقرارًا
const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core');

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
        // إضافة إعدادات إضافية لزيادة التوافق مع Vercel
        chromium.setHeadlessMode = true;
        chromium.setGraphicsMode = false;

        // تشغيل المتصفح الخفي بالإعدادات الصحيحة والحديثة
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // استخدام User Agent أحدث لخداع المواقع بشكل أفضل
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        
        const searchUrl = target.replace('QUERY_PLACEHOLDER', encodeURIComponent(query));
        await page.goto(searchUrl, { waitUntil: 'networkidle0' });

        // دالة محسّنة للتعامل مع صفحات الموافقة
        const handleConsent = async () => {
            try {
                const buttonSelectors = [
                    'button[jsname="W297wb"]', // زر "Accept all" الجديد في جوجل
                    '#L2AGLb',                 // زر "أوافق" القديم في جوجل
                    'div[role="button"][aria-label*="Accept"]',
                    'div[role="button"][aria-label*="Agree"]'
                ];
                const consentButton = await page.waitForSelector(buttonSelectors.join(', '), { timeout: 3000 });
                if (consentButton) {
                    await consentButton.click();
                    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => {});
                }
            } catch (error) {
                console.log("Consent button not found, continuing...");
            }
        };

        await handleConsent();
        
        await page.waitForSelector(selector, { timeout: 5000 });

        const searchResults = await page.evaluate((dynamicSelector) => {
            const results = [];
            const items = document.querySelectorAll(dynamicSelector);

            items.forEach((item, index) => {
                if (index < 5) {
                    const title = item.innerText;
                    const linkElement = item.closest('a');
                    if (linkElement) {
                         results.push({ title, link: linkElement.href });
                    }
                }
            });
            return results;
        }, selector);
        
        await browser.close();
        browser = null;

        res.status(200).json(searchResults);

    } catch (error) {
        console.error(error);
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ error: 'Failed to scrape the page. It might be protected or has changed.' });
    }
};
