const scraperObject = {
    url: 'https://vintonoh-auditor-classic.ddti.net/Results.aspx?SearchType=Advanced&Criteria=20g+yYTTdkDAZndaivk5c24sMLcyYauat7F36wGX2843Z9uFB1EWcQH/+DWzfa+/J1HkBZM0bv+kUPV6csomYLX9R8gmxn2r2wLeoPb1EchOQE3McItoJkvKcZv/8II27JsMxlEFYLkWHKfNYYCsrqADX9avMtTK5YZ+xs6x7m6V3CK94iOXXYpZn8OvxXwxsYM5n2Zdniq+W2Bv7oAQm/nLRIkVuYrxyj6u8tXmRCO4zDRXT/1y7dn+6lX+0OaQhWxmV0B4DSjNWFvnHjTzRagfG27dCNAU94LsEwpGBPM=',
    async scraper(browser){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);
        let scrapedData = [];
        
        async function scrapeCurrentPage(pages) {
            // Wait for DOM to be rendered
            await page.waitForSelector('.searchresults');
            console.log('"DOM => .results" loaded.')

            // Wait a second for results to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log('timeout promise completed.')

            // Get the link to all properties
            let urls = await page.$$eval('.searchresults > tbody > .rowstyle, .alternatingrowstyle', links => {

                // Filter out those who have paid their taxes
                // links = links.filter(link => link.querySelector('.loading-button') !== null)

                // Extract the links from the data
                links = links.map(el => el.querySelector('a').href)
                return links;
            });
            
            // Extract data from bills page of each link
            let pagePromise = (link) => new Promise(async(resolve, reject) => {
                let dataObj = {};
                let newPage = await browser.newPage();
                await newPage.goto(link);
                dataObj['owner'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataProfile_OwnerLabel', text => text.textContent);
                // dataObj['billCount'] = await newPage.$eval('.amount-due', text => {
                //     return $(text).find('tbody').length;
                // });
                // dataObj['amountDue'] = await newPage.$eval('.bill-history', text => {
                //     let nodes = text.querySelectorAll('.balance');
                //     let last = nodes[nodes.length - 1];
                //     return last.textContent;
                // });
                dataObj['link'] = link;

                // let parcelObj = {};
                // let parcelPage = await browser.newPage();
                // await parcelPage.goto(newPage.$eval('.parcel > a', text => text.href));
                // parcelObj['legalDesc'] = parcelPage.$eval('.legal > .px-1 > .col-12', text => text.textContent);
                // await parcelPage.close();

                // await newPage.click('.parcel > a');
                // dataObj['legalDesc'] = newPage.$eval('.legal > .px-1 > .col-12', text => text.textContent);
                
                // await newPage.waitForSelector('.location');
                
                // dataObj['acres'] = await newPage.$eval('.location', text => {
                //     let nodes = text.querySelectorAll('.row');
                //     let last = nodes[nodes.length - 1];
                //     return last.querySelector('.value').textContent.replace(/(\r\n|\n|\r)/gm, "");
                // });

                // dataObj['assessed_value'] = await newPage.$eval('.parcel-values', text => {
                //     let nodes = text.querySelectorAll('.row');
                //     let last = nodes[0];
                //     return last.querySelector('.value').textContent.replace(/ /g,'').replace(/(\r\n|\n|\r)/gm, "");
                // });

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
                const nextButton = await page.$eval('.searchresults > tbody > tr:last-child > a', a => a.textContent);
                nextButtonExist = true;
            }
            catch(err){
                nextButtonExist = false;
            }
            pages = pages - 1
            if(nextButtonExist && pages > 0){
                await page.click('.searchresults > tbody > tr:last-child > a');   
                return scrapeCurrentPage(pages); // Call this function recursively
            }
            await page.close();
            return scrapedData;
        }
        let data = await scrapeCurrentPage(50);
        console.log(data);
        const ObjectsToCsv = require('objects-to-csv')
        const csv = new ObjectsToCsv(data)
        await csv.toDisk('../list2.csv')

        return data;

    }
}

module.exports = scraperObject;