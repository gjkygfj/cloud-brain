const chromium = require('chrome-aws-lambda');

module.exports = async (req, res) => {
    const { target, query, selector } = req.query;

    if (!target || !query || !selector) {
        return res.status(400).json({ 
            error: 'Please provide target, query, and selector parameters.' 
        });
    }

    let browser = null;

    try {
        browser = await chromium.puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        const searchUrl = target.replace('QUERY_PLACEHOLDER', encodeURIComponent(query));
        await page.goto(searchUrl, { waitUntil: 'networkidle0' });

        const searchResults = await page.evaluate((dynamicSelector) => {
            const results = [];
            const items = document.querySelectorAll(dynamicSelector);

            items.forEach((item, index) => {
                if (index < 5) {
                    const title = item.innerText;
                    const link = item.closest('a') ? item.closest('a').href : null;
                    results.push({ title, link });
                }
            });
            return results;
        }, selector);
        
        res.status(200).json(searchResults);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Something went wrong.' });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
