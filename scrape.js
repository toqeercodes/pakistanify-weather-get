const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = 3000;

// In-memory cache to avoid redundant scraping
const cache = {};

// Function to scrape weather data for a single city
const scrapeWeatherForCity = async (citySlug) => {
    const url = `https://world-weather.info/forecast/pakistan/${citySlug}/`;

    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 180000
        });

        await page.waitForSelector('#weather-now-number', { timeout: 240000 });

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

        return weatherData;

    } catch (error) {
        console.error(`Error scraping ${url}:`, error.message);
        throw new Error(`Failed to scrape weather data for ${citySlug}.`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
};

// Route to scrape weather data for multiple cities concurrently
app.get('/scrape-weather', async (req, res) => {
    const cities = req.query.cities?.split(',') || [];
    
    if (cities.length === 0) {
        return res.status(400).json({ error: 'Please provide a list of cities to scrape.' });
    }

    try {
        // Check cache first to avoid redundant requests
        const citiesData = await Promise.all(
            cities.map(async (city) => {
                if (cache[city]) {
                    console.log(`Returning cached data for ${city}`);
                    return { city, data: cache[city] };
                }
                const citySlug = city.toLowerCase();
                const weatherData = await scrapeWeatherForCity(citySlug);
                cache[city] = weatherData;  // Cache the result
                return { city, data: weatherData };
            })
        );

        res.json(citiesData);

    } catch (error) {
        console.error('Error fetching weather data for cities:', error.message);
        res.status(500).json({ error: 'Failed to fetch weather data for cities.' });
    }
});

app.listen(port, () => {
    console.log(`Weather scraper app listening on port ${port}`);
});
