// Utility to ask our secure background script to fetch data for us
async function fetchFromBackground(url) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "fetchDealData", url: url }, (response) => {
            if (response && response.success) {
                resolve(response.data);
            } else {
                reject(response ? response.error : 'Unknown error');
            }
        });
    });
}

// Configuration
const AFFILIATE_ID = 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

async function init() {
    const match = window.location.pathname.match(/\/app\/(\d+)/);
    if (!match) return;
    const steamAppId = match[1];

    try {
        // 1. Lookup the game (via background worker)
        const gamesData = await fetchFromBackground(`https://www.cheapshark.com/api/1.0/games?steamAppID=${steamAppId}`);
        if (!gamesData || gamesData.length === 0) return; 
        
        const gameId = gamesData[0].gameID;

        // 2. Fetch all active deals
        const dealsData = await fetchFromBackground(`https://www.cheapshark.com/api/1.0/games?id=${gameId}`);
        if (!dealsData || !dealsData.deals || dealsData.deals.length === 0) return;

        // 3. Find the absolute cheapest active deal right now
        const cheapestDeal = dealsData.deals.reduce((min, deal) => parseFloat(deal.price) < parseFloat(min.price) ? deal : min, dealsData.deals[0]);

        if (cheapestDeal.storeID === '1') return; // If Steam is cheapest, do nothing
        if (parseFloat(cheapestDeal.savings) <= 0) return; // If no savings, do nothing

        // 4. Fetch store names
        const storesData = await fetchFromBackground('https://www.cheapshark.com/api/1.0/stores');
        const store = storesData.find(s => s.storeID === cheapestDeal.storeID);
        const storeName = store ? store.storeName : 'Another Store';

        // 5. Inject the Banner
        injectBanner(cheapestDeal, storeName, dealsData.info.title);

    } catch (error) {
        console.error('LootDrop Extension Error:', error);
    }
}

function injectBanner(deal, storeName, gameTitle) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const savings = Math.round(deal.savings);

    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%;
        background: linear-gradient(90deg, #1e1b4b 0%, #312e81 100%); color: #fff;
        z-index: 9999999; padding: 16px 32px; font-family: 'Motiva Sans', Arial, Helvetica, sans-serif;
        display: flex; justify-content: space-between; align-items: center;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8); border-bottom: 2px solid #8b5cf6;
    `;

    banner.innerHTML = `
        <div style="display: flex; align-items: center; gap: 20px;">
            <div style="background: #10b981; color: #064e3b; font-weight: 900; padding: 6px 12px; border-radius: 6px; font-size: 16px; letter-spacing: 1px;">
                -${savings}% OFF
            </div>
            <div style="font-size: 16px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">
                <strong>LootDrop Alert:</strong> Don't buy this here! It's cheaper on <strong>${storeName}</strong> for <strong style="color: #34d399; font-size: 20px;">$${deal.price}</strong>.
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 20px;">
            <a href="${dealUrl}" target="_blank" style="background: #8b5cf6; color: white; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: bold; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; transition: all 0.2s ease-in-out; box-shadow: 0 4px 15px rgba(139,92,246,0.4);" onmouseover="this.style.background='#7c3aed'; this.style.transform='translateY(-2px)';" onmouseout="this.style.background='#8b5cf6'; this.style.transform='translateY(0)';">
                Claim Deal Now
            </a>
            <button id="lootdrop-close" style="background: transparent; border: none; color: #9ca3af; font-size: 28px; cursor: pointer; padding: 0 10px;" onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#9ca3af'">&times;</button>
        </div>
    `;

    document.body.appendChild(banner);
    document.body.style.transition = 'margin-top 0.3s ease';
    document.body.style.marginTop = '70px'; 

    document.getElementById('lootdrop-close').addEventListener('click', () => {
        banner.remove();
        document.body.style.marginTop = '0';
    });
}

init();