import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const API_URL = 'https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=15&sortBy=Deal Rating';
const OUTPUT_DIR = './public';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html');

// Securely grab the affiliate ID from GitHub Secrets. Fallback applied if missing.
const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

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
    <html lang="en" class="scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LootDrop | Premium PC Game Deals</title>
        <meta name="description" content="Discover the best daily PC game deals, discounts, and sales. Updated automatically every day.">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-200 antialiased selection:bg-indigo-500 selection:text-white">
        
        <header class="glass fixed top-0 w-full z-50 transition-all duration-300">
            <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <svg class="w-8 h-8 text-indigo-500" fill="currentColor" viewBox="0 0 24 24"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm3-3c-.83 0-1.5-.67-1.5-1.5S17.67 9 18.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                    <h1 class="text-2xl font-extrabold tracking-tight text-white">Loot<span class="text-indigo-500">Drop</span></h1>
                </div>
                <div class="hidden md:flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p class="text-xs font-medium text-slate-300">Updated: ${dateUpdated}</p>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-6 pt-32 pb-12">
            <div class="text-center mb-12">
                <h2 class="text-4xl md:text-5xl font-extrabold text-white mb-4">Epic Deals, <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Zero Bullshit.</span></h2>
                <p class="text-lg text-slate-400 max-w-2xl mx-auto">We scan the web to find the absolute best PC game discounts. Grab them before they expire.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    `;

    deals.forEach(deal => {
        const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
        const savings = Math.round(deal.savings);
        
        // Generate Rating Badges if data exists
        let ratingHTML = '';
        if (deal.steamRatingPercent && deal.steamRatingPercent > 0) {
            let color = deal.steamRatingPercent >= 80 ? 'text-blue-400 bg-blue-400/10 border-blue-400/20' : 'text-slate-400 bg-slate-400/10 border-slate-400/20';
            ratingHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${color} px-2 py-1 rounded border">Steam: ${deal.steamRatingPercent}%</span>`;
        } else if (deal.metacriticScore && deal.metacriticScore > 0) {
            let color = deal.metacriticScore >= 80 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
            ratingHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${color} px-2 py-1 rounded border">Metacritic: ${deal.metacriticScore}</span>`;
        } else {
            ratingHTML = `<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">No Rating</span>`;
        }
        
        html += `
                <div class="group relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:-translate-y-1 transition-all duration-300 flex flex-col">
                    
                    <div class="absolute top-3 right-3 z-10 bg-red-500/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-red-400">
                        -${savings}%
                    </div>

                    <div class="h-48 overflow-hidden bg-slate-900 relative">
                        <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-90 group-hover:opacity-100">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-800 to-transparent"></div>
                    </div>
                    
                    <div class="p-5 flex-1 flex flex-col justify-between relative z-10 -mt-6">
                        <div>
                            <div class="mb-3">${ratingHTML}</div>
                            <h3 class="text-lg font-bold text-white mb-1 line-clamp-1" title="${deal.title}">${deal.title}</h3>
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-slate-700 flex justify-between items-end">
                            <div class="flex flex-col">
                                <span class="text-xs font-medium text-slate-500 line-through mb-1">$${deal.normalPrice}</span>
                                <span class="text-2xl font-black text-emerald-400">$${deal.salePrice}</span>
                            </div>
                            <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-slate-700 hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all duration-300 shadow-md hover:shadow-indigo-500/25 flex items-center gap-2">
                                Get Deal
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
        `;
    });

    html += `
            </div>
        </main>

        <footer class="border-t border-slate-800 bg-slate-900/50 py-8 mt-auto">
            <div class="max-w-7xl mx-auto px-6 text-center">
                <p class="text-slate-500 text-sm font-medium mb-2">&copy; ${new Date().getFullYear()} LootDrop. Automated Deal Aggregator.</p>
                <p class="text-slate-600 text-xs max-w-xl mx-auto">We may earn an affiliate commission when you buy through links on our site. This does not affect the price you pay.</p>
            </div>
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
    console.log(`Success! Premium UI built at ${OUTPUT_FILE}`);
}

build();