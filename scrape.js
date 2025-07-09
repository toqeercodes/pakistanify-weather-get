const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();
const port = 3000;

app.get('/scrape-weather/:city', async (req, res) => {
    const city = req.params.city;

    // Launch Puppeteer browser with Chromium path and additional arguments
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium-browser',  // Render's default path for Chromium
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
            '--remote-debugging-port=9222'
        ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Go to the weather page for the given city
    const url = `https://world-weather.info/forecast/pakistan/${city}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Wait for the weather number to appear
    await page.waitForSelector('#content-left #weather-now-number');

    // Extract all the required data
    const weatherData = await page.evaluate(() => {
        const data = {};
        console.log("data: ", data);
        // Weather now number (e.g., temperature)
        data.weatherNowNumber = document.querySelector('#content-left #weather-now-number')?.textContent.trim().replace("°F", "");

        // Weather now description
        data.weatherNowDescription = document.querySelector('#weather-now-description dl')?.innerHTML.replace(/\n/g, "");

        // Sun info
        data.sun = document.querySelector('.sun')?.innerHTML.replace(/\n/g, "");

        // DW (data) into
        data.dwInto = document.querySelector('.dw-into')?.textContent.trim().replace(/\n/g, "");

        // Vertical tabs (forecast days)
        data.daysVerticalTabs = document.querySelector('#vertical_tabs')?.innerHTML.replace(/\n/g, "");

        // Icon title
        data.iconTitle = document.querySelector('#weather-now-icon')?.getAttribute('title');

        // Icon HTML
        data.iconHtml = document.querySelector('#weather-now-icon')?.outerHTML;

        // Panes (weather details)
        const panes = [];
        const paneElements = document.querySelectorAll('#content-left .pane');
        paneElements.forEach(pane => {
            panes.push(pane.outerHTML);
        });
        data.panes = panes;

        // Sl boxes (additional weather info)
        const slBoxes = [];
        const slBoxElements = document.querySelectorAll('.sl-box .sl-item');
        slBoxElements.forEach(slBox => {
            const slItemTxt = slBox.querySelector('.sl-item-txt')?.innerHTML.trim();
            const slItemAllTxt = slBox.querySelector('.sl-item-all-txt')?.innerHTML.trim();
            slBoxes.push({ slItemTxt, slItemAllTxt });
        });
        data.slBoxes = slBoxes;

        return data;
    });

    // Close the browser
    await browser.close();

    // Send the extracted data as JSON
    res.json(weatherData);
});

app.listen(port, () => {
    console.log(`Weather scraper app listening`);
});
