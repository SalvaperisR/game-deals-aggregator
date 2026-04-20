import axios from 'axios';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const STORES_API_URL = 'https://www.cheapshark.com/api/1.0/stores';
const OUTPUT_DIR = './public';
const SITE_DOMAIN = 'https://SalvaperisR.github.io/game-deals-aggregator'; 

const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

// --- DATA ENGINE ---
async function fetchData() {
    try {
        console.log('🚀 Fetching multi-page data and store mappings...');
        const [storesRes, dealsPage1, dealsPage2, freeDealsRes] = await Promise.all([
            axios.get(STORES_API_URL),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=30&sortBy=Deal Rating&pageNumber=1'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,8,11,15&upperPrice=0')
        ]);
        
        const storeMap = {};
        storesRes.data.forEach(store => storeMap[store.storeID] = store.storeName);

        const allDeals = [...dealsPage1.data, ...dealsPage2.data];
        const freeDeals = freeDealsRes.data.filter(deal => parseFloat(deal.salePrice) === 0.00);
        
        return { deals: allDeals, freeDeals, storeMap };
    } catch (error) {
        console.error('❌ Error fetching data:', error.message);
        process.exit(1);
    }
}

// --- UI COMPONENTS ---

function generateCard(deal, storeMap, isFree = false) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const storeName = storeMap[deal.storeID] || 'Store';
    const rating = parseFloat(deal.dealRating);
    const savings = Math.round(deal.savings);
    
    let cardStyle = 'border-slate-700/50 hover:border-indigo-500/50';
    let badge = `<div class="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg">-${savings}%</div>`;

    if (isFree) {
        cardStyle = 'border-emerald-500/50 shadow-lg shadow-emerald-500/10';
        badge = `<div class="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg animate-pulse text-center">FREE</div>`;
    } else if (rating >= 9.0) {
        cardStyle = 'border-amber-400/60 shadow-lg shadow-amber-400/10';
    }

    return `
    <div class="deal-card relative bg-slate-800/40 backdrop-blur-md rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${cardStyle} hover:-translate-y-1"
         data-title="${deal.title.toLowerCase()}" data-price="${deal.salePrice}" data-store="${storeName.toLowerCase()}">
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <div class="flex flex-col gap-1 items-start">
                <span class="bg-slate-900/90 text-slate-300 text-[9px] font-bold uppercase px-2 py-1 rounded border border-white/5">${storeName}</span>
                ${rating >= 9.0 && !isFree ? '<span class="bg-amber-500 text-slate-900 text-[8px] font-black px-1.5 rounded uppercase">S-Tier</span>' : ''}
            </div>
            ${badge}
        </div>
        <div class="h-40 overflow-hidden bg-slate-900 relative">
            <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" loading="lazy">
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between relative z-10">
            <h3 class="text-sm font-bold text-white mb-3 line-clamp-2 leading-tight" title="${deal.title}">${deal.title}</h3>
            <div class="mt-auto pt-3 border-t border-white/5 flex justify-between items-center">
                <div class="flex flex-col">
                    <span class="text-[10px] text-slate-500 line-through leading-none mb-1">$${deal.normalPrice}</span>
                    <span class="text-lg font-black leading-none ${isFree ? 'text-emerald-400 animate-pulse' : 'text-emerald-400'}">$${deal.salePrice}</span>
                </div>
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-all shadow-md">Claim</a>
            </div>
        </div>
    </div>`;
}

// --- MASTER LAYOUT ---

function renderLayout(title, description, content, activePage, storeMap, availableStoreIDs, deals) {
    const year = new Date().getFullYear();
    const isHome = activePage === 'home' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isBrowse = activePage === 'browse' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isFree = activePage === 'free' ? 'text-emerald-400' : 'text-slate-300 hover:text-white';
    
    // Live Ticker Generation
    const tickerItems = (deals || []).slice(0, 15).map(d => `<span class="mx-10 font-bold">💎 ${d.title}: <span class="text-emerald-400">$${d.salePrice}</span></span>`).join('');

   let seoFooter = '';
    if (availableStoreIDs && storeMap) {
        seoFooter = `
        <div class="max-w-7xl mx-auto px-6 py-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
                <h4 class="text-white font-black mb-4 uppercase tracking-widest text-xs">Top Storefronts</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    ${availableStoreIDs.map(id => {
                        const sName = storeMap[id];
                        const slug = `store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
                        return `<li><a href="${slug}" class="hover:text-white transition-colors">${sName} Deals</a></li>`;
                    }).join('')}
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black mb-4 uppercase tracking-widest text-xs">Price Drops</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a href="under-5.html" class="hover:text-white transition-colors">Games Under $5</a></li>
                    <li><a href="under-10.html" class="hover:text-white transition-colors">Games Under $10</a></li>
                    <li><a href="free.html" class="hover:text-white transition-colors underline decoration-emerald-400">100% Free Games</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black mb-4 uppercase tracking-widest text-xs">LootDrop</h4>
                <p class="text-slate-300 text-xs mb-4">Your automated engine for the best PC gaming discounts.</p>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a href="browse.html" class="hover:text-white transition-colors">All Deals</a></li>
                    <li><a href="about.html" class="hover:text-white transition-colors">About & Disclosure</a></li>
                </ul>
            </div>
        </div>`;
    }

    return `
    <!DOCTYPE html>
    <html lang="en" class="scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} | LootDrop</title>
        <meta name="description" content="${description}">
        <meta name="google-site-verification" content="q9Fphfg84545ZHMq8phpNLIyduEW07oowLI6Njm_Cdk" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { font-family: 'Inter', sans-serif; background-color: #0b1120; }
            .glass { background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
            .ticker-wrap { animation: scroll 60s linear infinite; width: max-content; }
            @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            
            /* The Premium Visual Upgrade */
            .mesh-gradient { background: radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%); }
            .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        </style>
    </head>
    <body class="text-slate-200 antialiased flex flex-col min-h-screen mesh-gradient">
        
        <div class="bg-indigo-600/10 border-b border-white/5 py-2 overflow-hidden whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-indigo-300 z-[60] relative">
            <div class="flex ticker-wrap">
                ${tickerItems} ${tickerItems}
            </div>
        </div>

        <header class="glass fixed top-8 left-0 right-0 w-full z-50 shadow-2xl">
            <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="index.html" class="flex items-center gap-3 group">
                    <div class="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-500/40 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h1 class="text-xl font-black text-white tracking-tighter uppercase">LootDrop</h1>
                </a>
                <nav class="hidden md:flex gap-10 font-bold text-xs uppercase tracking-widest">
                    <a href="index.html" class="${isHome} hover:text-white transition-colors">Home</a>
                    <a href="browse.html" class="${isBrowse} hover:text-white transition-colors">Browse</a>
                    <a href="free.html" class="${isFree} hover:text-emerald-400 transition-colors">Free Drops</a>
                </nav>
            </div>
        </header>

        <main class="flex-grow pt-40 pb-20">
            ${content}
        </main>

        <footer class="bg-slate-950/80 pt-10 mt-auto">
            ${seoFooter}
            <div class="border-t border-white/10 py-8 text-center bg-black/60">
                <p class="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                    &copy; ${year} LootDrop. Automated Deal Engine. Affiliate Disclosure: Links may earn commissions.
                </p>
            </div>
        </footer>
    </body>
    </html>
    `;
}

// --- PAGE GENERATORS ---

function generateHomePage(deals, storeMap, freeDeals, availableStoreIDs) {
    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="text-center py-20 relative">
            <div class="absolute inset-0 -z-10 bg-indigo-500/10 blur-[120px] rounded-full w-1/2 mx-auto"></div>
            <h2 class="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">THE BEST <span class="text-indigo-500">DEALS</span><br>FOR GAMERS.</h2>
            <p class="text-slate-400 max-w-xl mx-auto mb-10 text-lg font-medium leading-relaxed">Stop overpaying. We track the price drops across the internet so you don't have to.</p>
        </div>

        <div class="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-[2rem] p-8 md:p-16 mb-24 flex flex-col md:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group">
            <div class="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="flex-1 relative z-10">
                <span class="bg-indigo-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6 inline-block shadow-lg shadow-indigo-500/40">Powerup Available</span>
                <h3 class="text-4xl font-black text-white mb-6 leading-tight">Install the LootDrop<br>Companion Extension</h3>
                <p class="text-slate-300 mb-8 leading-relaxed text-lg">See real-time price drops directly on the Steam Store. Automatically find the lowest prices without leaving Steam.</p>
                <a href="https://github.com/SalvaperisR/game-deals-aggregator/archive/refs/heads/main.zip" class="inline-block bg-white text-slate-900 font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10">DOWNLOAD EXTENSION</a>
            </div>
            <div class="w-full md:w-1/3 relative z-10">
                <div class="bg-slate-900/80 p-6 rounded-3xl border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white">L</div>
                        <div class="flex-1 space-y-2">
                            <div class="h-2 bg-white/10 rounded w-3/4"></div>
                            <div class="h-2 bg-white/5 rounded w-1/2"></div>
                        </div>
                    </div>
                    <div class="h-32 bg-indigo-500/10 rounded-xl border border-indigo-500/20 flex items-center justify-center text-center px-4">
                        <span class="text-indigo-400 font-black text-xs uppercase tracking-tighter">Bypassing Steam Price Barriers...</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex items-center justify-between mb-12 border-l-4 border-indigo-500 pl-6">
            <h3 class="text-2xl font-black text-white uppercase tracking-tighter">S-Tier Drops</h3>
            <a href="browse.html" class="text-indigo-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">View All Deals →</a>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            ${deals.slice(0, 12).map(d => generateCard(d, storeMap)).join('')}
        </div>
    </div>`;
    return renderLayout('Home', 'The ultimate PC game deal aggregator.', content, 'home', storeMap, availableStoreIDs, deals);
}

// BROWSE PAGE GENERATOR
function generateBrowsePage(deals, storeMap, availableStoreIDs) {
    const availableStores = [...new Set(deals.map(d => storeMap[d.storeID] || 'Store'))].sort();

    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="flex flex-col md:flex-row gap-8">
            <aside class="w-full md:w-64 flex-shrink-0">
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 sticky top-36">
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
                            ${availableStores.map(store => `
                            <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" value="${store.toLowerCase()}" class="store-checkbox rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-900 w-4 h-4" checked>
                                ${store}
                            </label>`).join('')}
                        </div>
                    </div>
                </div>
            </aside>

            <div class="flex-grow">
                <div class="flex justify-between items-center border-b border-white/10 pb-4 mb-6">
                    <h2 class="text-3xl font-black text-white uppercase tracking-tighter">All Deals</h2>
                    <span class="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full" id="resultsCount">${deals.length} results</span>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dealsGrid">
                    ${deals.map(deal => generateCard(deal, storeMap)).join('')}
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
    return renderLayout('Browse All Deals', 'Filter and search through the top 100 PC game deals right now.', content, 'browse', storeMap, availableStoreIDs, deals);
}

// --- MAIN BUILD PIPELINE ---

async function build() {
    const data = await fetchData();
    const availableStoreIDs = [...new Set(data.deals.map(d => d.storeID))];
    
    console.log('🏗️ Building Full Static Matrix...');
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    
    // Core Files
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), generateHomePage(data.deals, data.storeMap, data.freeDeals, availableStoreIDs));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'browse.html'), generateBrowsePage(data.deals, data.storeMap, availableStoreIDs));
    
    // Free Page
    const freeContent = `<div class="max-w-7xl mx-auto px-6"><h2 class="text-4xl font-black text-emerald-400 mb-12 uppercase tracking-tighter">100% Free Drops</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${data.freeDeals.length > 0 ? data.freeDeals.map(d => generateCard(d, data.storeMap, true)).join('') : '<p class="text-slate-500">No free deals right now.</p>'}</div></div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'free.html'), renderLayout('Free Drops', '100% Free PC games.', freeContent, 'free', data.storeMap, availableStoreIDs, data.deals));

    // About Page
    const aboutContent = `
        <div class="max-w-3xl mx-auto px-6 py-12 text-slate-300">
            <h2 class="text-4xl font-black text-white mb-6 border-b border-slate-800 pb-4 uppercase">About LootDrop</h2>
            <p class="text-lg mb-6 leading-relaxed">LootDrop is an automated system scanning digital storefronts every 24 hours to find elite price drops.</p>
            <p class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 italic">Affiliate Disclosure: We earn commissions on qualifying purchases to keep this engine running for free.</p>
        </div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'about.html'), renderLayout('About Us', 'LootDrop About Page.', aboutContent, 'about', data.storeMap, availableStoreIDs, data.deals));

    // SEO Storefront & Price Pages
    availableStoreIDs.forEach(id => {
        const sName = data.storeMap[id];
        const storeDeals = data.deals.filter(d => d.storeID === id);
        const slug = `store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        const html = renderLayout(`${sName} Deals`, `Current sales at ${sName}.`, `<div class="max-w-7xl mx-auto px-6"><h2 class="text-4xl font-black text-white mb-12 uppercase tracking-tighter">${sName} Deals</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${storeDeals.map(d => generateCard(d, data.storeMap)).join('')}</div></div>`, 'seo', data.storeMap, availableStoreIDs, data.deals);
        fs.writeFileSync(path.join(OUTPUT_DIR, slug), html);
    });

    const writePricePage = (limit, file) => {
        const deals = data.deals.filter(d => parseFloat(d.salePrice) <= limit);
        const html = renderLayout(`Under $${limit}`, `Games under $${limit}.`, `<div class="max-w-7xl mx-auto px-6"><h2 class="text-4xl font-black text-white mb-12 uppercase tracking-tighter">Under $${limit}</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${deals.map(d => generateCard(d, data.storeMap)).join('')}</div></div>`, 'seo', data.storeMap, availableStoreIDs, data.deals);
        fs.writeFileSync(path.join(OUTPUT_DIR, file), html);
    };
    writePricePage(5, 'under-5.html');
    writePricePage(10, 'under-10.html');

    // 1. Generate Robots.txt
    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robotsTxt);

    // 2. Generate XML Sitemap
    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    const pages = ['index.html', 'browse.html', 'free.html', 'about.html', 'under-5.html', 'under-10.html'];
    availableStoreIDs.forEach(id => {
        const sName = data.storeMap[id];
        pages.push(`store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`);
    });

    pages.forEach(p => {
        xml += `  <url>\n    <loc>${SITE_DOMAIN}/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);

    console.log('✅ Success! Full Premium Application Built with robots.txt.');
}

build();