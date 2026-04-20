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

function generateCard(deal, storeMap, isFree = false) {
    const dealUrl = `https://www.cheapshark.com/redirect?dealID=${deal.dealID}${AFFILIATE_PARAM}`;
    const storeName = storeMap[deal.storeID] || 'Store';
    const savings = Math.round(deal.savings);
    
    let metaBadge = '';
    if (deal.metacriticScore && deal.metacriticScore > 0) {
        let mColor = deal.metacriticScore >= 80 ? 'text-emerald-400 border-emerald-500/30' : (deal.metacriticScore >= 65 ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30');
        metaBadge = `<div class="bg-slate-900/80 px-2 py-0.5 rounded text-[9px] font-black border ${mColor} tracking-wider shadow-lg">META ${deal.metacriticScore}</div>`;
    }

    let steamBadge = '';
    if (deal.steamRatingPercent && deal.steamRatingPercent > 0) {
        let sColor = deal.steamRatingPercent >= 80 ? 'text-blue-400 border-blue-500/30' : 'text-slate-400 border-slate-500/30';
        steamBadge = `<div class="bg-slate-900/80 px-2 py-0.5 rounded text-[9px] font-black border ${sColor} tracking-wider shadow-lg">STEAM ${deal.steamRatingPercent}%</div>`;
    }

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
    <div class="deal-card group relative bg-slate-800/40 backdrop-blur-md rounded-2xl overflow-hidden border transition-all duration-500 flex flex-col ${cardStyle} hover:-translate-y-2"
         data-title="${deal.title.toLowerCase()}" data-price="${deal.salePrice}" data-store="${storeName.toLowerCase()}">
        <div class="absolute top-3 left-3 right-3 z-10 flex justify-between items-start pointer-events-none">
            <div class="flex flex-col gap-1 items-start">
                <span class="bg-slate-900/90 text-slate-300 text-[9px] font-bold uppercase px-2 py-1 rounded border border-white/5 shadow-lg">${storeName}</span>
                <div class="bg-slate-900/90 px-1.5 py-0.5 rounded border border-white/5 shadow-lg">${rarityName}</div>
            </div>
            ${badge}
        </div>
        <div class="h-44 overflow-hidden bg-slate-900 relative">
            <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-80"></div>
            <img src="${deal.thumb}" alt="${deal.title}" class="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" loading="lazy">
            <div class="absolute bottom-2 left-3 z-20 flex gap-2">${steamBadge}${metaBadge}</div>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between relative z-10 bg-gradient-to-b from-slate-900/50 to-transparent">
            <h3 class="text-sm font-bold text-white mb-4 line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors" title="${deal.title}">${deal.title}</h3>
            <div class="mt-auto pt-3 border-t border-white/5 flex justify-between items-end">
                <div class="flex flex-col">
                    <span class="text-[11px] text-slate-500 line-through leading-none mb-1 font-semibold">$${deal.normalPrice}</span>
                    <span class="text-xl font-black leading-none ${isFree ? 'text-emerald-400' : 'text-slate-200 group-hover:text-white'} transition-colors">$${deal.salePrice}</span>
                </div>
                <a href="${dealUrl}" target="_blank" rel="noopener noreferrer" class="bg-slate-700 hover:bg-white text-white hover:text-slate-900 font-black py-2 px-5 rounded-xl text-xs transition-all duration-300 shadow-lg uppercase tracking-wide">Loot</a>
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
    const tickerItems = (deals || []).slice(0, 15).map(d => `<span class="mx-10 font-bold">💎 ${d.title}: <span class="text-emerald-400">$${d.salePrice}</span></span>`).join('');

    const newsletterSection = `
    <div class="max-w-7xl mx-auto px-6 py-16">
        <div class="bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 rounded-3xl p-10 md:p-16 text-center shadow-2xl relative overflow-hidden group">
            <div class="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors duration-500"></div>
            <div class="relative z-10 max-w-2xl mx-auto">
                <span class="bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-6 inline-block shadow-lg shadow-indigo-500/40">Join The Army</span>
                <h3 class="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tighter">Never Miss A Mythic Drop</h3>
                <p class="text-slate-300 mb-8 text-lg">Algorithms hide the best deals. We email them directly to you. Join the LootDrop list and get the top 5 price drops sent to your inbox every Friday.</p>
                <form action="#" method="POST" id="newsletter-form" class="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" target="_blank">
                    <input type="email" name="EMAIL" placeholder="Enter your email address..." class="flex-1 bg-slate-900/80 border border-slate-600 rounded-xl px-4 py-4 text-white focus:outline-none focus:border-indigo-400 placeholder-slate-500 font-medium shadow-inner" required>
                    <button type="submit" class="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-8 rounded-xl transition-all shadow-lg shadow-indigo-500/30 uppercase tracking-widest hover:scale-105 active:scale-95">Subscribe</button>
                </form>
               <p class="text-slate-300 text-xs mt-4">100% Free. Zero spam. Unsubscribe anytime.</p>
            </div>
        </div>
    </div>`;

    let seoFooter = '';
    if (availableStoreIDs && storeMap) {
        seoFooter = `
        <div class="max-w-7xl mx-auto px-6 py-12 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
                <h4 class="text-white font-black mb-4 uppercase tracking-widest text-xs">Top Storefronts</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    ${availableStoreIDs.slice(0, 8).map(id => {
                        const sName = storeMap[id];
                        const slug = `store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`;
                        return `<li><a href="${slug}" class="hover:text-white hover:underline transition-colors">${sName} Deals</a></li>`;
                    }).join('')}
                </ul>
            </div>
            <div>
                <h4 class="text-white font-black mb-4 uppercase tracking-widest text-xs">Price Drops</h4>
                <ul class="space-y-2 text-sm text-slate-300">
                    <li><a href="under-5.html" class="hover:text-white transition-colors">Games Under $5</a></li>
                    <li><a href="under-10.html" class="hover:text-white transition-colors">Games Under $10</a></li>
                    <li><a href="free.html" class="hover:text-white transition-colors underline decoration-emerald-400 font-bold">100% Free Games</a></li>
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
            @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: .8; transform: scale(1.02); } }
            .animate-pulse-slow { animation: pulse-slow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
            @keyframes loot-shake { 0% { transform: rotate(0deg); } 25% { transform: rotate(-5deg) scale(1.05); } 50% { transform: rotate(5deg) scale(1.05); } 75% { transform: rotate(-5deg) scale(1.05); } 100% { transform: rotate(0deg); } }
            .loot-shaking { animation: loot-shake 0.3s ease-in-out infinite; }
            .mesh-gradient { background: radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%), radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%); }
        </style>
    </head>
    <body class="text-slate-200 antialiased flex flex-col min-h-screen mesh-gradient">
        
        <div class="bg-indigo-600/10 border-b border-white/5 py-2 overflow-hidden whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-indigo-300 z-[60] relative">
            <div class="flex ticker-wrap">
                ${tickerItems} ${tickerItems}
            </div>
        </div>

        <header class="glass sticky top-0 w-full z-50 shadow-2xl transition-all duration-300">
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

        <main class="flex-grow pt-12 pb-10">
            ${content}
            ${activePage !== 'about' ? newsletterSection : ''}
        </main>

        <footer class="bg-slate-950/80 pt-10 mt-auto">
            ${seoFooter}
            <div class="border-t border-white/10 py-8 text-center bg-black/60">
                <p class="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    &copy; ${year} LootDrop. Automated Deal Engine. Affiliate Links Included.
                </p>
            </div>
        </footer>
    </body>
    </html>
    `;
}

function generateHomePage(deals, storeMap, freeDeals, availableStoreIDs) {
    const heroDeal = deals[0]; 
    const heroStore = storeMap[heroDeal.storeID] || 'Store';
    const heroUrl = `https://www.cheapshark.com/redirect?dealID=${heroDeal.dealID}${AFFILIATE_PARAM}`;

    // NEW: Injecting Top 20 deals into the DOM for the Client-Side Lootbox to use
    const topDealsJSON = JSON.stringify(deals.slice(1, 21).map(d => ({
        title: d.title,
        price: d.salePrice,
        normalPrice: d.normalPrice,
        savings: Math.round(d.savings),
        thumb: d.thumb,
        url: `https://www.cheapshark.com/redirect?dealID=${d.dealID}${AFFILIATE_PARAM}`
    })));

    let content = `
    <div class="max-w-7xl mx-auto px-6">
        
        <div class="text-center py-16 relative">
            <div class="absolute inset-0 -z-10 bg-indigo-500/10 blur-[120px] rounded-full w-1/2 mx-auto"></div>
            <h2 class="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter leading-none">THE BEST <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">DEALS</span><br>FOR GAMERS.</h2>
            <p class="text-slate-400 max-w-xl mx-auto mb-10 text-lg font-medium leading-relaxed">Stop overpaying. We track the price drops across the internet so you don't have to.</p>
        </div>

        <h3 class="text-xl font-black text-amber-400 mb-6 uppercase tracking-widest flex items-center gap-2"><svg class="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg> Deal of the Day</h3>
        <div class="animate-pulse-slow bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-2 border-amber-500/50 rounded-[2rem] overflow-hidden flex flex-col md:flex-row items-center gap-8 mb-16 shadow-[0_0_50px_rgba(245,158,11,0.2)] group relative">
            <div class="w-full md:w-1/2 h-64 md:h-80 overflow-hidden relative">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent to-slate-900/90 md:block hidden z-10"></div>
                <img src="${heroDeal.thumb}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
                <div class="absolute top-4 left-4 z-20 bg-amber-500 text-slate-900 font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest shadow-lg">Mythic Drop</div>
            </div>
            <div class="w-full md:w-1/2 p-8 md:p-12 md:pl-0 relative z-20">
                <span class="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2 block">${heroStore}</span>
                <h3 class="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">${heroDeal.title}</h3>
                <div class="flex items-center gap-6 mb-8">
                    <div class="bg-red-500 text-white font-black text-xl px-4 py-2 rounded-xl shadow-lg border border-red-400">-${Math.round(heroDeal.savings)}%</div>
                    <div>
                        <div class="text-slate-400 line-through text-sm font-bold">$${heroDeal.normalPrice}</div>
                        <div class="text-emerald-400 text-4xl font-black">$${heroDeal.salePrice}</div>
                    </div>
                </div>
                <a href="${heroUrl}" target="_blank" class="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] uppercase tracking-widest">Claim Spotlight Deal</a>
            </div>
        </div>

        <div class="bg-slate-800/40 border border-emerald-500/30 rounded-3xl p-8 mb-20 shadow-[0_0_40px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col items-center text-center group">
            <div class="absolute inset-0 bg-emerald-500/5"></div>
            <div class="relative z-10 w-full">
                <h3 class="text-2xl font-black text-white mb-2 uppercase tracking-widest">Don't know what to play?</h3>
                <p class="text-slate-400 mb-8 text-sm">Spin the wheel. Open the Lootbox. We'll pick a highly-rated game on massive discount for you.</p>
                
                <div id="lootbox-container" class="cursor-pointer bg-slate-900 border-2 border-emerald-500 rounded-2xl w-full max-w-md mx-auto h-48 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:bg-slate-800 transition-colors" onclick="openLootbox()">
                    <div id="lootbox-idle">
                        <div class="text-6xl mb-2">🎁</div>
                        <div class="text-emerald-400 font-black uppercase tracking-widest text-lg">Click to Open Daily Drop</div>
                    </div>
                    <div id="lootbox-reveal" class="hidden w-full h-full p-4 flex flex-col items-center justify-between">
                        <div class="flex items-center gap-4 w-full">
                            <img id="lb-img" src="" class="h-20 w-auto rounded border border-slate-700">
                            <div class="text-left flex-1">
                                <h4 id="lb-title" class="text-white font-bold text-sm line-clamp-2 leading-tight mb-2"></h4>
                                <div class="flex items-center gap-2">
                                    <span id="lb-savings" class="bg-emerald-500 text-slate-900 font-black text-[10px] px-2 py-1 rounded"></span>
                                    <span id="lb-price" class="text-emerald-400 font-black text-xl"></span>
                                </div>
                            </div>
                        </div>
                        <a id="lb-url" href="#" target="_blank" class="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-2 rounded-xl mt-3 uppercase text-xs tracking-widest shadow-lg transition-colors">Claim Mystery Deal</a>
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
                
                // Prevent double clicking
                if(!idle.classList.contains('hidden') && !container.classList.contains('loot-shaking')) {
                    // Start shaking animation
                    container.classList.add('loot-shaking');
                    container.classList.remove('hover:bg-slate-800', 'cursor-pointer');
                    
                    // Simulate CS:GO Case Opening suspense
                    setTimeout(() => {
                        container.classList.remove('loot-shaking');
                        idle.classList.add('hidden');
                        reveal.classList.remove('hidden');
                        reveal.classList.add('flex');
                        
                        // Pick a random winner
                        const winner = topDeals[Math.floor(Math.random() * topDeals.length)];
                        
                        // Inject data
                        document.getElementById('lb-img').src = winner.thumb;
                        document.getElementById('lb-title').innerText = winner.title;
                        document.getElementById('lb-savings').innerText = '-' + winner.savings + '%';
                        document.getElementById('lb-price').innerText = '$' + winner.price;
                        document.getElementById('lb-url').href = winner.url;
                        
                        // Make it pop
                        container.classList.add('border-amber-400', 'shadow-[0_0_50px_rgba(251,191,36,0.3)]');
                        container.classList.remove('border-emerald-500');
                        document.getElementById('lb-url').classList.replace('bg-emerald-500', 'bg-amber-500');
                        document.getElementById('lb-url').classList.replace('hover:bg-emerald-400', 'hover:bg-amber-400');
                        document.getElementById('lb-savings').classList.replace('bg-emerald-500', 'bg-red-500');
                        document.getElementById('lb-savings').classList.replace('text-slate-900', 'text-white');
                        
                    }, 1200); // Shakes for 1.2 seconds before revealing
                }
            }
        </script>

        <div class="bg-gradient-to-r from-violet-900/60 to-fuchsia-900/30 border border-fuchsia-500/30 rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center gap-10 mb-20 shadow-[0_0_40px_rgba(217,70,239,0.1)] relative overflow-hidden group">
            <div class="absolute inset-0 bg-fuchsia-500/5 group-hover:bg-fuchsia-500/10 transition-colors duration-500"></div>
            <div class="flex-1 relative z-10">
                <span class="bg-fuchsia-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4 inline-block shadow-lg shadow-fuchsia-500/40">Browser Powerup</span>
                <h3 class="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">Steal Steam's Traffic.<br>Find Cheaper Prices Instantly.</h3>
                <p class="text-slate-300 mb-8 leading-relaxed text-lg">Install the LootDrop Companion. It secretly scans background prices while you browse Steam and drops a glowing banner if a game is cheaper on another store.</p>
                <a href="https://github.com/SalvaperisR/game-deals-aggregator/archive/refs/heads/main.zip" class="inline-block bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(217,70,239,0.4)] uppercase tracking-widest">Download Extension</a>
            </div>
        </div>

        <div class="flex items-center justify-between mb-8 border-l-4 border-indigo-500 pl-6">
            <h3 class="text-2xl font-black text-white uppercase tracking-tighter">Live Drops</h3>
            <a href="browse.html" class="text-indigo-400 font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">View All Deals →</a>
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
                <div class="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 sticky top-36 shadow-xl">
                    <h3 class="text-lg font-black text-white mb-4 uppercase tracking-wider">Filters</h3>
                    <div class="mb-6">
                        <input type="text" id="searchInput" placeholder="Find a game..." class="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:outline-none shadow-inner">
                    </div>
                    <div class="mb-6">
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Max Price</label>
                        <input type="range" id="priceSlider" min="0" max="30" step="1" value="30" class="w-full accent-indigo-500">
                        <div class="flex justify-between text-sm font-bold text-emerald-400 mt-2">
                            <span>$0</span><span id="priceValue">Under $30</span>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Storefronts</label>
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
                <div class="flex justify-between items-center border-b border-white/10 pb-4 mb-8">
                    <h2 class="text-3xl font-black text-white uppercase tracking-tighter">All Deals</h2>
                    <span class="text-sm font-black text-indigo-300 bg-indigo-900/50 px-4 py-1.5 rounded-full border border-indigo-500/30" id="resultsCount">${deals.length} results</span>
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
        priceSlider.addEventListener('input', (e) => { priceValue.innerText = 'Under $' + e.target.value; applyFilters(); });
        storeCheckboxes.forEach(cb => cb.addEventListener('change', applyFilters));

        window.resetFilters = function() {
            searchInput.value = ''; priceSlider.value = 30; priceValue.innerText = 'Under $30';
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
    
    console.log('🏗️ Building Full Static Matrix with RPG Visuals & Lootbox...');
    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);
    
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), generateHomePage(data.deals, data.storeMap, data.freeDeals, availableStoreIDs));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'browse.html'), generateBrowsePage(data.deals, data.storeMap, availableStoreIDs));
    
    const freeContent = `<div class="max-w-7xl mx-auto px-6"><h2 class="text-4xl font-black text-emerald-400 mb-12 uppercase tracking-tighter">100% Free Drops</h2><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">${data.freeDeals.length > 0 ? data.freeDeals.map(d => generateCard(d, data.storeMap, true)).join('') : '<p class="text-slate-500">No free deals right now.</p>'}</div></div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'free.html'), renderLayout('Free Drops', '100% Free PC games.', freeContent, 'free', data.storeMap, availableStoreIDs, data.deals));

    const aboutContent = `
        <div class="max-w-3xl mx-auto px-6 py-12 text-slate-300">
            <h2 class="text-4xl font-black text-white mb-6 border-b border-slate-800 pb-4 uppercase tracking-tighter">About LootDrop</h2>
            <p class="text-lg mb-6 leading-relaxed">LootDrop is an automated system scanning digital storefronts every 24 hours to find elite price drops. Our engine aggregates data like Metacritic scores and Steam user ratings so you never buy a bad game.</p>
            <p class="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 italic font-medium">Affiliate Disclosure: We earn commissions on qualifying purchases to keep this engine running ad-free.</p>
        </div>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'about.html'), renderLayout('About Us', 'LootDrop About Page.', aboutContent, 'about', data.storeMap, availableStoreIDs, data.deals));

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

    const robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${SITE_DOMAIN}/sitemap.xml`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robotsTxt);

    const today = new Date().toISOString().split('T')[0];
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    const pages = ['index.html', 'browse.html', 'free.html', 'about.html', 'under-5.html', 'under-10.html'];
    availableStoreIDs.forEach(id => {
        const sName = data.storeMap[id];
        pages.push(`store-${sName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.html`);
    });
    pages.forEach(p => { xml += `  <url>\n    <loc>${SITE_DOMAIN}/${p}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${p === 'index.html' ? '1.0' : '0.8'}</priority>\n  </url>\n`; });
    xml += `</urlset>`;
    fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);

    console.log('✅ Success! Premium Visuals & Lootbox injected.');
}

build();