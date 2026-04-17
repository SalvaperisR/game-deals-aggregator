import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const DEALS_API_URL = 'https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=20&sortBy=Deal Rating';
const STORES_API_URL = 'https://www.cheapshark.com/api/1.0/stores';
const OUTPUT_DIR = './public';
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'index.html');

const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

// Fetch both Deals and Store names
async function fetchData() {
    try {
        const [dealsRes, storesRes] = await Promise.all([
            axios.get(DEALS_API_URL),
            axios.get(STORES_API_URL)
        ]);
        
        // Create a map of storeID to StoreName for quick lookup
        const storeMap = {};
        storesRes.data.forEach(store => {
            storeMap[store.storeID] = store.storeName;
        });

        return {
            deals: dealsRes.data.slice(0, 50), // Top 50 deals
            storeMap
        };
    } catch (error) {
        console.error('Error fetching data:', error.message);
        process.exit(1);
    }
}

function generateHTML(deals, storeMap) {
    const dateUpdated = new Date().toUTCString();
    
    // Separate Deal of the Day (Index 0) and the rest of the grid
    const heroDeal = deals[0];
    const gridDeals = deals.slice(1);
    
    let html = `
    <!DOCTYPE html>
    <html lang="en" class="scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LootDrop | Elite PC Game Deals</title>
        <meta name="description" content="Instant search and filter for the best daily PC game deals across top storefronts.">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
            .line-clamp-1 { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
            .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            
            /* Animation Classes */
            .fade-in-up { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease-out, transform 0.6s ease-out; }
            .fade-in-up.visible { opacity: 1; transform: translateY(0); }
        </style>
    </head>
    <body class="bg-[#0b1120] text-slate-200 antialiased selection:bg-indigo-500 selection:text-white pb-12">
        
        <header class="glass fixed top-0 w-full z-50 transition-all duration-300 shadow-lg shadow-black/20">
            <div class="max-w-7xl mx-auto px-6 py-4 flex flex-wrap justify-between items-center gap-4">
                <div class="flex items-center gap-2 cursor-pointer" onclick="window.scrollTo(0,0)">
                    <div class="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/30">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h1 class="text-2xl font-black tracking-tight text-white">Loot<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Drop</span></h1>
                </div>
                
                <div class="relative w-full md:w-96 order-3 md:order-none">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    </div>
                    <input type="text" id="searchInput" placeholder="Search games..." class="block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-xl leading-5 bg-slate-800/50 text-slate-300 placeholder-slate-400 focus:outline-none focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all">
                </div>

                <div class="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/50">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <p class="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live Tracker</p>
                </div>
            </div>
        </header>

        <main class="max-w-7xl mx-auto px-6 pt-32 md:pt-28">
            
            <div class="mb-12 fade-in-up visible">
                <h2 class="text-sm font-black uppercase tracking-widest text-indigo-500 mb-4 flex items-center gap-2">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/></svg>
                    Deal of the Day
                </h2>
                <div class="relative bg-slate-800 rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-indigo-900/20 group">
                    <div class="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10"></div>
                    <img src="${heroDeal.thumb}" alt="${heroDeal.title}" class="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700">
                    
                    <div class="relative z-20 p-8 md:p-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div class="max-w-2xl">
                            <span class="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-bold tracking-wider mb-4 uppercase">
                                ${storeMap[heroDeal.storeID] || 'Digital Store'}
                            </span>
                            <h3 class="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">${heroDeal.title}</h3>
                            <div class="flex items-center gap-4 mb-6">
                                <div class="bg-red-500 text-white font-black px-4 py-2 rounded-xl text-lg shadow-lg shadow-red-500/30">
                                    -${Math.round(heroDeal.savings)}%
                                </div>
                                <div>
                                    <span class="text-slate-400 line-through text-lg block">$${heroDeal.normalPrice}</span>
                                    <span class="text-emerald-400 font-black text-3xl block leading-none">$${heroDeal.salePrice}</span>
                                </div>
                            </div>
                        </div>
                        <a href="https://www.cheapshark.com/redirect?dealID=${heroDeal.dealID}${AFFILIATE_PARAM}" target="_blank" class="w-full md:w-auto bg-white text-slate-900 hover:bg-indigo-500 hover:text-white font-black py-4 px-10 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] text-lg text-center flex items-center justify-center gap-3 group/btn">
                            Claim Top Deal
                            <svg class="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                        </a>
                    </div>
                </div>
            </div>

            <div class="flex justify-between items-end border-b border-slate-800 pb-4 mb-8">
                <h2 class="text-2xl font-bold text-white">Trending Drops</h2>
                <span class="text-sm text-slate-500 font-medium" id="resultsCount">${gridDeals.length} Deals Found</span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="dealsGrid">
    `;

    gridDeals.forEach(deal => {
        const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
        const savings = Math.round(deal.savings);
        const storeName = storeMap[deal.storeID] || 'Store';
        
        // Steam Rating formatting
        let ratingHTML = '';
        if (deal.steamRatingPercent && deal.steamRatingPercent > 0) {
            let color = deal.steamRatingPercent >= 80 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            ratingHTML = `<span class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider ${color} px-2 py-0.5 rounded border">Steam ${deal.steamRatingPercent}%</span>`;
        }
        
        html += `
                <div class="deal-card fade-in-up group relative bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-300 flex flex-col" data-title="${deal.title.toLowerCase()}">
                    
                    <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
                        <span class="bg-slate-900/80 backdrop-blur-md text-slate-300 border border-slate-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md shadow-lg">
                            ${storeName}
                        </span>
                        <div class="bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-md shadow-lg border border-red-400/50">
                            -${savings}%
                        </div>
                    </div>

                    <div class="h-44 overflow-hidden bg-slate-900 relative">
                        <img src="${deal.thumb}" alt="${deal.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100">
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                    </div>
                    
                    <div class="p-5 flex-1 flex flex-col justify-between relative z-10">
                        <div>
                            <div class="mb-2 h-5">${ratingHTML}</div>
                            <h3 class="text-lg font-bold text-white mb-1 line-clamp-2 leading-tight" title="${deal.title}">${deal.title}</h3>
                        </div>
                        
                        <div class="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center">
                            <div class="flex flex-col">
                                <span class="text-xs font-medium text-slate-500 line-through leading-none mb-1">$${deal.normalPrice}</span>
                                <span class="text-xl font-black text-emerald-400 leading-none">$${deal.salePrice}</span>
                            </div>
                            <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-slate-700/50 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl transition-all duration-300 shadow-sm hover:shadow-indigo-500/25 flex items-center gap-1.5 text-sm border border-slate-600 hover:border-indigo-500">
                                Get
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                            </a>
                        </div>
                    </div>
                </div>
        `;
    });

    html += `
            </div>
            
            <div id="noResults" class="hidden text-center py-20">
                <svg class="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <h3 class="text-xl font-bold text-slate-400">No deals found</h3>
                <p class="text-slate-500 mt-2">Try adjusting your search terms.</p>
            </div>
        </main>

        <footer class="border-t border-slate-800 bg-slate-900/80 py-8 mt-20">
            <div class="max-w-7xl mx-auto px-6 text-center">
                <h2 class="text-xl font-black tracking-tight text-white mb-4">Loot<span class="text-indigo-500">Drop</span></h2>
                <p class="text-slate-500 text-sm font-medium mb-2">&copy; ${new Date().getFullYear()} Automated Deal Engine.</p>
                <p class="text-slate-600 text-xs max-w-xl mx-auto">We may earn an affiliate commission when you buy through links on our site. Prices and availability are subject to change.</p>
            </div>
        </footer>

        <script>
            // Live Search Engine
            const searchInput = document.getElementById('searchInput');
            const dealCards = document.querySelectorAll('.deal-card');
            const noResults = document.getElementById('noResults');
            const resultsCount = document.getElementById('resultsCount');

            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                let visibleCount = 0;

                dealCards.forEach(card => {
                    const title = card.getAttribute('data-title');
                    if (title.includes(term)) {
                        card.style.display = 'flex';
                        visibleCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });

                resultsCount.innerText = visibleCount + ' Deals Found';
                noResults.style.display = visibleCount === 0 ? 'block' : 'none';
            });

            // Scroll Animation Observer
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target); // Only animate once
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.fade-in-up').forEach((el, index) => {
                // Fixed: Removed nested template literals completely
                el.style.transitionDelay = ((index % 4) * 50) + 'ms';
                observer.observe(el);
            });
        </script>
    </body>
    </html>
    `;

    return html;
}

async function build() {
    console.log('Fetching multi-endpoint data...');
    const data = await fetchData();
    
    console.log('Compiling Elite UI...');
    const html = generateHTML(data.deals, data.storeMap);
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    
    fs.writeFileSync(OUTPUT_FILE, html);
    
    // Fixed: Standard template literal for console log
    console.log(`Success! Elite UI built at ${OUTPUT_FILE}`);
}

build();