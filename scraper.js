import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
// We fetch more deals now (page 0 and 1) to make the Browse page robust
const STORES_API_URL = 'https://www.cheapshark.com/api/1.0/stores';
const OUTPUT_DIR = './public';

const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

async function fetchData() {
    try {
        console.log('Fetching stores and multiple pages of deals...');
        const [storesRes, dealsPage1, dealsPage2] = await Promise.all([
            axios.get(STORES_API_URL),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=1')
        ]);
        
        const storeMap = {};
        storesRes.data.forEach(store => {
            storeMap[store.storeID] = store.storeName;
        });

        // Combine deals and remove duplicates if any
        const allDeals = [...dealsPage1.data, ...dealsPage2.data];
        
        return { deals: allDeals, storeMap };
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
                
                <nav class="flex gap-6 font-bold text-sm">
                    <a href="index.html" class="${isHome} transition-colors">Home</a>
                    <a href="browse.html" class="${isBrowse} transition-colors">Browse Deals</a>
                    <a href="about.html" class="${isAbout} transition-colors">About</a>
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
function generateCard(deal, storeMap) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const savings = Math.round(deal.savings);
    const storeName = storeMap[deal.storeID] || 'Store';
    
    // Data attributes used by the Vanilla JS filter engine
    return `
    <div class="deal-card relative bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700/50 hover:border-indigo-500/50 transition-all duration-300 flex flex-col" 
         data-title="${deal.title.toLowerCase()}" 
         data-price="${deal.salePrice}" 
         data-store="${storeName.toLowerCase()}">
        
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <span class="bg-slate-900/80 text-slate-300 text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">${storeName}</span>
            <div class="bg-red-500 text-white text-xs font-black px-2 py-1 rounded shadow-lg">-${savings}%</div>
        </div>

        <div class="h-40 overflow-hidden bg-slate-900 relative">
            <img src="${deal.thumb}" alt="${deal.title}" loading="lazy" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity">
        </div>
        
        <div class="p-4 flex-1 flex flex-col justify-between relative z-10">
            <h3 class="text-base font-bold text-white mb-3 line-clamp-2 leading-tight" title="${deal.title}">${deal.title}</h3>
            <div class="mt-auto pt-3 border-t border-slate-700/50 flex justify-between items-center">
                <div class="flex flex-col">
                    <span class="text-xs text-slate-500 line-through leading-none mb-1">$${deal.normalPrice}</span>
                    <span class="text-lg font-black text-emerald-400 leading-none">$${deal.salePrice}</span>
                </div>
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-sm transition-colors shadow-md">
                    Get Deal
                </a>
            </div>
        </div>
    </div>
    `;
}

// 3. Page Generator: Home
function generateHomePage(deals, storeMap) {
    const heroDeal = deals[0];
    const topDeals = deals.slice(1, 9); // Only show top 8 on home
    
    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="text-center py-12 md:py-20">
            <h2 class="text-5xl md:text-6xl font-black text-white mb-6">Play More. <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">Pay Less.</span></h2>
            <p class="text-lg text-slate-400 max-w-2xl mx-auto mb-10">Your automated radar for the absolute best PC gaming deals across the entire internet.</p>
            <a href="browse.html" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-xl transition-colors text-lg shadow-lg shadow-indigo-500/30">
                Explore All Deals
            </a>
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

// 4. Page Generator: Browse (With Interactive Filters)
function generateBrowsePage(deals, storeMap) {
    // Extract unique stores from the actual deals we fetched
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
            
            // Get array of checked store values
            const checkedStores = Array.from(storeCheckboxes)
                                     .filter(cb => cb.checked)
                                     .map(cb => cb.value);

            let visibleCount = 0;

            cards.forEach(card => {
                const title = card.getAttribute('data-title');
                const price = parseFloat(card.getAttribute('data-price'));
                const store = card.getAttribute('data-store');

                const matchesSearch = title.includes(term);
                const matchesPrice = price <= maxPrice;
                const matchesStore = checkedStores.includes(store);

                if (matchesSearch && matchesPrice && matchesStore) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            resultsCount.innerText = visibleCount + (visibleCount === 1 ? ' result' : ' results');
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // Event Listeners
        searchInput.addEventListener('input', applyFilters);
        priceSlider.addEventListener('input', (e) => {
            priceValue.innerText = 'Under $' + e.target.value;
            applyFilters();
        });
        storeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

        // Global Reset Function for the empty state
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

// 5. Page Generator: About
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
    
    console.log('Generating Multi-Page Site...');
    const htmlHome = generateHomePage(data.deals, data.storeMap);
    const htmlBrowse = generateBrowsePage(data.deals, data.storeMap);
    const htmlAbout = generateAboutPage();
    
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR);
    }
    
    // Write all three files to the public folder
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), htmlHome);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'browse.html'), htmlBrowse);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'about.html'), htmlAbout);
    
    console.log('Success! Full application built.');
}

build();