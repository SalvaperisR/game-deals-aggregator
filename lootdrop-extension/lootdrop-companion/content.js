// 1. Announce presence in the matrix
console.log("🟢 LootDrop Companion Protocol: ONLINE");

// 2. Find the name of the game the user is looking at
const targetGameElement = document.getElementById("appHubAppName");

if (targetGameElement) {
    const gameName = targetGameElement.innerText;
    console.log("🎯 Target Acquired: " + gameName);

    // 3. Inject our UI into Steam
    const banner = document.createElement("div");
    banner.style.cssText = "position:fixed; bottom:20px; right:20px; background:#0f172a; border:2px solid #10b981; color:#34d399; padding:15px 20px; z-index:999999; font-family:sans-serif; font-weight:900; border-radius:8px; box-shadow: 0 0 20px rgba(16,185,129,0.4); text-transform:uppercase; letter-spacing:2px; font-size:12px;";
    
    banner.innerHTML = `⚡ LOOTDROP SCANNER<br><span style="color:white; font-size:16px;">Scanning alternative nodes for:<br>${gameName}...</span>`;
    
    document.body.appendChild(banner);
}