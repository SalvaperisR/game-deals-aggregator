import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const STORES_API_URL = 'https://www.cheapshark.com/api/1.0/stores';
const OUTPUT_DIR = './public';

const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

async function fetchData() {
    try {
        console.log('Fetching stores, standard deals, and hunting for 100% FREE drops...');
        // Added a dedicated API call with upperPrice=0 to strictly find 100% free games
        const [storesRes, dealsPage1, dealsPage2, freeDealsRes] = await Promise.all([
            axios.get(STORES_API_URL),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=1'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=0')
        ]);
        
        const storeMap = {};
        storesRes.data.forEach(store => {
            storeMap[store.storeID] = store.storeName;
        });

        const allDeals = [...dealsPage1.data, ...dealsPage2.data];
        
        // Ensure free deals are unique and truly 0.00
        const freeDeals = freeDealsRes.data.filter(deal => parseFloat(deal.salePrice) === 0.00);
        
        return { deals: allDeals, freeDeals, storeMap };
    } catch (error) {
        console.error('Error fetching data:', error.message);
        process.exit(1);
    }
}

// --- TEMPLATE ENGINE ---

// 1. Master Layout (Applies to all pages)
function renderLayout(title, content, activePage) {
    const year = new Date().getFullYear();
    const isHome = activePage === 'home' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isBrowse = activePage === 'browse' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isAbout = activePage === 'about' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isFree = activePage === 'free' ? 'text-emerald-400' : 'text-slate-300 hover:text-white';

    return `
    <!DOCTYPE html>
    <html lang="en" class="scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | LootDrop</title>
        <meta name="description" content="Instant search and filter for the best daily PC game deals.">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .glass { background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
            .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        </style>
    </head>
    <body class="bg-[#0b1120] text-slate-200 antialiased flex flex-col min-h-screen">
        
        <header class="glass fixed top-0 w-full z-50 transition-all duration-300 shadow-lg shadow-black/20">
            <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="index.html" class="flex items-center gap-2">
                    <div class="bg-gradient-to-tr from-indigo-600 to-purple-600 p-1.5 rounded-lg">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h1 class="text-xl font-black tracking-tight text-white">Loot<span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Drop</span></h1>
                </a>
                
                <nav class="hidden md:flex gap-6 font-bold text-sm items-center">
                    <a href="index.html" class="${isHome} transition-colors">Home</a>
                    <a href="browse.html" class="${isBrowse} transition-colors">Browse Deals</a>
                    <a href="free.html" class="${isFree} transition-colors flex items-center gap-1">
                        Free Drops 
                        <span class="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">Live</span>
                    </a>
                    <a href="about.html" class="${isAbout} transition-colors">About</a>
                </nav>

                <nav class="flex md:hidden gap-4 font-bold text-xs items-center">
                    <a href="browse.html" class="${isBrowse}">Deals</a>
                    <a href="free.html" class="${isFree} flex items-center gap-1">Free <span class="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span></a>
                </nav>
            </div>
        </header>

        <main class="flex-grow pt-24 pb-12">
            ${content}
        </main>

        <footer class="border-t border-slate-800 bg-slate-900/80 py-8 mt-auto">
            <div class="max-w-7xl mx-auto px-6 text-center">
                <h2 class="text-xl font-black tracking-tight text-white mb-2">Loot<span class="text-indigo-500">Drop</span></h2>
                <p class="text-slate-500 text-sm mb-2">&copy; ${year} Automated Deal Engine.</p>
                <p class="text-slate-600 text-xs max-w-xl mx-auto">We may earn an affiliate commission when you buy through links on our site.</p>
            </div>
        </footer>
    </body>
    </html>
    `;
}

// 2. Component: Generate a Single Deal Card HTML
function generateCard(deal, storeMap, isFree = false) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const savings = Math.round(deal.savings);
    const storeName = storeMap[deal.storeID] || 'Store';
    
    // Apply special styling if the deal is 100% free
    const badgeBg = isFree ? 'bg-emerald-500' : 'bg-red-500';
    const badgeText = isFree ? '100% OFF' : `-${savings}%`;
    const priceColor = isFree ? 'text-emerald-400 animate-pulse' : 'text-emerald-400';
    const cardBorder = isFree ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700/50 hover:border-indigo-500/50';
    const buttonStyle = isFree ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500';

    return `
    <div class="deal-card relative bg-slate-800/50 rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${cardBorder}" 
         data-title="${deal.title.toLowerCase()}" 
         data-price="${deal.salePrice}" 
         data-store="${storeName.toLowerCase()}">
        
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <span class="bg-slate-900/80 text-slate-300 text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">${storeName}</span>
            <div class="${badgeBg} text-white text-xs font-black px-2 py-1 rounded shadow-lg tracking-wide">${badgeText}</div>
        </div>

        <div class="h-40 overflow-hidden bg-slate-900 relative">
            <img src="${deal.thumb}" alt="${deal.title}" loading="lazy" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity">
        </div>
        
        <div class="p-4 flex-1 flex flex-col justify-between relative z-10">
            <h3 class="text-base font-bold text-white mb-3 line-clamp-2 leading-tight" title="${deal.title}">${deal.title}</h3>
            <div class="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center">
                <div class="flex flex-col">
                    <span class="text-xs text-slate-500 line-through leading-none mb-1">$${deal.normalPrice}</span>
                    <span class="text-lg font-black leading-none ${priceColor}">$${deal.salePrice}</span>
                </div>
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="${buttonStyle} text-white font-bold py-1.5 px-3 rounded-lg text-sm transition-colors shadow-md">
                    Claim
                </a>
            </div>
        </div>
    </div>
    `;
}

// 3. Page Generator: Home
function generateHomePage(deals, storeMap) {
    const topDeals = deals.slice(0, 8); 
    
    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="text-center py-12 md:py-20">
            <h2 class="text-5xl md:text-6xl font-black text-white mb-6">Play More. <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Pay Less.</span></h2>
            <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">Your automated radar for the absolute best PC gaming deals across the entire internet.</p>
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="browse.html" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-xl transition-colors text-lg shadow-lg shadow-indigo-500/30">
                    Explore All Deals
                </a>
                <a href="free.html" class="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-4 px-8 rounded-xl transition-colors text-lg flex items-center justify-center gap-2">
                    View Free Drops
                    <span class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                </a>
            </div>
        </div>
        
        <h3 class="text-2xl font-bold text-white border-b border-slate-800 pb-4 mb-6">Top Trending Right Now</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
    `;
    
    topDeals.forEach(deal => content += generateCard(deal, storeMap));
    
    content += `
        </div>
    </div>`;
    
    return renderLayout('Home', content, 'home');
}

// 4. Page Generator: Free Drops (Viral Traffic Page)
function generateFreePage(freeDeals, storeMap) {
    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="bg-emerald-900/20 border border-emerald-500/30 rounded-3xl p-8 md:p-12 mb-10 text-center relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
            <h2 class="text-4xl md:text-5xl font-black text-white mb-4">100% Free <span class="text-emerald-400">Game Drops</span></h2>
            <p class="text-lg text-emerald-100/70 max-w-2xl mx-auto">These games are currently completely free to claim and keep forever. Hurry, before the promotion expires!</p>
        </div>
    `;

    if (freeDeals.length === 0) {
        content += `
        <div class="text-center py-20 bg-slate-800/30 rounded-2xl border border-slate-800">
            <svg class="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3 class="text-2xl font-bold text-slate-400">No Free Drops Active</h3>
            <p class="text-slate-500 mt-2">The storefronts aren't giving away any free games right now. Check back tomorrow!</p>
            <a href="browse.html" class="inline-block mt-6 text-indigo-400 hover:text-indigo-300 font-bold underline">Check out deals under $5 instead</a>
        </div>
        `;
    } else {
        content += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
        freeDeals.forEach(deal => {
            content += generateCard(deal, storeMap, true);
        });
        content += `</div>`;
    }

    content += `</div>`;
    return renderLayout('100% Free Drops', content, 'free');
}

// 5. Page Generator: Browse (With Interactive Filters)
function generateBrowsePage(deals, storeMap) {
    const availableStores = [...new Set(deals.map(d => storeMap[d.storeID] || 'Store'))].sort();

    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row gap-8">
            <aside class="w-full md:w-64 flex-shrink-0">
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 sticky top-28">
                    <h3 class="text-lg font-black text-white mb-4">Filters</h3>
                    
                    <div class="mb-6">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Search</label>
                        <input type="text" id="searchInput" placeholder="Find a game..." class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none">
                    </div>

                    <div class="mb-6">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Max Price</label>
                        <input type="range" id="priceSlider" min="0" max="30" step="1" value="30" class="w-full accent-indigo-500">
                        <div class="flex justify-between text-sm font-bold text-emerald-400 mt-2">
                            <span>$0</span>
                            <span id="priceValue">Under $30</span>
                        </div>
                    </div>

                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Storefronts</label>
                        <div class="space-y-2" id="storeFilters">
    `;

    availableStores.forEach(store => {
        content += `
                            <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" value="${store.toLowerCase()}" class="store-checkbox rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-900 w-4 h-4" checked>
                                ${store}
                            </label>
        `;
    });

    content += `
                        </div>
                    </div>
                </div>
            </aside>

            <div class="flex-grow">
                <div class="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-white">All Deals</h2>
                    <span class="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full" id="resultsCount">${deals.length} results</span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dealsGrid">
    `;

    deals.forEach(deal => content += generateCard(deal, storeMap));

    content += `
                </div>
                <div id="noResults" class="hidden text-center py-20">
                    <h3 class="text-xl font-bold text-slate-400">No deals match your filters.</h3>
                    <button onclick="resetFilters()" class="mt-4 text-indigo-400 hover:text-indigo-300 underline font-bold">Reset Filters</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        const searchInput = document.getElementById('searchInput');
        const priceSlider = document.getElementById('priceSlider');
        const priceValue = document.getElementById('priceValue');
        const storeCheckboxes = document.querySelectorAll('.store-checkbox');
        const cards = document.querySelectorAll('.deal-card');
        const resultsCount = document.getElementById('resultsCount');
        const noResults = document.getElementById('noResults');

        function applyFilters() {
            const term = searchInput.value.toLowerCase();
            const maxPrice = parseFloat(priceSlider.value);
            const checkedStores = Array.from(storeCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
            let visibleCount = 0;

            cards.forEach(card => {
                const title = card.getAttribute('data-title');
                const price = parseFloat(card.getAttribute('data-price'));
                const store = card.getAttribute('data-store');

                if (title.includes(term) && price <= maxPrice && checkedStores.includes(store)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            resultsCount.innerText = visibleCount + (visibleCount === 1 ? ' result' : ' results');
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        searchInput.addEventListener('input', applyFilters);
        priceSlider.addEventListener('input', (e) => {
            priceValue.innerText = 'Under $' + e.target.value;
            applyFilters();
        });
        storeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

        window.resetFilters = function() {
            searchInput.value = '';
            priceSlider.value = 30;
            priceValue.innerText = 'Under $30';
            storeCheckboxes.forEach(cb => cb.checked = true);
            applyFilters();
        };
    </script>
    `;

    return renderLayout('Browse Deals', content, 'browse');
}

// 6. Page Generator: About
function generateAboutPage() {
    const content = `
    <div class="max-w-3xl mx-auto px-6 py-12 text-slate-300">
        <h2 class="text-4xl font-black text-white mb-6 border-b border-slate-800 pb-4">About LootDrop</h2>
        
        <div class="prose prose-invert prose-indigo max-w-none space-y-6">
            <p class="text-lg">Welcome to LootDrop, your automated engine for discovering the best PC game deals.</p>
            
            <h3 class="text-2xl font-bold text-white mt-8">How it Works</h3>
            <p>Our servers scan multiple digital storefronts (including Steam, Fanatical, Green Man Gaming, and Humble Bundle) every single day. We aggregate the highest discounts and present them in a lightning-fast, ad-free environment.</p>
            
            <h3 class="text-2xl font-bold text-white mt-8">Affiliate Disclosure</h3>
            <p class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 italic">
                LootDrop is a participant in various affiliate marketing programs. This means we may earn a commission on purchases made through our links to retailer sites. <strong>This comes at absolutely no extra cost to you</strong>, and helps keep our servers running.
            </p>

            <h3 class="text-2xl font-bold text-white mt-8">Contact</h3>
            <p>For inquiries, partnerships, or support, please reach out via our GitHub repository.</p>
        </div>
    </div>
    `;
    return renderLayout('About Us', content, 'about');
}

// --- MAIN BUILD PIPELINE ---
async function build() {
    const data = await fetchData();
    
    console.log('Generating Multi-Page Site including Viral Free Page...');
    const htmlHome = generateHomePage(data.deals, data.storeMap);
    const htmlBrowse = generateBrowsePage(data.deals, data.storeMap);
    const htmlFree = generateFreePage(data.freeDeals, data.storeMap);
    const htmlAbout = generateAboutPage();
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    
    // Write all pages to the public folder
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), htmlHome);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'browse.html'), htmlBrowse);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'free.html'), htmlFree);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'about.html'), htmlAbout);
    
    console.log('Success! Full application built.');
}

build();