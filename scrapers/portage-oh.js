const scraperObject = {
    url: 'https://portageoh-auditor-classic.ddti.net/Results.aspx?SearchType=Advanced&Criteria=20g%2byYTTdkDLNtXc5FvcXQYubfrmxFczaOTvKdWzsVc2Qgz%2bQp%2f7sUhy7RYpQ%2fsthlIZxfmXGg749SAoPJwmbQKOgJwjn2QrC0HWhwtxVylHc4OkdonUnTzGwPMwYemzaMKrGoHFnvbzSLc3PdYEQkkh4XXJ6Gvq3DaMDeCfCbbk%2beZQ5j9JeAfr2bkdsuX8nLnxhBIb2ywmXSGz9fXjA4v5CBEclyU9yNFNWRLp0ISinX4yFaHR1Tpbk3g1vFddymrpVnDvdQjijA%2b75QMVN3s1zQ0dZLs2CUKdSVwYlSTuvFO6gJ2CyKXKO5K8h0257zn0FXeeTvZ0bQ1WiQ%2fRoPTAcM3EaF74Fot3zwGAZTKULxH6Hdftm%2fAFbAlbB%2f5r3qybIp9grhULk0%2fF4wdv2Sl2Sqrv60tIRCaCOqqVANmP8a%2f0zDt5N5tJVv9CUML3qUct7Kg%2bqqYEopqMU2X6VAgWUwGFroIg9gweibot0FzXgXLX98BVkZbq%2bMbWbf8XLGG7fnhpBtivUjPdswD4rk69JAqxeJxb7ss%2fqRaVjgwla20Dbsqx8L7ZoXr98dG5%2bHWX5pmrELJBLuECUqIc%2fA%3d%3d',
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
                links = links.map(el => 'https://portageoh-auditor-classic.ddti.net/Data.aspx?ParcelID=' + el.querySelector('a').textContent)
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
                dataObj['mailing_address'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataMailingAddress_MailingAddressLine1Label', text => text.textContent);
                dataObj['acres'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataLegal_TotalAcresLabel', text => text.textContent);
                dataObj['land_use_code'] = await newPage.$eval('#ContentPlaceHolder1_Base_fvDataLegal_LandUseDescriptionLabel', text => text.textContent);

                
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
                    __doPostBack('ctl00$ContentPlaceHolder1$mnuData','5');
                });

                await newPage.waitForSelector('#ContentPlaceHolder1_Tax_fvDataTax_Label54');
                
                // dataObj['tax_balance'] = await newPage.$$eval('.formview', text => {
                //     let nodes = text.querySelectorAll('tr');
                //     let last = nodes[nodes.length - 1];
                //     return last.querySelector('.value').textContent.replace(/(\r\n|\n|\r)/gm, "");
                // });

                let taxBalance = 0;
                try{
                    taxBalance = await newPage.$eval('#ContentPlaceHolder1_Tax_fvDataTax_Label54', text => text.textContent);
                }
                catch(err){
                    taxBalance = 0;
                }

                dataObj['tax_balance'] = taxBalance;


                newPage.evaluate(function() {
                    __doPostBack('ctl00$ContentPlaceHolder1$mnuData','1');
                });

                await newPage.waitForSelector('#ContentPlaceHolder1_Land_fvDataLandTotals_ValueTotalLabel');

                dataObj['appraised_value'] = await newPage.$eval('#ContentPlaceHolder1_Land_fvDataLandTotals_ValueTotalLabel', text => text.textContent);
                
                 

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
        let data = await scrapeCurrentPage(10);
        console.log(data);
        const ObjectsToCsv = require('objects-to-csv')
        const csv = new ObjectsToCsv(data)
        await csv.toDisk('./portage-oh.csv')

        return data;

    }
}

module.exports = scraperObject;