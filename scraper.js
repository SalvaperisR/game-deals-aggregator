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
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,7,8,11,15,25&upperPrice=30&sortBy=Deal Rating&pageNumber=0'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,7,8,11,15,25&upperPrice=30&sortBy=Deal Rating&pageNumber=1'),
            axios.get('https://www.cheapshark.com/api/1.0/deals?storeID=1,2,3,4,7,8,11,15,25&upperPrice=0')
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

// VISUAL V3 UPGRADE: Corner Bracket Component
function generateCorners(color = 'border-indigo-500/30') {
    return `
    <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${color} z-20 pointer-events-none group-hover:border-white transition-colors duration-300"></div>
    <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${color} z-20 pointer-events-none group-hover:border-white transition-colors duration-300"></div>
    <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${color} z-20 pointer-events-none group-hover:border-white transition-colors duration-300"></div>
    <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${color} z-20 pointer-events-none group-hover:border-white transition-colors duration-300"></div>
    `;
}

function generateCard(deal, storeMap, isFree = false) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const storeName = storeMap[deal.storeID] || 'Store';
    const savings = Math.round(deal.savings);

    // VISUAL V3 UPGRADE: Store Brand Colors
    let storeTextColor = 'text-slate-400';
    if (storeName === 'Steam') storeTextColor = 'text-sky-400';
    else if (storeName === 'Epic Games Store') storeTextColor = 'text-emerald-400 font-bold';
    else if (storeName === 'GOG') storeTextColor = 'text-white font-medium';
    else if (storeName === 'Humble Store') storeTextColor = 'text-red-400';
    else if (storeName === 'Fanatical') storeTextColor = 'text-orange-400';

    // RPG Rarity Logic
    let cardStyle = 'border-blue-500/30 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] shadow-lg shadow-blue-500/5';
    let badge = `<div class="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg border border-blue-400/50">-${savings}%</div>`;
    let rarityName = `<span class="text-blue-400 text-[8px] font-black uppercase tracking-widest">Rare Drop</span>`;

    if (isFree) {
        cardStyle = 'border-emerald-500/60 hover:border-emerald-400 hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] shadow-lg shadow-emerald-500/20';
        badge = `<div class="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg animate-pulse text-center border border-emerald-300">FREE</div>`;
        rarityName = `<span class="text-emerald-400 text-[8px] font-black uppercase tracking-widest animate-pulse">God Tier</span>`;
    } else if (savings >= 85) {
        cardStyle = 'border-amber-400/60 hover:border-amber-300 hover:shadow-[0_0_40px_rgba(251,191,36,0.3)] shadow-lg shadow-amber-500/10';
        badge = `<div class="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-1 rounded shadow-lg border border-amber-300">-${savings}%</div>`;
        rarityName = `<span class="text-amber-400 text-[8px] font-black uppercase tracking-widest">Mythic Drop</span>`;
    } else if (savings >= 70) {
        cardStyle = 'border-fuchsia-500/50 hover:border-fuchsia-400 hover:shadow-[0_0_30px_rgba(217,70,239,0.3)] shadow-lg shadow-fuchsia-500/10';
        badge = `<div class="bg-fuchsia-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg border border-fuchsia-400">-${savings}%</div>`;
        rarityName = `<span class="text-fuchsia-400 text-[8px] font-black uppercase tracking-widest">Epic Drop</span>`;
    }

    return `
    <div class="deal-card group relative bg-slate-800/20 rounded-xl overflow-hidden border transition-all duration-500 flex flex-col ${cardStyle} hover:-translate-y-2"
         data-title="${deal.title.toLowerCase()}" data-price="${deal.salePrice}" data-store="${storeName.toLowerCase()}">
        
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <div class="flex flex-col gap-1 items-start">
                <span class="bg-slate-900/90 ${storeTextColor} text-[9px] font-black uppercase px-2 py-1 rounded border border-white/5 shadow-lg">${storeName}</span>
                <div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/5 shadow-lg">${rarityName}</div>
            </div>
            ${badge}
        </div>

        <div class="h-44 overflow-hidden bg-slate-900 relative">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-80"></div>
            <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" loading="lazy">
        </div>

        <div class="p-5 flex-1 flex flex-col justify-between relative z-10 bg-slate-950">
            <h3 class="text-sm font-bold text-slate-200 mb-4 line-clamp-2 leading-snug group-hover:text-white transition-colors" title="${deal.title}">${deal.title}</h3>
            
            <div class="mt-auto pt-3 border-t border-white/5 flex justify-between items-end">
                <div class="flex flex-col">
                    <span class="text-[11px] text-slate-500 line-through leading-none mb-1 font-semibold">$${deal.normalPrice}</span>
                    <span class="text-xl font-black leading-none ${isFree ? 'text-emerald-400' : 'text-slate-200 group-hover:text-white'} transition-colors">$${deal.salePrice}</span>
                </div>
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-slate-700 hover:bg-white text-white hover:text-slate-900 font-black py-2 px-5 rounded-lg text-xs transition-all duration-300 shadow-lg uppercase tracking-wide">Loot</a>
            </div>
        </div>
    </div>`;
}

// --- MASTER LAYOUT ---

// --- MASTER LAYOUT ---

function renderLayout(title, description, content, activePage, storeMap, availableStoreIDs, deals) {
    const year = new Date().getFullYear();
    const isHome = activePage === 'home' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isBrowse = activePage === 'browse' ? 'text-indigo-400' : 'text-slate-300 hover:text-white';
    const isFree = activePage === 'free' ? 'text-emerald-400' : 'text-slate-300 hover:text-white';

    const tickerItems = (deals || []).slice(0, 15).map(d => `<span class="mx-10 font-bold">💎 ${d.title}: <span class="text-emerald-400">$${d.salePrice}</span></span>`).join('');

    const newsletterSection = `
    <div class="max-w-7xl mx-auto px-6 py-16 relative">
        <div class="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36z8gAFWNhYfEfi4+PjwFmAlSNEwCK8RMN/Rby+wAAAABJRU5ErkJggg==')] opacity-10"></div>
        <div class="bg-gradient-to-r from-indigo-950 to-slate-950 border border-indigo-500/20 rounded-2xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden group">
            ${generateCorners('border-indigo-500/40')}
            <div class="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
            <div class="relative z-10 max-w-2xl mx-auto">
                <span class="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6 inline-block shadow-lg shadow-indigo-500/40 border border-indigo-400/50">Frequency: Weekly</span>
                <h3 class="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter leading-none">Join The<br>Transmission Army</h3>
                <p class="text-slate-400 mb-10 text-lg leading-relaxed max-w-lg mx-auto">Algorithms hide the best drops. We email them directly to your data-pad. Get the top 5 price drops sent to your inbox every Friday.</p>
               
<form action="https://github.us19.list-manage.com/subscribe/post?u=37571aa4091c81007e259be05&id=327e6cb1ac&f_id=0064a7e4f0" method="POST" id="newsletter-form" class="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" target="_blank">
                    <input type="email" name="EMAIL" placeholder="ENTER VALID EMAIL ADDRESS..." class="flex-1 bg-black/40 border-2 border-slate-700 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600 font-medium shadow-inner tracking-wide text-sm uppercase" required>
                    <button type="submit" class="bg-indigo-600 hover:bg-white text-white hover:text-slate-900 font-black py-4 px-8 rounded-lg transition-all shadow-lg shadow-indigo-500/30 uppercase tracking-widest text-xs">Authorize Subscribe</button>
                </form>
                <p class="text-emerald-400 text-[10px] mt-5 uppercase tracking-widest font-black animate-pulse">🔒 Zero spam. Unsubscribe anytime. 🔒</p>
            </div>
        </div>
    </div>`;

    let seoFooter = '';
    if (availableStoreIDs && storeMap) {
        seoFooter = `
        <div class="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            <div>
                <h4 class="text-white font-black mb-5 uppercase tracking-widest text-xs flex items-center gap-2 justify-center md:justify-start"><span class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Network Nodes</h4>
                <ul class="space-y-2 text-sm text-slate-400 font-medium">
                    ${availableStoreIDs.slice(0, 8).map(id => {
            const sName = storeMap[id];
            const slug = `store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
            return `<li><a href="${slug}" class="hover:text-white transition-colors">${sName} Discounts</a></li>`;
        }).join('')}
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black mb-5 uppercase tracking-widest text-xs flex items-center gap-2 justify-center md:justify-start"><span class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Value Filters</h4>
                <ul class="space-y-2 text-sm text-slate-400 font-medium">
                    <li><a href="under-5.html" class="hover:text-white transition-colors">Games < $5 USD</a></li>
                    <li><a href="under-10.html" class="hover:text-white transition-colors">Games < $10 USD</a></li>
                    <li><a href="free.html" class="hover:text-emerald-400 transition-colors font-black uppercase tracking-widest text-[11px]">God Tier (100% Free)</a></li>
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black mb-5 uppercase tracking-widest text-xs flex items-center gap-2 justify-center md:justify-start"><span class="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span> Engine Status</h4>
                <p class="text-slate-400 text-xs mb-4 leading-relaxed">Automated scanner active. All systems nominal. Scraping target nodes every 24 hours.</p>
                <ul class="space-y-2 text-sm text-slate-400 font-medium">
                    <li><a href="browse.html" class="hover:text-white transition-colors">View All Transmissions</a></li>
                    <li><a href="about.html" class="hover:text-white transition-colors">System Disclosure</a></li>
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
        
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-4FJBRK0ENM"></script>
        <script>
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          
          // Default consent to 'denied' to comply with EU laws
          gtag('consent', 'default', {
            'analytics_storage': 'denied',
            'ad_storage': 'denied'
          });

          gtag('js', new Date());
          gtag('config', 'G-4FJBRK0ENM');
        </script>

        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
            body { 
                font-family: 'Inter', sans-serif; 
                background-color: #030712; 
                background-image: 
                    linear-gradient(rgba(100, 100, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(100, 100, 255, 0.03) 1px, transparent 1px);
                background-size: 50px 50px;
                background-attachment: fixed;
            }
                .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            .glass { background: rgba(3, 7, 18, 0.8); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
            .ticker-wrap { animation: scroll 60s linear infinite; width: max-content; }
            @keyframes scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .8; transform: scale(1.02); } }
            .animate-pulse-slow { animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes loot-shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(-5deg) scale(1.05); } 50% { transform: rotate(5deg) scale(1.05); } 75% { transform: rotate(-5deg) scale(1.05); } 100% { transform: rotate(0deg); } }
            .loot-shaking { animation: loot-shake 0.3s ease-in-out infinite; }
            .mesh-gradient { background: radial-gradient(at 0% 0%, hsla(250, 40%, 10%, 1) 0, transparent 60%), radial-gradient(at 50% 0%, hsla(220, 40%, 15%, 1) 0, transparent 60%), radial-gradient(at 100% 0%, hsla(330, 40%, 15%, 1) 0, transparent 60%); }
            .hero-mesh { background: radial-gradient(at 50% 0%, hsla(250, 60%, 20%, 0.4) 0, transparent 70%); }
            
            body::after {
                content: "";
                position: fixed; inset: 0;
                background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
                background-size: 100% 4px;
                z-index: 100; pointer-events: none;
                opacity: 0.15;
            }
        </style>
    </head>
    <body class="text-slate-300 antialiased flex flex-col min-h-screen mesh-gradient relative">
        
        <div class="bg-indigo-600/10 border-b border-white/5 py-2 overflow-hidden whitespace-nowrap text-[9px] uppercase font-bold tracking-[0.3em] text-indigo-300 z-[60] relative">
            <div class="flex ticker-wrap">
                ${tickerItems} ${tickerItems}
            </div>
        </div>

        <header class="glass sticky top-0 w-full z-50 shadow-2xl transition-all duration-300">
            <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <a href="index.html" class="flex items-center gap-3 group">
                    <div class="bg-indigo-600 p-1.5 rounded w-8 h-8 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                        <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    </div>
                    <h1 class="text-xl font-black text-white tracking-tighter uppercase">LootDrop</h1>
                </a>
               <nav class="flex gap-6 overflow-x-auto no-scrollbar font-bold text-[10px] uppercase tracking-widest ml-4 pb-1 md:pb-0">
    <a href="index.html" class="${isHome} whitespace-nowrap transition-colors">Home_Base</a>
    <a href="browse.html" class="${isBrowse} whitespace-nowrap transition-colors">Browse_All</a>
    <a href="free.html" class="${isFree} whitespace-nowrap transition-colors">Free_Transmission</a>
</nav>
            </div>
        </header>

        <main class="flex-grow pt-12 pb-10">
            ${content}
            ${activePage !== 'about' && activePage !== 'legal' ? newsletterSection : ''}
        </main>

        <footer class="mt-20 border-t border-indigo-500/30 pt-8 pb-12 bg-slate-950/80 relative z-10">
            ${seoFooter}
            <div class="max-w-5xl mx-auto px-6 mt-12 pt-8 border-t border-white/5 text-center">
                <p class="text-[10px] mb-6 text-slate-500 italic max-w-3xl mx-auto">
                    *LootDrop participates in affiliate programs. If you purchase through our links, we may receive a small commission at no additional cost to you. This keeps the simulation running.*
                </p>
                <div class="flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-slate-400">
                    <a href="legal.html#aviso" class="hover:text-emerald-400 transition-colors">Legal Notice</a>
                    <span class="text-slate-700">|</span>
                    <a href="legal.html#privacidad" class="hover:text-emerald-400 transition-colors">Privacy Policy</a>
                    <span class="text-slate-700">|</span>
                    <a href="legal.html#cookies" class="hover:text-emerald-400 transition-colors">Cookies Policy</a>
                </div>
                <p class="text-xs font-bold text-slate-600 uppercase tracking-widest">© ${year} LootDrop. Automated Engine.</p>
            </div>
        </footer>

        <div id="cookie-banner" class="fixed bottom-0 left-0 w-full bg-slate-900 border-t border-emerald-500/50 p-4 z-50 transform translate-y-0 transition-transform duration-300" style="display: none;">
            <div class="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="text-sm text-slate-300 text-center sm:text-left">
                    <span class="text-emerald-400 font-bold">SYSTEM ALERT:</span> We use tracking and affiliate cookies to improve your experience and keep the website free. <a href="legal.html#cookies" class="text-indigo-400 underline hover:text-indigo-300">More info</a>.
                </div>
                <div class="flex gap-3 justify-center sm:justify-start">
                    <button onclick="handleConsent(false)" class="px-4 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded font-bold uppercase tracking-widest">
                    Reject
                    </button>
                    <button onclick="handleConsent(true)" class="px-4 py-2 text-sm text-slate-900 bg-emerald-500 hover:bg-emerald-400 font-black rounded uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                    Accept All
                    </button>
                </div>
            </div>
        </div>

        <script>
            // Check previous consent
            const consentGiven = localStorage.getItem('lootdrop_cookie_consent');
            
            if (consentGiven === 'granted') {
                // If they already accepted, turn radar on
                gtag('consent', 'update', {
                    'analytics_storage': 'granted',
                    'ad_storage': 'granted'
                });
            } else if (!consentGiven) {
                // If no choice made yet, show banner
                document.getElementById('cookie-banner').style.display = 'block';
            }

            function handleConsent(accepted) {
                document.getElementById('cookie-banner').style.display = 'none';
                if (accepted) {
                    localStorage.setItem('lootdrop_cookie_consent', 'granted');
                    gtag('consent', 'update', {
                        'analytics_storage': 'granted',
                        'ad_storage': 'granted'
                    });
                } else {
                    localStorage.setItem('lootdrop_cookie_consent', 'denied');
                }
            }
        </script>

    </body>
    </html>
    `;
}

// --- PAGE GENERATORS ---

function generateHomePage(deals, storeMap, freeDeals, availableStoreIDs) {
    const heroDeal = deals[0];
    const heroStore = storeMap[heroDeal.storeID] || 'Store';
    const heroUrl = `https://www.cheapshark.com/redirect?dealID=${heroDeal.dealID}${AFFILIATE_PARAM}`;

    const topDealsJSON = JSON.stringify(deals.slice(1, 21).map(d => ({
        title: d.title,
        price: d.salePrice,
        normalPrice: d.normalPrice,
        savings: Math.round(d.savings),
        thumb: d.thumb,
        url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}${AFFILIATE_PARAM}`
    })));

    let content = `
    <div class="max-w-7xl mx-auto px-6 relative">
        <div class="absolute inset-0 -z-10 bg-indigo-500/10 blur-[150px] rounded-full w-1/2 mx-auto"></div>
        
        <div class="text-center py-20 relative hero-mesh rounded-full">
            <span class="bg-black/60 border border-white/10 text-slate-400 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest mb-6 inline-block shadow-lg">SCANNER STATUS: ONLINE</span>
            <h2 class="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none uppercase">THE BEST <span class="text-transparent bg-clip-text bg-gradient-to-b from-indigo-300 to-indigo-600 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">Loot</span><br>For Gamers.</h2>
            <p class="text-slate-400 max-w-xl mx-auto mb-10 text-lg font-medium leading-relaxed">System-wide scan completed. Displaying elite price drops across all known target storefronts. Authorized claim protocols active.</p>
        </div>

        <h3 class="text-xs font-black text-amber-400 mb-6 uppercase tracking-[0.3em] flex items-center gap-3justify-center"><span class="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,1)]"></span> Spotlight Transmission</h3>
        <div class="animate-pulse-slow bg-slate-950/60 border-2 border-amber-500 rounded-3xl overflow-hidden flex flex-col md:flex-row items-center gap-8 mb-16 shadow-[0_0_60px_rgba(245,158,11,0.15)] group relative">
            ${generateCorners('border-amber-500/40')}
            <div class="w-full md:w-1/2 h-64 md:h-80 overflow-hidden relative">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-slate-950 md:block hidden z-10"></div>
                <img src="${heroDeal.thumb}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000">
                <div class="absolute top-5 left-5 z-20 bg-amber-500 text-slate-900 font-black px-4 py-1 rounded text-xs uppercase tracking-widest shadow-xl border border-amber-300">Mythic Drop</div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 md:pl-0 relative z-20">
                <span class="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 block">${heroStore} Access Node</span>
                <h3 class="text-3xl md:text-5xl font-black text-white mb-6 leading-tight uppercase tracking-tighter">${heroDeal.title}</h3>
                <div class="flex items-center gap-6 mb-10 pb-6 border-b border-white/5">
                    <div class="bg-red-600 text-white font-black text-2xl px-5 py-3 rounded border-2 border-red-400 shadow-xl shadow-red-500/20">-${Math.round(heroDeal.savings)}%</div>
                    <div>
                        <div class="text-slate-500 line-through text-base font-bold">$${heroDeal.normalPrice} USD</div>
                        <div class="text-2xl md:text-3xl font-black text-emerald-400 leading-none truncate max-w-full"> $${deal.salePrice}
</div>                </div>
                </div>
                <a href="${heroUrl}" target="_blank" class="inline-block bg-amber-500 hover:bg-white text-slate-900 font-black py-4 px-10 rounded hover:scale-105 transition-all shadow-[0_0_30px_rgba(245,158,11,0.3)] uppercase tracking-widest text-sm">CLAIM SPOTLIGHT LOOT</a>
            </div>
        </div>

        <div class="bg-gradient-to-b from-slate-900 to-black border border-emerald-500/20 rounded-3xl p-8 mb-20 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col items-center text-center group">
            ${generateCorners('border-emerald-500/40')}
            <div class="absolute inset-0 bg-emerald-500/5 group-hover:opacity-0 transition-opacity duration-500"></div>
            <div class="relative z-10 w-full">
                <span class="bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg">Interactive Simulation</span>
                <h3 class="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Initialize Random Drop?</h3>
                <p class="text-slate-400 mb-10 text-base leading-relaxed max-w-md mx-auto">Don't know what to play, data-citizen? Initializing simulation will select one verified Mythic or Epic discount transmission for immediate decryption.</p>
                
                <div id="lootbox-container" class="cursor-pointer bg-black/60 border-2 border-emerald-500 rounded-xl w-full max-w-lg mx-auto h-56 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:border-emerald-400 transition-all duration-300" onclick="openLootbox()">
                    <div id="lootbox-idle" class="flex flex-col items-center">
                        <div class="text-7xl mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">🎁</div>
                        <div class="text-emerald-400 font-black uppercase tracking-[0.2em] text-sm bg-emerald-950 px-6 py-2 rounded-full border border-emerald-600">Authorize Mystery Decryption</div>
                    </div>
                    <div id="lootbox-reveal" class="hidden w-full h-full p-6 flex flex-col items-center justify-between">
                        <div class="flex items-center gap-5 w-full">
                            <img id="lb-img" src="" class="h-24 w-auto rounded border-2 border-slate-700 shadow-xl">
                            <div class="text-left flex-1">
                                <h4 id="lb-title" class="text-white font-black text-lg line-clamp-2 leading-tight mb-3 uppercase tracking-tighter"></h4>
                                <div class="flex items-center gap-3">
                                    <span id="lb-savings" class="bg-red-600 text-white font-black text-xs px-2 py-1.5 rounded"></span>
                                    <span id="lb-price" class="text-emerald-400 font-black text-3xl drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                                </div>
                            </div>
                        </div>
                        <a id="lb-url" href="#" target="_blank" class="w-full bg-emerald-600 hover:bg-white text-slate-900 font-black py-3 rounded-lg mt-4 uppercase text-xs tracking-widest shadow-xl transition-colors">Confirm Decryption & Claim</a>
                    </div>
                </div>
            </div>
        </div>
        
        <script>
            const topDeals = ${topDealsJSON};
            function openLootbox() {
                const container = document.getElementById('lootbox-container');
                const idle = document.getElementById('lootbox-idle');
                const reveal = document.getElementById('lootbox-reveal');
                if(!idle.classList.contains('hidden') && !container.classList.contains('loot-shaking')) {
                    container.classList.add('loot-shaking');
                    container.classList.remove('cursor-pointer');
                    setTimeout(() => {
                        container.classList.remove('loot-shaking');
                        idle.classList.add('hidden');
                        reveal.classList.remove('hidden');
                        reveal.classList.add('flex');
                        const winner = topDeals[Math.floor(Math.random() * topDeals.length)];
                        document.getElementById('lb-img').src = winner.thumb;
                        document.getElementById('lb-title').innerText = winner.title;
                        document.getElementById('lb-savings').innerText = '-' + winner.savings + '%';
                        document.getElementById('lb-price').innerText = '$' + winner.price;
                        document.getElementById('lb-url').href = winner.url;
                        container.classList.add('border-amber-400', 'shadow-[0_0_50px_rgba(251,191,36,0.3)]');
                        container.classList.remove('border-emerald-500');
                        document.getElementById('lb-url').classList.replace('bg-emerald-600', 'bg-amber-500');
                        document.getElementById('lb-savings').classList.add('border-2', 'border-red-300');
                    }, 1500);
                }
            }
        </script>

        <div class="bg-gradient-to-br from-indigo-950 to-fuchsia-950 border-2 border-fuchsia-500 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 mb-20 shadow-[0_0_50px_rgba(217,70,239,0.2)] relative overflow-hidden group">
            ${generateCorners('border-fuchsia-500/40')}
            <div class="absolute inset-0 bg-fuchsia-500/5 group-hover:opacity-0 transition-opacity duration-1000"></div>
            <div class="flex-1 relative z-10 text-center md:text-left">
                <span class="bg-fuchsia-600 text-white text-[10px] font-black px-3 py-1 rounded uppercase tracking-widest mb-4 inline-block shadow-lg border border-fuchsia-400">Authorization: Active</span>
                <h3 class="text-4xl md:text-5xl font-black text-white mb-5 leading-none uppercase tracking-tighter">Initialize<br>Companion Protocol</h3>
                <p class="text-fuchsia-100 mb-10 leading-relaxed text-lg max-w-xl">Inject the LootDrop Companion into your interface. This background-service scans visual target data while you browse Steam and drops a high-priority decryption alert if alternative corporate nodes offer superior value.</p>
                <a href="https://github.com/SalvaperisR/game-deals-aggregator/archive/refs/heads/main.zip" class="inline-block bg-fuchsia-600 hover:bg-white text-white hover:text-slate-900 font-black py-4 px-10 rounded-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(217,70,239,0.4)] uppercase tracking-widest text-sm">INSTALL COMPANION PROTOCOL</a>
            </div>
            <div class="w-full md:w-1/3 relative z-10 hidden md:block">
                <div class="bg-black/60 p-6 rounded-xl border border-white/10 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform duration-500 backdrop-blur-sm relative">
                    ${generateCorners('border-fuchsia-500/30')}
                    <div class="h-4 bg-slate-800 rounded w-1/2 mb-4"></div>
                    <div class="bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white text-[11px] font-black p-4 rounded-lg shadow-lg text-center animate-pulse border border-fuchsia-400">
                        ⚠️ SYSTEM ALERT: HIGH VALUE TARGET<br>Node GOG offers decryption for $9.99
                    </div>
                    <div class="h-20 bg-slate-800 rounded mt-4"></div>
                </div>
            </div>
        </div>

        <div class="flex items-center justify-between mb-8 border-l-4 border-indigo-500 pl-6">
            <h3 class="text-2xl font-black text-white uppercase tracking-tighter">Live Access Transmissions</h3>
            <a href="browse.html" class="text-indigo-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">View All Transmissions →</a>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            ${deals.slice(1, 13).map(d => generateCard(d, storeMap)).join('')}
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
                <div class="bg-slate-950/80 rounded-xl p-6 border border-slate-700/50 sticky top-36 shadow-xl backdrop-blur-sm relative">
                    ${generateCorners()}
                    <h3 class="text-lg font-black text-white mb-5 uppercase tracking-wider flex items-center gap-2"><svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg> Transmission Filters</h3>
                    <div class="mb-6">
                        <input type="text" id="searchInput" placeholder="TARGET DESIGNATION..." class="w-full bg-black/40 border-2 border-slate-700 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none shadow-inner uppercase">
                    </div>
                    <div class="mb-6">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">Credits Limit (USD)</label>
                        <input type="range" id="priceSlider" min="0" max="30" step="1" value="30" class="w-full accent-emerald-500">
                        <div class="flex justify-between text-sm font-black text-emerald-400 mt-2">
                            <span>$0</span><span id="priceValue">Under $30 USD</span>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 block">Target Nodes</label>
                        <div class="space-y-3" id="storeFilters">
                            ${availableStores.map(store => `
                            <label class="flex items-center gap-3 text-sm font-medium text-slate-300 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" value="${store.toLowerCase()}" class="store-checkbox rounded border-slate-600 text-indigo-500 focus:ring-indigo-500 bg-slate-900 w-4 h-4" checked>
                                ${store}
                            </label>`).join('')}
                        </div>
                    </div>
                </div>
            </aside>

            <div class="flex-grow">
                <div class="flex flex-col sm:flex-row gap-4 sm:items-center justify-between border-b border-white/5 pb-4 mb-8">
                    <h2 class="text-3xl font-black text-white uppercase tracking-tighter">Scanner Results</h2>
                    <span class="text-sm font-black text-indigo-300 bg-indigo-900/40 px-4 py-2 rounded border border-indigo-500/30 uppercase tracking-wider" id="resultsCount">${deals.length} Transmissions Decrypted</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" id="dealsGrid">
                    ${deals.map(deal => generateCard(deal, storeMap)).join('')}
                </div>
                <div id="noResults" class="hidden text-center py-24 bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-700">
                    <div class="text-6xl mb-5">🚫</div>
                    <h3 class="text-xl font-bold text-slate-400 uppercase tracking-widest">No matching transmissions found.</h3>
                    <button onclick="resetFilters()" class="mt-5 bg-indigo-600 hover:bg-white text-white hover:text-slate-900 font-black py-3 px-8 rounded-lg uppercase tracking-widest text-xs transition-colors">Reset Filter Parameters</button>
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
            resultsCount.innerText = visibleCount + (visibleCount === 1 ? ' transmission decrypted' : ' transmissions decrypted');
            noResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        searchInput.addEventListener('input', applyFilters);
        priceSlider.addEventListener('input', (e) => { priceValue.innerText = 'Under $' + e.target.value + ' USD'; applyFilters(); });
        storeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

        window.resetFilters = function() {
            searchInput.value = ''; priceSlider.value = 30; priceValue.innerText = 'Under $30 USD';
            storeCheckboxes.forEach(cb => cb.checked = true); applyFilters();
        };
    </script>
    `;
    return renderLayout('Browse All Deals', 'Filter and search through the top 100 PC game deals right now.', content, 'browse', storeMap, availableStoreIDs, deals);
}

// --- MAIN BUILD PIPELINE ---

async function build() {
    const data = await fetchData();
    const availableStoreIDs = [...new Set(data.deals.map(d => d.storeID))];

    console.log('🏗️ Building Static Matrix V3.0 (Elite Visuals Enabled)...');
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), generateHomePage(data.deals, data.storeMap, data.freeDeals, availableStoreIDs));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'browse.html'), generateBrowsePage(data.deals, data.storeMap, availableStoreIDs));

    const freeContent = `<div class="max-w-7xl mx-auto px-6"><h2 class="text-5xl font-black text-emerald-400 mb-12 uppercase tracking-tighter drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">God Tier Transmissions (100% Free)</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${data.freeDeals.length > 0 ? data.freeDeals.map(d => generateCard(d, data.storeMap, true)).join('') : '<p class="text-slate-500 font-bold uppercase tracking-widest text-sm py-10">No God Tier drops detected in current cycle.</p>'}</div></div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'free.html'), renderLayout('Free Drops', '100% Free PC games.', freeContent, 'free', data.storeMap, availableStoreIDs, data.deals));

    const aboutContent = `
        <div class="max-w-3xl mx-auto px-6 py-16 text-slate-300 relative bg-slate-950/50 rounded-2xl border border-white/5 backdrop-blur-sm">
            ${generateCorners()}
            <h2 class="text-5xl font-black text-white mb-8 border-b border-slate-800 pb-5 uppercase tracking-tighter">System Disclosure: LootDrop</h2>
            <div class="space-y-6 leading-relaxed text-slate-400">
                <p>LootDrop is an automated core scrap engine scanning authorized digital target nodes every 24 standard hours. Its primary directive is to identify elite price-to-value discrepancies.</p>
                <p>By aggregating verified data transmissions—including Metacritic synchronization and Steam user-base consensus data—the engine enables authorized data-citizens to claim loot with zero probability of purchasing sub-optimal software.</p>
                <p class="p-5 bg-black/40 rounded-xl border border-indigo-500/20 italic font-medium text-indigo-300 shadow-inner">Protocol 7 Disclosure: The engine operates via dynamic monetization protocols. Authorized claims may generate data-commissions at zero additional cost to the data-citizen. This protocol ensures continuous ad-free scanner operation.</p>
            </div>
        </div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'about.html'), renderLayout('About Us', 'LootDrop About Page.', aboutContent, 'about', data.storeMap, availableStoreIDs, data.deals));

    availableStoreIDs.forEach(id => {
        const sName = data.storeMap[id];
        const storeDeals = data.deals.filter(d => d.storeID === id);
        const slug = `store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
        const html = renderLayout(`${sName} Deals`, `Current sales at ${sName}.`, `<div class="max-w-7xl mx-auto px-6"><h2 class="text-5xl font-black text-white mb-12 uppercase tracking-tighter">Transmission Node: ${sName}</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${storeDeals.map(d => generateCard(d, data.storeMap)).join('')}</div></div>`, 'seo', data.storeMap, availableStoreIDs, data.deals);
        fs.writeFileSync(path.join(OUTPUT_DIR, slug), html);
    });
    // --- LEGAL COMPLIANCE HUB GENERATOR ---
    const legalContent = `
        <div class="max-w-4xl mx-auto px-6 py-16 text-slate-300 relative bg-slate-950/50 rounded-2xl border border-white/5 backdrop-blur-sm">
            ${generateCorners()}
            <h2 class="text-4xl md:text-5xl font-black text-white mb-8 border-b border-slate-800 pb-5 uppercase tracking-tighter">Legal & Compliance Hub</h2>
            
            <div class="space-y-12 leading-relaxed text-sm text-slate-400">
                <section id="aviso" class="scroll-mt-32">
                    <h3 class="text-2xl font-black text-emerald-400 mb-4 uppercase tracking-widest flex items-center gap-3"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span>Legal Notice</h3>
                    <p class="mb-3">In compliance with the information obligation established in Article 10 of Law 34/2002, of July 11, on Information Society Services and Electronic Commerce (LSSICE):</p>
                    <div class="bg-black/40 p-5 rounded-lg border border-white/5">
                    <p><strong>Owner:</strong> Salva Peris</p>
                        <p><strong>Contact Email:</strong> salperdelrio@gmail.com</p>
                        <p><strong>Website Purpose:</strong> Video game deals aggregator and affiliate marketing.</p>
                    </div>
                </section>
                
                <section id="privacidad" class="scroll-mt-32">
                    <h3 class="text-2xl font-black text-emerald-400 mb-4 uppercase tracking-widest flex items-center gap-3"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Privacy Policy</h3>
                    <p class="mb-3">In compliance with EU Regulation 2016/679 (GDPR) and applicable data protection laws, we inform you of the following:</p>
                    <ul class="list-disc pl-5 space-y-2 bg-black/40 p-5 rounded-lg border border-white/5">
                        <li><strong>Data Controller:</strong> Salva Peris.</li>
                        <li><strong>Purpose:</strong> Sending newsletters with deals (via Mailchimp) and community management.</li>
                        <li><strong>Legal Basis:</strong> Explicit user consent.</li>
                        <li><strong>Recipients:</strong> Data stored in Mailchimp (Intuit Inc.), provider outside the EU but compliant with the international Data Privacy Framework.</li>
                        <li><strong>Rights:</strong> You can access, rectify, or delete your data by unsubscribing from any email or contacting via email.</li>
                    </ul>
                </section>

                <section id="cookies" class="scroll-mt-32">
                    <h3 class="text-2xl font-black text-emerald-400 mb-4 uppercase tracking-widest flex items-center gap-3"><span class="w-2 h-2 bg-emerald-500 rounded-full"></span> Cookies Policy</h3>
                    <p class="mb-3">This website uses its own and third-party cookies for proper operation and for analytics and affiliate purposes.</p>
                    <ul class="list-disc pl-5 space-y-2 bg-black/40 p-5 rounded-lg border border-white/5">
                        <li><strong>Technical Cookies:</strong> Strictly necessary for navigation and website loading.</li>
                        <li><strong>Affiliate Cookies (External Networks):</strong> Allow tracking purchases made through the website links to assign the corresponding commission (at no cost to you).</li>
                    </ul>
                    <p class="mt-4 italic text-xs">You can reject or configure cookie usage via the warning banner on the home page, or by modifying your browser settings.</p>
                </section>
            </div>
        </div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'legal.html'), renderLayout('Legal & Compliance', 'Legal texts, privacy and cookies.', legalContent, 'legal', data.storeMap, availableStoreIDs, data.deals));

    const writePricePage = (limit, file) => {
        const deals = data.deals.filter(d => parseFloat(d.salePrice) <= limit);
        const html = renderLayout(`Under $${limit}`, `Games under $${limit}.`, `<div class="max-w-7xl mx-auto px-6"><h2 class="text-5xl font-black text-white mb-12 uppercase tracking-tighter">Credit Limit: < $${limit} USD</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${deals.map(d => generateCard(d, data.storeMap)).join('')}</div></div>`, 'seo', data.storeMap, availableStoreIDs, data.deals);
        fs.writeFileSync(path.join(OUTPUT_DIR, file), html);
    };
    writePricePage(5, 'under-5.html');
    writePricePage(10, 'under-10.html');

    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robotsTxt);

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const pages = ['index.html', 'browse.html', 'free.html', 'about.html', 'legal.html', 'under-5.html', 'under-10.html'];
    availableStoreIDs.forEach(id => {
        const sName = data.storeMap[id];
        pages.push(`store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`);
    });
    pages.forEach(p => { xml += `  <url>\n    <loc>${SITE_DOMAIN}/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>\n`; });
    xml += `</urlset>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);

    console.log('✅ Success! Static Matrix V3.0 deployed with Legal Compliance Protocol.');
}

build();