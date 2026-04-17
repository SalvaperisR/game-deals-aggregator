import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = 'https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=15&sortBy=Deal Rating';
const OUTPUT_DIR = './public';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html');
const AFFILIATE_PARAM = '&affiliate_id=YOUR_AFFILIATE_ID_HERE'; // Replace with your actual affiliate ID later

async function fetchDeals() {
    try {
        const response = await axios.get(API_URL);
        return response.data.slice(0, 50); // Get top 50 deals
    } catch (error) {
        console.error('Error fetching deals:', error.message);
        process.exit(1);
    }
}

function generateHTML(deals) {
    const dateUpdated = new Date().toUTCString();
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Top PC Game Deals | Updated Daily</title>
        <meta name="description" content="Discover the best daily PC game deals, discounts, and sales. Updated automatically every day.">
        <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-100 text-gray-900 font-sans">
        <header class="bg-indigo-600 text-white p-6 shadow-md">
            <div class="max-w-6xl mx-auto flex justify-between items-center">
                <h1 class="text-3xl font-bold">LootDrop Deals</h1>
                <p class="text-sm">Last Updated: ${dateUpdated}</p>
            </div>
        </header>

        <main class="max-w-6xl mx-auto p-6 mt-6">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    `;

    deals.forEach(deal => {
        const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
        const savings = Math.round(deal.savings);
        
        html += `
                <div class="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-48 object-cover">
                    <div class="p-4">
                        <h2 class="text-xl font-bold mb-2 truncate" title="${deal.title}">${deal.title}</h2>
                        <div class="flex justify-between items-center mb-4">
                            <div>
                                <span class="text-2xl font-black text-green-600">$${deal.salePrice}</span>
                                <span class="text-sm line-through text-gray-500 ml-2">$${deal.normalPrice}</span>
                            </div>
                            <span class="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">Save ${savings}%</span>
                        </div>
                        <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded transition-colors duration-200">
                            Claim Deal
                        </a>
                    </div>
                </div>
        `;
    });

    html += `
            </div>
        </main>

        <footer class="bg-gray-800 text-white text-center p-4 mt-12">
            <p>&copy; ${new Date().getFullYear()} LootDrop Deals. We may earn a commission from purchases made through our links.</p>
        </footer>
    </body>
    </html>
    `;

    return html;
}

async function build() {
    console.log('Fetching deals...');
    const deals = await fetchDeals();
    
    console.log('Generating HTML...');
    const html = generateHTML(deals);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    
    fs.writeFileSync(OUTPUT_FILE, html);
    console.log(`Success! Site built at ${OUTPUT_FILE}`);
}

build();