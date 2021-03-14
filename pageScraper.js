const scraperObject = {
    url: 'https://monroe.county-taxes.com/public/search/property_tax?search_query=vacant',
    async scraper(browser){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);

    }
}

module.exports = scraperObject;