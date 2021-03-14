const scraperObject = {
    url: 'https://monroe.county-taxes.com/public/search/property_tax?search_query=vacant',
    async scraper(browser){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);
        let scrapedData = [];
        
        async function scrapeCurrentPage(pages) {
            // Wait for DOM to be rendered
            await page.waitForSelector('.results');
            console.log('"DOM => .results" loaded.')

            // Wait a second for results to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('timeout promise completed.')

            // Get the link to all properties
            let urls = await page.$$eval('.results > .async_result', links => {

                // Filter out those who have paid their taxes
                links = links.filter(link => link.querySelector('.loading-button') !== null)

                // Extract the links from the data
                links = links.map(el => el.querySelector('.name > a').href)
                return links;
            });
            
            // Extract data from bills page of each link
            let pagePromise = (link) => new Promise(async(resolve, reject) => {
                let dataObj = {};
                let newPage = await browser.newPage();
                await newPage.goto(link);
                dataObj['owner'] = await newPage.$eval('.owner', text => text.textContent);
                dataObj['billCount'] = await newPage.$eval('.amount-due', text => {
                    return $(text).find('tbody').length;
                });
                dataObj['amountDue'] = await newPage.$eval('.bill-history', text => {
                    let nodes = text.querySelectorAll('.balance');
                    let last = nodes[nodes.length - 1];
                    return last.textContent;
                });
                dataObj['link'] = link;
                resolve(dataObj);
                await newPage.close();
            });

            for(link in urls){
                let currentPageData = await pagePromise(urls[link]);
                // if (currentPageData['billCount'] > 1) {
                    scrapedData.push(currentPageData);
                // }
                // console.log(currentPageData);
            }
            


            let nextButtonExist = false;
            try{
                const nextButton = await page.$eval('[title~=More]', a => a.textContent);
                nextButtonExist = true;
            }
            catch(err){
                nextButtonExist = false;
            }
            pages = pages - 1
            if(nextButtonExist && pages > 0){
                await page.click('[title~=More]');   
                return scrapeCurrentPage(pages); // Call this function recursively
            }
            await page.close();
            return scrapedData;
        }
        let data = await scrapeCurrentPage(5);
        console.log(data);
        return data;

    }
}

module.exports = scraperObject;