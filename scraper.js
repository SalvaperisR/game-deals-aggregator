import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const STORES_API_URL = 'https://www.cheapshark.com/api/1.0/stores';
const OUTPUT_DIR = './public';
const SITE_DOMAIN = 'https://SalvaperisR.github.io/game-deals-aggregator'; 

const AFFILIATE_ID = process.env.AFFILIATE_ID || 'default_tracker';
const AFFILIATE_PARAM = `&affiliate_id=${AFFILIATE_ID}`;

async function fetchData() {
    try {
        console.log('Fetching multi-page data...');
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
        console.error('Error fetching data:', error.message);
        process.exit(1);
    }
}

// --- TEMPLATES ---

function generateSEOFooter(storeMap, availableStoreIDs) {
    let footerHtml = `
    <div class="max-w-7xl mx-auto px-6 py-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
            <h4 class="text-white font-black mb-4 tracking-wider">Top Storefronts</h4>
            <ul class="space-y-2 text-sm text-slate-400">
    `;
    availableStoreIDs.forEach(id => {
        const storeName = storeMap[id];
        const slug = `store-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        footerHtml += `<li><a href="${slug}" class="hover:text-indigo-400 transition-colors">${storeName} Deals</a></li>`;
    });
    footerHtml += `
            </ul>
        </div>
        <div>
            <h4 class="text-white font-black mb-4 tracking-wider">Price Drops</h4>
            <ul class="space-y-2 text-sm text-slate-400">
                <li><a href="under-5.html" class="hover:text-indigo-400 transition-colors">Games Under $5</a></li>
                <li><a href="under-10.html" class="hover:text-indigo-400 transition-colors">Games Under $10</a></li>
                <li><a href="under-20.html" class="hover:text-indigo-400 transition-colors">Games Under $20</a></li>
                <li><a href="free.html" class="hover:text-indigo-400 transition-colors">100% Free Games</a></li>
            </ul>
        </div>
        <div>
            <h4 class="text-white font-black mb-4 tracking-wider">LootDrop</h4>
            <p class="text-slate-500 text-xs mb-4">Your automated engine for the best PC gaming discounts.</p>
            <ul class="space-y-2 text-sm text-slate-400">
                <li><a href="browse.html" class="hover:text-indigo-400 transition-colors">All Deals</a></li>
                <li><a href="about.html" class="hover:text-indigo-400 transition-colors">About & Affiliate Disclosure</a></li>
            </ul>
        </div>
    </div>`;
    return footerHtml;
}

function renderLayout(title, description, content, activePage, storeMap, availableStoreIDs) {
    const year = new Date().getFullYear();
    const isHome = activePage === 'home' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isBrowse = activePage === 'browse' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isFree = activePage === 'free' ? 'text-emerald-400' : 'text-slate-300 hover:text-white';
    
    // Fallback empty array if availableStoreIDs isn't passed (for About page)
    const seoFooter = availableStoreIDs ? generateSEOFooter(storeMap, availableStoreIDs) : '';

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
                </nav>

                <nav class="flex md:hidden gap-4 font-bold text-xs items-center">
                    <a href="index.html" class="${isHome}">Home</a>
                    <a href="browse.html" class="${isBrowse}">Deals</a>
                    <a href="free.html" class="${isFree} flex items-center gap-1">Free <span class="bg-red-500 w-2 h-2 rounded-full animate-pulse"></span></a>
                </nav>
            </div>
        </header>

        <main class="flex-grow pt-24 pb-12">
            ${content}
        </main>

        <footer class="bg-slate-900 mt-auto pt-10">
            ${seoFooter}
            <div class="border-t border-slate-950 py-6 text-center bg-black/20">
                <p class="text-slate-600 text-xs font-medium max-w-xl mx-auto px-6">
                    &copy; ${year} LootDrop. Automated Deal Engine. We may earn an affiliate commission when you buy through links on our site.
                </p>
            </div>
        </footer>
    </body>
    </html>
    `;
}

function generateCard(deal, storeMap, isFree = false) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const savings = Math.round(deal.savings);
    const storeName = storeMap[deal.storeID] || 'Store';
    const rating = parseFloat(deal.dealRating);
    
    let badgeBg = isFree ? 'bg-emerald-500' : 'bg-red-500';
    let badgeText = isFree ? '100% OFF' : `-${savings}%`;
    let priceColor = isFree ? 'text-emerald-400 animate-pulse' : 'text-emerald-400';
    let cardBorder = isFree ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700/50 hover:border-indigo-500/50';
    let buttonStyle = isFree ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500';
    let tierBadge = '';

    if (!isFree) {
        if (rating >= 9.0) {
            cardBorder = 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.15)] hover:shadow-[0_0_25px_rgba(251,191,36,0.3)] hover:border-amber-400';
            tierBadge = `<span class="bg-amber-500 text-slate-900 text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg tracking-wide border border-amber-300">S-Tier Deal</span>`;
        } else if (rating >= 8.0) {
            cardBorder = 'border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.25)] hover:border-purple-500';
            tierBadge = `<span class="bg-purple-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg tracking-wide border border-purple-400">A-Tier</span>`;
        }
    }

    return `
    <div class="deal-card relative bg-slate-800/50 rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col ${cardBorder}" data-title="${deal.title.toLowerCase()}" data-price="${deal.salePrice}" data-store="${storeName.toLowerCase()}">
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <div class="flex flex-col gap-1 items-start">
                <span class="bg-slate-900/80 text-slate-300 text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">${storeName}</span>
                ${tierBadge}
            </div>
            <div class="${badgeBg} text-white text-xs font-black px-2 py-1 rounded shadow-lg tracking-wide border border-white/20">${badgeText}</div>
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
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="${buttonStyle} text-white font-bold py-1.5 px-3 rounded-lg text-sm transition-colors shadow-md">Claim</a>
            </div>
        </div>
    </div>
    `;
}

// Generates generic SEO grid pages (for Home, Free, Store pages)
function generateCollectionPage(title, description, deals, storeMap, availableStoreIDs, activePage) {
    let content = `
    <div class="max-w-7xl mx-auto px-6">
        <div class="mb-10 text-center">
            <h2 class="text-4xl md:text-5xl font-black text-white mb-4">${title}</h2>
            <p class="text-lg text-slate-400 max-w-2xl mx-auto">${description}</p>
            ${activePage === 'home' ? `
            <div class="flex flex-col sm:flex-row gap-4 justify-center mt-6">
                <a href="browse.html" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/30">Explore All Deals</a>
            </div>` : ''}
        </div>
        <div class="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
            <span class="text-sm font-medium text-slate-400 bg-slate-800 px-3 py-1 rounded-full">${deals.length} active deals</span>
        </div>
    `;

    if (deals.length === 0) {
        content += `<div class="text-center py-20"><h3 class="text-xl text-slate-400">No deals found for this criteria today.</h3></div>`;
    } else {
        content += `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">`;
        deals.forEach(deal => content += generateCard(deal, storeMap, activePage === 'free'));
        content += `</div>`;
    }

    content += `</div>`;
    return renderLayout(title, description, content, activePage, storeMap, availableStoreIDs);
}

// BROWSE PAGE GENERATOR
function generateBrowsePage(deals, storeMap, availableStoreIDs) {
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

    return renderLayout('Browse All Deals', 'Filter and search through the top 100 PC game deals right now.', content, 'browse', storeMap, availableStoreIDs);
}

// ABOUT PAGE GENERATOR
function generateAboutPage(storeMap, availableStoreIDs) {
    const content = `
    <div class="max-w-3xl mx-auto px-6 py-12 text-slate-300">
        <h2 class="text-4xl font-black text-white mb-6 border-b border-slate-800 pb-4">About LootDrop</h2>
        <div class="prose prose-invert prose-indigo max-w-none space-y-6">
            <p class="text-lg">Welcome to LootDrop, your automated engine for discovering the best PC game deals.</p>
            <h3 class="text-2xl font-bold text-white mt-8">How it Works</h3>
            <p>Our servers scan multiple digital storefronts every single day. We aggregate the highest discounts and present them in a lightning-fast, ad-free environment.</p>
            <h3 class="text-2xl font-bold text-white mt-8">Affiliate Disclosure</h3>
            <p class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 italic">
                LootDrop is a participant in various affiliate marketing programs. This means we may earn a commission on purchases made through our links to retailer sites. <strong>This comes at absolutely no extra cost to you</strong>.
            </p>
        </div>
    </div>
    `;
    return renderLayout('About Us', 'Learn how LootDrop works and read our affiliate disclosure.', content, 'about', storeMap, availableStoreIDs);
}

// XML Sitemap Generator
function generateSitemap(urls) {
    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    urls.forEach(url => {
        xml += `  <url>\n    <loc>${SITE_DOMAIN}/${url.path}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${url.priority}</priority>\n  </url>\n`;
    });
    xml += `</urlset>`;
    return xml;
}

// Main Build Pipeline
async function build() {
    const data = await fetchData();
    const availableStoreIDs = [...new Set(data.deals.map(d => d.storeID))];
    
    console.log('Generating Full Architecture (SEO + Browse/About)...');
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    
    const sitemapUrls = [];
    const writePage = (filename, html, priority) => {
        fs.writeFileSync(path.join(OUTPUT_DIR, filename), html);
        sitemapUrls.push({ path: filename, priority });
    };

    // 1. Core Pages (Including the missing Browse & About)
    writePage('index.html', generateCollectionPage('Top PC Game Deals', 'Your automated radar for the absolute best PC gaming deals across the entire internet.', data.deals.slice(0, 16), data.storeMap, availableStoreIDs, 'home'), '1.0');
    writePage('free.html', generateCollectionPage('100% Free Game Drops', 'Games currently completely free to claim and keep forever.', data.freeDeals, data.storeMap, availableStoreIDs, 'free'), '0.9');
    
    // --> RESTORED BROWSE & ABOUT PAGES
    writePage('browse.html', generateBrowsePage(data.deals, data.storeMap, availableStoreIDs), '0.9');
    writePage('about.html', generateAboutPage(data.storeMap, availableStoreIDs), '0.5');

    // 2. Programmatic SEO: Price Bracket Pages
    const under5 = data.deals.filter(d => parseFloat(d.salePrice) < 5.00);
    writePage('under-5.html', generateCollectionPage('Best PC Games Under $5', 'Massive discounts on top-rated games, all under 5 dollars.', under5, data.storeMap, availableStoreIDs, 'seo'), '0.8');

    const under10 = data.deals.filter(d => parseFloat(d.salePrice) < 10.00);
    writePage('under-10.html', generateCollectionPage('Best PC Games Under $10', 'Incredible gaming experiences that won\'t break the bank. All under $10.', under10, data.storeMap, availableStoreIDs, 'seo'), '0.8');

    const under20 = data.deals.filter(d => parseFloat(d.salePrice) < 20.00);
    writePage('under-20.html', generateCollectionPage('Best PC Games Under $20', 'Premium games and massive AAA discounts under 20 dollars.', under20, data.storeMap, availableStoreIDs, 'seo'), '0.8');

    // 3. Programmatic SEO: Storefront Pages
    availableStoreIDs.forEach(id => {
        const storeName = data.storeMap[id];
        const storeDeals = data.deals.filter(d => d.storeID === id);
        const slug = `store-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        writePage(slug, generateCollectionPage(`${storeName} Deals & Sales`, `The live list of the absolute best discounts currently active on ${storeName}.`, storeDeals, data.storeMap, availableStoreIDs, 'seo'), '0.7');
    });

    // 4. Sitemap
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), generateSitemap(sitemapUrls));
    console.log(`Success! Built ${sitemapUrls.length} pages total.`);
}

build();