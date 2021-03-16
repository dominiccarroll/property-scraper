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

                // let parcelObj = {};
                // let parcelPage = await browser.newPage();
                // await parcelPage.goto(newPage.$eval('.parcel > a', text => text.href));
                // parcelObj['legalDesc'] = parcelPage.$eval('.legal > .px-1 > .col-12', text => text.textContent);
                // await parcelPage.close();

                await newPage.click('.parcel > a');
                // dataObj['legalDesc'] = newPage.$eval('.legal > .px-1 > .col-12', text => text.textContent);
                
                await newPage.waitForSelector('.location');
                
                dataObj['acres'] = await newPage.$eval('.location', text => {
                    let nodes = text.querySelectorAll('.row');
                    let last = nodes[nodes.length - 1];
                    return last.querySelector('.value').textContent.replace(/(\r\n|\n|\r)/gm, "");
                });

                dataObj['assessed_value'] = await newPage.$eval('.parcel-values', text => {
                    let nodes = text.querySelectorAll('.row');
                    let last = nodes[0];
                    return last.querySelector('.value').textContent.replace(/ /g,'').replace(/(\r\n|\n|\r)/gm, "");
                });

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
        let data = await scrapeCurrentPage(50);
        console.log(data);
        const ObjectsToCsv = require('objects-to-csv')
        const csv = new ObjectsToCsv(data)
        await csv.toDisk('../list.csv')

        return data;

    }
}

module.exports = scraperObject;