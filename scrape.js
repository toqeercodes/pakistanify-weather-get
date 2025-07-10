
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

// --- CHANGE 1: The route now accepts a dynamic :city parameter ---
app.get('/scrape-weather/:city', async (req, res) => {
    // --- CHANGE 2: Get the city from the URL and format it correctly ---
    const citySlug = req.params.city.toLowerCase().replace(/_/g, '-').replace(/ /g, '-');
    const url = `https://world-weather.info/forecast/pakistan/${citySlug}/`;
    
    let browser;

    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        console.log(`Navigating to ${url}...`);

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 90000 
        });

        console.log('Page loaded. Scraping data...');
        await page.waitForSelector('#weather-now-number', { timeout: 120000 });

        const weatherData = await page.evaluate(() => {
            const data = {};
            const getText = (selector) => document.querySelector(selector)?.textContent.trim();
            const getHtml = (selector) => document.querySelector(selector)?.innerHTML.trim().replace(/\n/g, "");

            data.weatherNowNumber = getText('#weather-now-number')?.replace("°F", "");
            data.weatherNowDescription = getHtml('#weather-now-description dl');
            data.sun = getHtml('.sun');
            data.dwInto = getText('.dw-into');
            data.daysVerticalTabs = getHtml('#vertical_tabs');
            data.iconTitle = document.querySelector('#weather-now-icon')?.getAttribute('title');
            data.iconHtml = document.querySelector('#weather-now-icon')?.outerHTML;
            data.panes = Array.from(document.querySelectorAll('#content-left .pane')).map(p => p.outerHTML);
            data.slBoxes = Array.from(document.querySelectorAll('.sl-box .sl-item')).map(slBox => ({
                slItemTxt: slBox.querySelector('.sl-item-txt')?.innerHTML.trim(),
                slItemAllTxt: slBox.querySelector('.sl-item-all-txt')?.innerHTML.trim(),
            }));

            return data;
        });

        res.json(weatherData);

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        res.status(500).json({ error: `Failed to scrape weather data.`, details: error.message });
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, () => {
    console.log(`Weather scraper app listening on port ${port}`);
});
