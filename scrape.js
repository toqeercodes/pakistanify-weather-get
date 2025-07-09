const express = require('express');
const puppeteer = require('puppeteer-extra');
const puppeteerStealth = require('puppeteer-extra-plugin-stealth');
const app = express();
const port = 3000;

// Use the Stealth plugin
puppeteer.use(puppeteerStealth());

app.get('/scrape-weather/:city', async (req, res) => {
    const city = req.params.city;

    try {
        // Launch Puppeteer with Stealth plugin and full configurations
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                '--proxy-server=http://your-proxy-server:port',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--remote-debugging-port=9222',
                '--window-size=1280x800'
            ]
        });


        const page = await browser.newPage();

        // Set up user agent and other necessary headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'accept-language': 'en-US,en;q=0.9',
            'accept-encoding': 'gzip, deflate, br',
        });

        // Go to the weather page for the given city
        const url = `https://world-weather.info/forecast/pakistan/${city}`;
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Wait for a specific element to make sure the page has loaded
        await page.waitForSelector('#content-left #weather-now-number');

        // Extract the HTML content
        const pageContent = await page.content();  // This will give you the full HTML content

        // Optionally, you can scrape specific data here instead of the whole page
        // const weatherData = await page.evaluate(() => {
        //     return {
        //         temperature: document.querySelector('#content-left #weather-now-number').textContent.trim()
        //     };
        // });

        // Close the browser
        await browser.close();

        // Send the extracted HTML or data as JSON
        res.json({ html: pageContent });

    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Error scraping the website");
    }
});

app.listen(port, () => {
    console.log(`Weather scraper app listening`);
});
