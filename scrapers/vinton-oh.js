const scraperObject = {
    url: 'https://vintonoh-auditor-classic.ddti.net/Results.aspx?SearchType=Advanced&Criteria=20g%2byYTTdkDAZndaivk5c24sMLcyYauat7F36wGX2843Z9uFB1EWcQH%2f%2bDWzfa%2b%2fJ1HkBZM0bv%2bkUPV6csomYLX9R8gmxn2r2wLeoPb1EchOQE3McItoJkvKcZv%2f8II27JsMxlEFYLkWHKfNYYCsrqADX9avMtTK5YZ%2bxs6x7m6V3CK94iOXXYpZn8OvxXwxsYM5n2Zdniq%2bW2Bv7oAQm%2fnLRIkVuYrxyj6u8tXmRCO4zDRXT%2f1y7dn%2b6lX%2b0OaQhWxmV0B4DSjNWFvnHjTzRagfG27dCNAU94LsEwpGBPM%3d',
    async scraper(browser){
        let page = await browser.newPage();
        console.log(`Navigating to ${this.url}...`);
        await page.goto(this.url);
        let scrapedData = [];
        
        async function scrapeCurrentPage(pages) {
            // Wait for DOM to be rendered
            console.log('Loading: ', pages);
            await page.waitForSelector('.searchresults');
            // console.log('"DOM => .results" loaded.')

            // Wait a second for results to load
            await new Promise(resolve => setTimeout(resolve, 1000));
            // console.log('timeout promise completed.')

            // Get the link to all properties
            let urls = await page.$$eval('.searchresults > tbody > .rowstyle, .alternatingrowstyle', links => {

                // Filter out those who have paid their taxes
                // links = links.filter(link => link.querySelector('.loading-button') !== null)

                // Extract the links from the data
                links = links.map(el => 'https://vintonoh-auditor-classic.ddti.net/Data.aspx?ParcelID=' + el.querySelector('a').textContent)
                return links;
            });
            
            // Extract data from bills page of each link
            let pagePromise = (link) => new Promise(async(resolve, reject) => {
                // console.log('Opening ', link);
                let dataObj = {};
                let newPage = await browser.newPage();
                await newPage.goto(link);
                dataObj['owner'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataProfile_OwnerLabel', text => text.textContent);
                dataObj['parcel'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataProfile_ParcelLabel', text => text.textContent);
                dataObj['address'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataProfile_AddressLabel', text => text.textContent);
                dataObj['mailing_address'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataMailingAddress_MailingAddressLine2Label', text => text.textContent);
                dataObj['acres'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataLegal_AcresLabel', text => text.textContent);
                dataObj['land_use_code'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataLegal_LandUseCodeLabel', text => text.textContent);

                
                // console.log(dataObj['owner']);
                // dataObj['billCount'] = await newPage.$eval('.amount-due', text => {
                //     return $(text).find('tbody').length;
                // });
                // dataObj['amountDue'] = await newPage.$eval('.bill-history', text => {
                //     let nodes = text.querySelectorAll('.balance');
                //     let last = nodes[nodes.length - 1];
                //     return last.textContent;
                // });

                // let parcelObj = {};
                // let parcelPage = await browser.newPage();
                // await parcelPage.goto(newPage.$eval('.parcel > a', text => text.href));
                // parcelObj['legalDesc'] = parcelPage.$eval('.legal > .px-1 > .col-12', text => text.textContent);
                // await parcelPage.close();

                // await newPage.click('#ContentPlaceHolder1_mnuDatan5 > a');
                newPage.evaluate(function() {
                    __doPostBack("ctl00$ContentPlaceHolder1$mnuData",'5');
                });

                await newPage.waitForSelector('#ContentPlaceHolder1_Tax_fvDataProfile_ParcelLabel');
                
                // dataObj['tax_balance'] = await newPage.$$eval('.formview', text => {
                //     let nodes = text.querySelectorAll('tr');
                //     let last = nodes[nodes.length - 1];
                //     return last.querySelector('.value').textContent.replace(/(\r\n|\n|\r)/gm, "");
                // });

                let taxBalance = 0;
                try{
                    taxBalance = await newPage.$eval('#ContentPlaceHolder1_Tax_fvDataTaxBill_Label', text => text.textContent);
                }
                catch(err){
                    taxBalance = 0;
                }

                dataObj['tax_balance'] = taxBalance;


                newPage.evaluate(function() {
                    __doPostBack('ctl00$ContentPlaceHolder1$mnuData','2');
                });

                await newPage.waitForSelector('#ContentPlaceHolder1_Valuation_fvDataValuation_AppraisedTotalValueLabel');

                dataObj['appraised_value'] = await newPage.$eval('#ContentPlaceHolder1_Valuation_fvDataValuation_AppraisedLandValueLabel', text => text.textContent);
                
                 

                // dataObj['assessed_value'] = await newPage.$eval('.parcel-values', text => {
                //     let nodes = text.querySelectorAll('.row');
                //     let last = nodes[0];
                //     return last.querySelector('.value').textContent.replace(/ /g,'').replace(/(\r\n|\n|\r)/gm, "");
                // });

                
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
                const nextButton = await page.$eval('#ContentPlaceHolder1_gvSearchResults > tbody > tr:nth-child(22) > td > table > tbody > tr > td > a', a => a.textContent);
                nextButtonExist = true;
            }
            catch(err){
                nextButtonExist = false;
            }
            pages = pages - 1
            if(nextButtonExist && pages > 0){
                await page.click('#ContentPlaceHolder1_gvSearchResults > tbody > tr:nth-child(22) > td > table > tbody > tr > td > a');   
                return scrapeCurrentPage(pages); // Call this function recursively
            }
            await page.close();
            return scrapedData;
        }
        let data = await scrapeCurrentPage(130);
        console.log(data);
        const ObjectsToCsv = require('objects-to-csv')
        const csv = new ObjectsToCsv(data)
        await csv.toDisk('./vinton-oh.csv')

        return data;

    }
}

module.exports = scraperObject;