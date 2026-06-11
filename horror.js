// ==========================================
// GAME CONFIGURATION
// ==========================================
const CURRENT_VERSION = "0.2.1.2";
const DOWNLOAD_URL = "https://github.com/TOBI0458/Horror-game"; // Change this to your download link
const VERSION_CHECK_URL = "https://raw.githubusercontent.com/TOBI0458/Horror-game/main/version.json";

// Hier kannst du neue Updates einfach eintragen:
// Layout: NEW THINGS, CHANGES, FIXES, UPCOMING
const CHANGELOG_DATA = [
    {
        version: "0.2.1.1",
        changes: [
            "<span class='log-tag change'>CHG</span> Version update to 0.2.1.1",
            "<span class='log-tag fix'>FIX</span> Corrected vertical look sensitivity and light synchronization",
            "<span class='log-tag new'>NEW</span> Sounds for the ground.",
            "<span class='log-tag fix'>FIX</span> Fixed bugs.",
            "<strong>Upcoming:</strong>",
            "• Fixing Stairs (Only Easy Gamemode is finishable)",
            "• More sounds",
            "• And much more....."
        ]
    },
    {
        version: "0.2.1",
        changes: [
            "<span class='log-tag new'>NEW</span> Integrated an 'Update Available' notification system",
            "<span class='log-tag new'>NEW</span> Added a dedicated, scrollable Changelog modal",
            "<span class='log-tag change'>CHG</span> Centralized version management and UI sync",
            "<span class='log-tag change'>CHG</span> Enhanced legibility with high-contrast text shadows",
            "<span class='log-tag change'>CHG</span> Migrated the entire interface to English",
            "<span class='log-tag change'>CHG</span> Adjusted color palette for better menu visibility",
            "<span class='log-tag fix'>FIX</span> Resolved UI listener lockout when skipping intro"
        ]
    },
    {
        version: "0.2.0",
        changes: [
            "Initial Beta release",
            "Added monster AI and floor generation",
            "Implemented key collection mechanics"
        ]
    },
];

const canvas = document.getElementById('gameCanvas');
const ctx = canvas ? canvas.getContext('2d', { alpha: false }) : null;

if (!canvas)
{
    console.error("Fehler: 'gameCanvas' nicht im HTML gefunden! Das Spiel kann nicht starten.");
}

let width, height;

let cachedScreenImg = null;
let cachedPixels = null;
let zBuffer = null;

window.addEventListener('load', () =>
{
    // Sync the top-right version display with the actual version variable
    const versionDisplay = document.getElementById('game-version');
    if (versionDisplay)
    {
        versionDisplay.textContent = 'V' + CURRENT_VERSION;
    }

    const intro = document.getElementById('intro-screen');
    const introText = document.querySelector('#intro-screen h2');

    // Prüfen, ob das Intro in dieser Sitzung bereits gezeigt wurde
    if (sessionStorage.getItem('introPlayed'))
    {
        if (intro)
        {
            intro.classList.add('hidden');
        }
    }
    else
    {
        // Starte die Text-Animation erst, wenn alles geladen ist
        if (introText)
        {
            introText.classList.add('start-anim');
        }

        setTimeout(() =>
        {
            if (intro)
            {
                intro.style.opacity = '0';
                setTimeout(() =>
                {
                    intro.classList.add('hidden');
                    // Marker setzen, damit es beim nächsten Reload übersprungen wird
                    sessionStorage.setItem('introPlayed', 'true');
                }, 1500);
            }
        }, 4000); 
    }

    // Changelog Initialisierung
    const trigger = document.getElementById('changelog-trigger');
    const modal = document.getElementById('changelog-modal');
    const closeBtn = document.getElementById('changelog-close-btn');
    const list = document.getElementById('changelog-list');

    // Update Button Logic
    const updateBtn = document.getElementById('update-btn');
    console.log("Update-Button im HTML gefunden?", updateBtn ? "Ja" : "Nein, ID prüfen!");

    if (updateBtn) {
        fetch(VERSION_CHECK_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Datei nicht gefunden (404)! Prüfe ob 'main' oder 'master' der richtige Branch ist. URL: ${VERSION_CHECK_URL}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("Update Check:", { lokal: CURRENT_VERSION, remote: data.version });
                
                if (data.version && data.version !== CURRENT_VERSION) {
                    console.log("Versionen sind unterschiedlich. Button wird eingeblendet.");
                    updateBtn.classList.remove('hidden');
                    updateBtn.style.display = "block"; // Sicherstellen, dass er nicht per CSS versteckt bleibt
                    updateBtn.addEventListener('click', () => {
                        if (confirm(`A new version (${data.version}) is available. Do you want to download it?`)) {
                            window.open(data.download_url || DOWNLOAD_URL, '_blank');
                        }
                    });
                } else {
                    console.log("Kein Update nötig oder Versionen identisch.");
                }
            })
            .catch(err => console.error("Fehler beim Update-Check:", err.message));
    }

    if (trigger && modal && closeBtn && list)
    {
        trigger.addEventListener('click', () =>
        {
            list.innerHTML = CHANGELOG_DATA
                .filter(entry => entry.version === CURRENT_VERSION)
                .map(entry => 
                {
                    return `
                    <div class="changelog-entry">
                        <h3>Version ${entry.version}</h3>
                        <ul>${entry.changes.map(c => `<li>${c}</li>`).join('')}</ul>
                    </div>
                `;
                }).join('');
            modal.classList.remove('hidden');
        });
        closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    }
});

function resize()
{
    if (!canvas) return;
    // Performance: Halbe Auflösung rendern, aber auf volle Größe skalieren
    width = Math.floor(window.innerWidth / 2);
    height = Math.floor(window.innerHeight / 2);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// --- TEXTUR LADEN (OPTIMIERT) ---
function loadExternalImage(url)
{
    const img = new Image();
    img.crossOrigin = "anonymous"; // Erlaubt die Verwendung auf dem Canvas (CORS)
    img.src = url;
    return img;
}

// --- PROZEDURAL GENERIERTE TEXTUREN (keine externen Abhängigkeiten) ---

// Gemeinsame Hilfsfunktionen für Textur-Generierung
function noise2D(x, y)
{
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}

function smoothNoise(x, y)
{
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    // Smoothstep
    const sfx = fx * fx * (3 - 2 * fx);
    const sfy = fy * fy * (3 - 2 * fy);
    const a = noise2D(ix, iy);
    const b = noise2D(ix + 1, iy);
    const cc = noise2D(ix, iy + 1);
    const d = noise2D(ix + 1, iy + 1);
    return a + (b - a) * sfx + (cc - a) * sfy + (a - b - cc + d) * sfx * sfy;
}

function fbm(x, y, octaves)
{
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++)
    {
        val += amp * smoothNoise(x * freq, y * freq);
        amp *= 0.5;
        freq *= 2;
    }
    return val;
}

function makeSeededRandom(startSeed)
{
    let s = startSeed;
    return function ()
    {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

// --- 1. WAND-TEXTUR: Alte Steinmauer / rissiger Putz ---
function createWallTexture()
{
    const size = 1024;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    const imgData = c.createImageData(size, size);
    const data = imgData.data;
    const rand = makeSeededRandom(54321);

    // Ziegelmuster-Parameter
    const brickH = 32, brickW = 64, mortarSize = 3;

    for (let py = 0; py < size; py++)
    {
        for (let px = 0; px < size; px++)
        {
            const idx = (py * size + px) * 4;

            // Welcher Ziegel?
            const row = Math.floor(py / brickH);
            const offset = (row % 2 === 0) ? 0 : brickW / 2;
            const bx = ((px + offset) % brickW);
            const by = py % brickH;

            // Fuge?
            const isMortar = bx < mortarSize || by < mortarSize;

            let r, g, b;
            if (isMortar)
            {
                // Dunkelgrauer Mörtel
                const n = noise2D(px * 0.1, py * 0.1) * 15;
                r = 25 + n; g = 22 + n; b = 20 + n;
            }
            else
            {
                // Stein-Basis: dunkler Grau-Braun
                const brickSeed = row * 37 + Math.floor((px + offset) / brickW) * 53;
                const brickVariation = noise2D(brickSeed, 0) * 30 - 15;

                const baseR = 55 + brickVariation;
                const baseG = 48 + brickVariation * 0.8;
                const baseB = 42 + brickVariation * 0.5;

                // Stein-Textur
                const stoneTex = fbm(px * 0.03, py * 0.03, 4) * 20 - 10;
                // Feinstruktur
                const micro = (noise2D(px * 0.3, py * 0.3) - 0.5) * 12;

                r = baseR + stoneTex + micro;
                g = baseG + stoneTex * 0.8 + micro * 0.8;
                b = baseB + stoneTex * 0.5 + micro * 0.6;

                // Kanten der Ziegel: leicht dunkler
                const edgeDist = Math.min(bx - mortarSize, brickW - bx, by - mortarSize, brickH - by);
                if (edgeDist < 4)
                {
                    const edgeDarken = (1 - edgeDist / 4) * 0.2;
                    r *= (1 - edgeDarken);
                    g *= (1 - edgeDarken);
                    b *= (1 - edgeDarken);
                }

                // Feuchtigkeitsflecken
                const damp = fbm(px * 0.005 + 3.3, py * 0.008 + 1.7, 3);
                if (damp > 0.6)
                {
                    const dampAmt = (damp - 0.6) * 2;
                    r *= (1 - dampAmt * 0.3);
                    g *= (1 - dampAmt * 0.2);
                    b *= (1 - dampAmt * 0.1);
                }
            }

            data[idx] = Math.max(0, Math.min(255, r | 0));
            data[idx + 1] = Math.max(0, Math.min(255, g | 0));
            data[idx + 2] = Math.max(0, Math.min(255, b | 0));
            data[idx + 3] = 255;
        }
    }
    c.putImageData(imgData, 0, 0);

    // Risse
    c.globalCompositeOperation = 'multiply';
    for (let crack = 0; crack < 5; crack++)
    {
        c.beginPath();
        let cx = rand() * size, cy = rand() * size;
        c.moveTo(cx, cy);
        for (let s = 0; s < 15; s++)
        {
            cx += (rand() - 0.5) * 20;
            cy += rand() * 15 + 3;
            c.lineTo(cx, cy);
        }
        c.strokeStyle = `rgba(5, 3, 2, ${0.4 + rand() * 0.3})`;
        c.lineWidth = 0.5 + rand() * 1;
        c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    return cv;
}

// --- 2. DECKEN-TEXTUR: Alter Putz mit Wasserflecken und Schimmel ---
function createCeilingTexture()
{
    const size = 1024;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const c = cv.getContext('2d');
    const imgData = c.createImageData(size, size);
    const data = imgData.data;
    const rand = makeSeededRandom(99887);

    for (let py = 0; py < size; py++)
    {
        for (let px = 0; px < size; px++)
        {
            const idx = (py * size + px) * 4;

            // Basis: schmutzig-weißer Putz
            const baseVal = 38;
            const plasterNoise = fbm(px * 0.02, py * 0.02, 4) * 15 - 7;
            const micro = (noise2D(px * 0.2, py * 0.2) - 0.5) * 8;

            let r = baseVal + plasterNoise + micro;
            let g = baseVal + plasterNoise * 0.95 + micro * 0.9;
            let b = baseVal + plasterNoise * 0.85 + micro * 0.85;

            // Wasserflecken (gelblich-braun)
            const water = fbm(px * 0.006 + 7.7, py * 0.006 + 2.3, 4);
            if (water > 0.55)
            {
                const wAmt = (water - 0.55) * 3;
                r += wAmt * 18;
                g += wAmt * 10;
                b -= wAmt * 5;
            }

            // Schimmelflecken (dunkelgrün/schwarz)
            const mold = fbm(px * 0.008 + 44.1, py * 0.008 + 22.5, 3);
            if (mold > 0.68)
            {
                const mAmt = (mold - 0.68) * 4;
                r *= (1 - mAmt * 0.6);
                g *= (1 - mAmt * 0.3);
                b *= (1 - mAmt * 0.5);
                g += mAmt * 4; // leichter Grünstich
            }

            // Putzrisse / Abblättern
            const crackNoise = fbm(px * 0.015 + 11.1, py * 0.015 + 33.3, 5);
            if (crackNoise > 0.72)
            {
                const cAmt = (crackNoise - 0.72) * 5;
                r -= cAmt * 12;
                g -= cAmt * 12;
                b -= cAmt * 10;
            }

            // Spinnweben-Simulation (helle Streifen)
            const web = Math.sin(px * 0.02 + py * 0.015 + noise2D(px * 0.005, py * 0.005) * 8);
            if (Math.abs(web) > 0.98)
            {
                r += 8; g += 8; b += 8;
            }

            data[idx] = Math.max(0, Math.min(255, r | 0));
            data[idx + 1] = Math.max(0, Math.min(255, g | 0));
            data[idx + 2] = Math.max(0, Math.min(255, b | 0));
            data[idx + 3] = 255;
        }
    }
    c.putImageData(imgData, 0, 0);
    return cv;
}

// --- 3. BODEN-TEXTUR: Alte Holzdielen ---
function createDetailedFloorTexture()
{
    const size = 1024;
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = size;
    floorCanvas.height = size;
    const c = floorCanvas.getContext('2d');
    const rand = makeSeededRandom(12345);

    // Basis-Holzfarbe (dunkles, altes Holz)
    const baseR = 45, baseG = 30, baseB = 18;

    // Dielen-Layout
    const plankWidth = 50 + (rand() * 20 | 0);
    const numPlanks = Math.ceil(size / plankWidth) + 1;
    const planks = [];
    let currentX = 0;
    for (let i = 0; i < numPlanks; i++)
    {
        const w = plankWidth + (rand() * 16 - 8 | 0);
        planks.push({ x: currentX, w: w, hue: rand() * 18 - 9, brightness: rand() * 22 - 11, grainSeed: rand() * 1000 });
        currentX += w;
    }

    const imgData = c.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++)
    {
        for (let px = 0; px < size; px++)
        {
            const idx = (py * size + px) * 4;

            // Welche Diele?
            let plank = planks[0], plankIdx = 0;
            for (let i = 0; i < planks.length; i++)
            {
                if (px >= planks[i].x && px < planks[i].x + planks[i].w)
                {
                    plank = planks[i]; plankIdx = i; break;
                }
            }

            const localX = px - plank.x;
            const plankEdgeDist = Math.min(localX, plank.w - localX);

            // Holzmaserung
            const grainY = py * 0.02 + plank.grainSeed;
            const grain = Math.sin(grainY * 3.5 + smoothNoise(px * 0.01, py * 0.04) * 5) * 0.5 + 0.5;
            const grainFine = Math.sin(grainY * 12 + noise2D(px * 0.02, py * 0.05) * 3) * 0.12;

            // Astlöcher (mehr als vorher)
            let knotDark = 0;
            const knots = [
                { cx: (plank.x + plank.w * 0.3) % size, cy: (150 + plankIdx * 317) % size },
                { cx: (plank.x + plank.w * 0.7) % size, cy: (400 + plankIdx * 251) % size },
                { cx: (plank.x + plank.w * 0.5) % size, cy: (50 + plankIdx * 113) % size },
                { cx: (plank.x + plank.w * 0.2) % size, cy: (280 + plankIdx * 401) % size }
            ];
            for (let k of knots)
            {
                const kd = Math.hypot(px - k.cx, py - k.cy);
                if (kd < 14) knotDark = Math.max(knotDark, (1 - kd / 14) * 0.5 + Math.sin(kd * 0.9) * 0.1);
            }

            let r = baseR + plank.hue + plank.brightness;
            let g = baseG + plank.hue * 0.5 + plank.brightness * 0.7;
            let b = baseB + plank.brightness * 0.3;

            // Maserung
            const ge = grain * 14 + grainFine * 9;
            r += ge; g += ge * 0.7; b += ge * 0.3;

            // Knoten
            r *= (1 - knotDark); g *= (1 - knotDark); b *= (1 - knotDark);

            // Fugen
            if (plankEdgeDist <= 2)
            {
                const f = plankEdgeDist / 2 * 0.3 + 0.05;
                r *= f; g *= f; b *= f;
            }

            // Abnutzung
            const age = fbm(px * 0.01, py * 0.01, 3);
            const af = 1 - age * 0.22;
            r *= af; g *= af; b *= af;

            // Dreck
            const stain = fbm(px * 0.005 + 5.7, py * 0.005 + 3.2, 3);
            if (stain > 0.6)
            {
                const si = (stain - 0.6) * 3;
                r *= (1 - si * 0.5); g *= (1 - si * 0.45); b *= (1 - si * 0.3);
            }

            // Wasser/Feuchtigkeitspützen
            const water = fbm(px * 0.007 + 12.3, py * 0.007 + 45.6, 3);
            if (water > 0.65)
            {
                const wi = (water - 0.65) * 4;
                r *= (1 - wi * 0.7);
                g *= (1 - wi * 0.7);
                b *= (1 - wi * 0.6); // Leicht bläuliche/dunkle Spiegelung
            }

            // Schimmel (grünlich) in den Ecken oder feuchten Stellen
            const mold = fbm(px * 0.01 + 88.2, py * 0.01 + 22.1, 4);
            if (mold > 0.7)
            {
                const mi = (mold - 0.7) * 5;
                r *= (1 - mi * 0.8);
                g *= (1 - mi * 0.3); // Erhält mehr Grün
                b *= (1 - mi * 0.8);
                g += mi * 18; // Grünstich hinzufügen
            }

            // Blut-Suggestion (gewischt)
            const blood = fbm(px * 0.006 + 99.1, py * 0.006 + 77.3, 3);
            if (blood > 0.78)
            {
                const bi = (blood - 0.78) * 5;
                r = r * (1 - bi * 0.3) + 40 * bi;
                g *= (1 - bi * 0.7); b *= (1 - bi * 0.6);
            }

            // Nägel und Rost
            const nailY = py % 120;
            if (nailY < 5)
            {
                const n1 = Math.hypot(px - (plank.x + plank.w * 0.15), nailY - 2.5);
                const n2 = Math.hypot(px - (plank.x + plank.w * 0.85), nailY - 2.5);
                const nd = Math.min(n1, n2);
                if (nd < 2.5) { const ns = 0.2 + nd / 2.5 * 0.2; r *= ns; g *= ns; b *= ns; }
            }
            else if (nailY >= 5 && nailY < 20)
            {
                // Rost läuft von den Nägeln herunter
                const rx_dist = Math.min(Math.abs(px - (plank.x + plank.w * 0.15)), Math.abs(px - (plank.x + plank.w * 0.85)));
                if (rx_dist < 3)
                {
                    const rust_amt = (1 - rx_dist / 3) * (1 - (nailY - 5) / 15) * (noise2D(px * 0.1, py * 0.1) * 0.5 + 0.5);
                    r = r * (1 - rust_amt * 0.4) + 50 * rust_amt; // Rost-Rot/Orange
                    g = g * (1 - rust_amt * 0.5) + 20 * rust_amt;
                    b *= (1 - rust_amt * 0.8);
                }
            }

            // Mikro-Rauschen
            const mn = (noise2D(px * 0.5, py * 0.5) - 0.5) * 7;
            r += mn; g += mn * 0.8; b += mn * 0.5;

            data[idx] = Math.max(0, Math.min(255, r | 0));
            data[idx + 1] = Math.max(0, Math.min(255, g | 0));
            data[idx + 2] = Math.max(0, Math.min(255, b | 0));
            data[idx + 3] = 255;
        }
    }
    c.putImageData(imgData, 0, 0);

    // --- Post-Processing Details auf dem Canvas ---

    // 1. Risse (Längs)
    c.globalCompositeOperation = 'multiply';
    for (let crack = 0; crack < 10; crack++)
    { // Mehr Risse
        c.beginPath();
        let cx = rand() * size, cy = rand() * size;
        c.moveTo(cx, cy);
        for (let s = 0; s < 12 + (rand() * 10 | 0); s++)
        {
            cx += (rand() - 0.5) * 12; cy += rand() * 18 + 3;
            c.lineTo(cx, cy);
        }
        c.strokeStyle = `rgba(10, 5, 2, ${0.3 + rand() * 0.35})`;
        c.lineWidth = 0.4 + rand() * 1.2;
        c.stroke();
    }

    // 2. Horizontale Kratzer (Quer zu den Dielen)
    for (let i = 0; i < 25; i++)
    {
        c.beginPath();
        let cx = rand() * size, cy = rand() * size;
        c.moveTo(cx, cy);
        let scratchLength = 2 + (rand() * 4 | 0);
        for (let j = 0; j < scratchLength; j++)
        {
            cx += (rand() - 0.5) * 25 + 10; // Querbewegung
            cy += (rand() - 0.5) * 4;
            c.lineTo(cx, cy);
        }
        c.strokeStyle = `rgba(8, 4, 2, ${0.4 + rand() * 0.5})`;
        c.lineWidth = 0.3 + rand() * 0.8;
        c.stroke();
    }
    c.globalCompositeOperation = 'source-over';

    // 3. Frische Blutstropfen und Spritzer
    c.fillStyle = 'rgba(80, 0, 0, 0.85)';
    for (let i = 0; i < 40; i++)
    {
        let bx = rand() * size, by = rand() * size;
        let bSize = rand() * 3 + 0.5;

        c.beginPath();
        c.arc(bx, by, bSize, 0, Math.PI * 2);
        c.fill();

        // Laufspur/Schmierspur
        if (rand() > 0.6) {
            c.beginPath();
            c.moveTo(bx, by);
            // Spur zieht sich in eine Richtung
            let dx = (rand() - 0.5) * 15;
            let dy = rand() * 20;
            c.lineTo(bx + dx, by + dy);
            c.lineWidth = bSize * 0.6;
            c.strokeStyle = 'rgba(60, 0, 0, 0.7)';
            c.stroke();
        }
    }

    return floorCanvas;
}

// Texturen generieren
const wallImg = createWallTexture();
const ceilingImg = createCeilingTexture();
const floorImg = createDetailedFloorTexture();

// Hilfsfunktion um Pixeldaten aus Bildern zu extrahieren
let floorPixels = null, ceilingPixels = null, wallPixels = null;

const assetList = [
    { img: wallImg, setter: (p) => wallPixels = p, name: "Wand" },
    { img: floorImg, setter: (p) => floorPixels = p, name: "Boden" },
    { img: ceilingImg, setter: (p) => ceilingPixels = p, name: "Decke" }
];

function extractPixels(img, callback)
{
    return new Promise((resolve) =>
    {
        const process = () =>
        {
            try
            {
                const off = document.createElement('canvas');
                off.width = 1024; off.height = 1024;
                const octx = off.getContext('2d');
                octx.drawImage(img, 0, 0, 1024, 1024);
                const data = octx.getImageData(0, 0, 1024, 1024).data;
                callback(new Uint32Array(data.buffer));
                resolve();
            }
            catch (e)
            {
                console.error("Fehler bei Pixel-Extraktion:", e);
                resolve(); // Trotzdem weiter, um den Ladebildschirm nicht zu blockieren
            }
        };

        // Canvas-Elemente (prozedural generiert) sofort verarbeiten
        if (img instanceof HTMLCanvasElement) {
            process();
            return;
        }

        // Sicherheits-Timeout: Falls ein Bild gar nicht reagiert, nach 5 Sek. weitermachen
        const timeout = setTimeout(() =>
        {
            console.warn("Lade-Timeout für Bild:", img.src);
            resolve();
        }, 5000);

        const wrappedProcess = () =>
        {
            clearTimeout(timeout);
            process();
        };

        if (img.complete)
        {
            if (img.naturalWidth > 0)
            {
                wrappedProcess();
            }
            else
            {
                // Bild ist 'complete', aber kaputt -> nicht hängen bleiben
                clearTimeout(timeout);
                resolve();
            }
        }
        else
        {
            img.onload = wrappedProcess;
            img.onerror = () =>
            {
                clearTimeout(timeout);
                console.error("Bild konnte nicht geladen werden:", img.src);
                resolve();
            };
        }
    });
}

const stairsImg = new Image(); stairsImg.src = 'treppe.png';
const doorImg = new Image(); doorImg.src = 'tuer.png';

let floorPattern, ceilingPattern;

// --- TEXTUR-GENERATOR FÜR FALLBACKS (Gegen unsichtbare Objekte) ---
function createFallbackTex(color1, color2, type) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const c = canvas.getContext('2d');
    c.fillStyle = color1;
    c.fillRect(0, 0, 256, 256);
    if (type === 'door') {
        c.strokeStyle = color2;
        c.lineWidth = 4;
        c.strokeRect(20, 20, 216, 216);
        c.strokeRect(40, 40, 176, 80);
        c.strokeRect(40, 140, 176, 80);
        c.fillStyle = color2;
        c.beginPath(); c.arc(200, 128, 10, 0, Math.PI * 2); c.fill();
    } else {
        // Prozedurale Rausch-Textur für Wände/Boden
        for (let i = 0; i < 2000; i++) {
            let x = Math.random() * 256;
            let y = Math.random() * 256;
            let size = Math.random() * 2;
            c.fillStyle = Math.random() > 0.5 ? color2 : 'rgba(0,0,0,0.2)';
            c.fillRect(x, y, size, size);
        }
        c.strokeStyle = color2;
        c.strokeRect(0, 0, 256, 256);
    }
    return canvas;
}

const wallTexFallback = createFallbackTex('#222', '#111', 'wall');
const doorTexFallback = createFallbackTex('#3d2b1f', '#1a0f00', 'door');
const stairsTexFallback = createFallbackTex('#333', '#222', 'stairs');

const TILE_SIZE = 60;
const MAP_WIDTH = 80;  // Riesige Map
const MAP_HEIGHT = 60; // Riesige Map

// --- SCHWIERIGKEITSGRADE ---
const DIFFICULTY_SETTINGS = {
    leicht: { floors: 1, keys: 5, enemiesPerFloor: 1, speed: 1.2, visionRange: 350, searchDist: 400, intelligence: 0, desc: "Gentle start. The monster is slow and forgetful." },
    normal: { floors: 2, keys: 10, enemiesPerFloor: 1, speed: 2.2, visionRange: 500, searchDist: 800, intelligence: 1, desc: "The standard experience. Balanced challenge." },
    schwer: { floors: 3, keys: 15, enemiesPerFloor: 1.7, speed: 3.0, visionRange: 750, searchDist: 1500, intelligence: 2, desc: "Persistent monsters that barely let you out of their sight." },
    impossible: { floors: 5, keys: 25, enemiesPerFloor: 3, speed: 4.2, visionRange: 1200, searchDist: 3000, intelligence: 3, desc: "Your death is certain. The monsters smell your fear." }
};
let currentDifficulty = 'normal';

let maps = [];
let currentFloor = 0;
const startScreenMap = [
    "111111111111".split(''),
    "100000000001".split(''),
    "111121121121".split(''), // doors on right wall
    "100000000001".split(''),
    "111111111111".split('')
];
let map = [];

let keysData = [];
let TOTAL_KEYS = 10;
let enemiesData = [];
let bloodSplattersData = [];
let doorsData = []; // Neues Array für Tür-Objekte
let torchesData = [];
let windowsData = [];

let audioCtx = null;

function playFootstepSound() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        const now = audioCtx.currentTime;

        // 1. Heel Impact (The Thump)
        let heel = audioCtx.createOscillator();
        let heelGain = audioCtx.createGain();
        heel.type = 'sine';
        heel.frequency.setValueAtTime(80 + Math.random() * 20, now);
        // Kürzere Ramp-Zeit (0.05 statt 0.08) verhindert den Laser-Effekt
        heel.frequency.exponentialRampToValueAtTime(30, now + 0.05);
        heelGain.gain.setValueAtTime(0.7, now);
        heelGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        heel.connect(heelGain);
        heelGain.connect(audioCtx.destination);
        heel.start(); heel.stop(now + 0.06);

        // 2. Hollow Wood Resonance (Filtered Noise)
        let resonance = audioCtx.createBufferSource();
        let bufferSize = audioCtx.sampleRate * 0.1;
        let buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        resonance.buffer = buffer;

        let filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass"; // Lowpass macht den Sound dumpfer/holziger als Bandpass
        filter.frequency.value = 300 + Math.random() * 100;
        filter.Q.value = 1;

        let resGain = audioCtx.createGain();
        resGain.gain.setValueAtTime(0.8, now);
        resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        resonance.connect(filter);
        filter.connect(resGain);
        resGain.connect(audioCtx.destination);
        resonance.start();

        // 3. Subtle Plank Creak (Occasional detail)
        if (Math.random() > 0.85) {
            let creak = audioCtx.createOscillator();
            let creakGain = audioCtx.createGain();
            creak.type = 'triangle';
            creak.frequency.setValueAtTime(150 + Math.random() * 50, now);
            creak.frequency.linearRampToValueAtTime(60, now + 0.1);
            creakGain.gain.setValueAtTime(0.12, now);
            creakGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            creak.connect(creakGain); creakGain.connect(audioCtx.destination);
            creak.start(); creak.stop(now + 0.1);
        }
    } catch (e) { }
}

let thunderState = { active: false, intensity: 0, timer: 0, nextThunder: 300 };
let stingTimer = 500;

// --- MINIMAP SYSTEM ---
let minimapOpen = false;
let exploredTiles = []; // Array of Sets, one per floor
const EXPLORE_RADIUS = 6; // Tiles around the player that get revealed

function playScarySting() {
    try {
        // Removed sound logic
        const type = Math.random();
        
        if (type < 0.5) { // Metallic scraping
        } else { // Low-frequency thud
        }
    } catch(e) {}
}

function playSanityWhisper() {
    try {
        // Removed sound logic
    } catch (e) {}
}

function playThunderSound() {
    try {
        // Removed sound logic
    } catch (e) { }
}

const player = {
    x: 0,
    y: 0,
    radius: 12,
    isExhausted: false,
    speed: 2.3,
    runSpeed: 5.0,
    angle: 0,
    stamina: 100,
    maxStamina: 100,
    keys: 0,
    footstepTimer: 0,
    pitch: 0,
    z: 0 // Vertikale Position für Treppen
};

let fadeAlpha = 0; // Für Treppen-Animation

// --- STATIC TEXTURES ---
// --- PROCEDURAL GENERATION ---
function createRandomFloor() {
    let grid = Array(MAP_HEIGHT).fill(0).map(() => Array(MAP_WIDTH).fill('1'));
    const rooms = [];

    // Konstanten für Flure definieren (werden in addDoor benötigt)
    const mainHallX = Math.floor(MAP_WIDTH / 2);
    const crossHallY = Math.floor(MAP_HEIGHT / 2);

    const addRoom = (x, y, w, h, label) => {
        // Bestimme Wand-Typ basierend auf dem Raum-Label für unterschiedliche Optik
        let wallChar = '1';
        if (label === "Küche") wallChar = 'K';
        else if (label.startsWith("Schlafzimmer")) wallChar = 'S';
        else if (label === "Wohnzimmer") wallChar = 'W';
        else if (label === "Bad") wallChar = 'B';

        // Markiere die Wände um den Raum herum mit dem spezifischen Charakter
        for (let iy = y - 1; iy <= y + h; iy++) {
            for (let ix = x - 1; ix <= x + w; ix++) {
                if (iy >= 0 && iy < MAP_HEIGHT && ix >= 0 && ix < MAP_WIDTH) {
                    if (grid[iy][ix] === '1') grid[iy][ix] = wallChar;
                }
            }
        }

        for (let iy = y; iy < y + h; iy++) {
            for (let ix = x; ix < x + w; ix++) {
                if (iy >= 0 && iy < MAP_HEIGHT && ix >= 0 && ix < MAP_WIDTH) {
                    grid[iy][ix] = '0';
                }
            }
        }
        let roomObj = { x, y, w, h, centerX: Math.floor(x + w / 2), centerY: Math.floor(y + h / 2), label };
        rooms.push(roomObj);
        return roomObj;
    };

    const addDoor = (x, y) => {
        if (y >= 1 && y < MAP_HEIGHT - 1 && x >= 1 && x < MAP_WIDTH - 1) {
            // Bloß keine Türen in den großen Gängen (Hauptachsen)
            if (x === mainHallX || y === crossHallY) return;

            // Sicherstellen, dass die Tür in einem Engpass sitzt (Wände links/rechts oder oben/unten)
            const isW = c => '1KSWB'.includes(c);
            const hasWallHorizontal = (isW(grid[y][x - 1]) && isW(grid[y][x + 1]));
            const hasWallVertical = (isW(grid[y - 1][x]) && isW(grid[y + 1][x]));

            // Wenn es kein 1-Kachel-breiter Durchgang ist, ist es kein kleiner Gang
            if (!hasWallHorizontal && !hasWallVertical) return;

            // Verhindere Türen direkt nebeneinander (Prüfung im 3x3 Bereich)
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (grid[y + dy][x + dx] === '2') return;
                }
            }
            grid[y][x] = '2';
        }
    };

    // 1. ZENTRALE HAUPTFLURE (1 Kachel breit)
    const mainHallYStart = 5;
    const mainHallYEnd = MAP_HEIGHT - 5;
    for (let y = mainHallYStart; y < mainHallYEnd; y++) {
        grid[y][mainHallX] = '0';
    }
    // Füge ein Raum-Objekt für den Hauptflur hinzu (für Spawn-Zwecke)
    rooms.push({ x: mainHallX, y: mainHallYStart, w: 1, h: mainHallYEnd - mainHallYStart, centerX: mainHallX, centerY: Math.floor(mainHallYStart + (mainHallYEnd - mainHallYStart) / 2), label: "Hauptflur" });

    const crossHallXStart = 5;
    const crossHallXEnd = MAP_WIDTH - 5;
    for (let x = crossHallXStart; x < crossHallXEnd; x++) {
        grid[crossHallY][x] = '0';
    }
    // Sicherstellen, dass die Kreuzung offen ist
    grid[crossHallY][mainHallX] = '0';

    // 2. HAUPTRÄUME (Kompakte Maße, direkt an die Flure angeschlossen)
    let roomX, roomY;

    // 2. HAUPTRÄUME (Kompakte Maße, mit Brückenkorridoren zum Flur)
    // Wohnzimmer
    roomX = mainHallX - 10 - Math.floor(Math.random() * 3);
    roomY = crossHallY - 4 + Math.floor(Math.random() * 4);
    addRoom(roomX, roomY, 5, 5, "Wohnzimmer");
    for (let x = roomX + 5; x < mainHallX; x++) grid[roomY + 2][x] = '0';
    addDoor(roomX + 5, roomY + 2); // Tür direkt am Zimmereingang

    // Küche
    roomX = mainHallX + 5 + Math.floor(Math.random() * 3);
    roomY = crossHallY - 4 + Math.floor(Math.random() * 4);
    addRoom(roomX, roomY, 4, 4, "Küche");
    for (let x = mainHallX + 1; x < roomX; x++) grid[roomY + 2][x] = '0';
    addDoor(roomX - 1, roomY + 2); // Tür direkt am Zimmereingang

    // Schlafzimmer 1
    roomX = mainHallX - 9 - Math.floor(Math.random() * 2);
    roomY = mainHallYStart + Math.floor(Math.random() * 3);
    addRoom(roomX, roomY, 4, 4, "Schlafzimmer 1");
    let s1ConnY = roomY + 2;
    for (let x = roomX + 4; x < mainHallX; x++) grid[s1ConnY][x] = '0';
    addDoor(roomX + 4, s1ConnY); // Tür direkt am Zimmereingang

    // Schlafzimmer 2
    roomX = mainHallX + 5 + Math.floor(Math.random() * 2);
    roomY = mainHallYStart + Math.floor(Math.random() * 3);
    addRoom(roomX, roomY, 4, 4, "Schlafzimmer 2");
    let s2ConnY = roomY + 2;
    for (let x = mainHallX + 1; x < roomX; x++) grid[s2ConnY][x] = '0';
    addDoor(roomX - 1, s2ConnY); // Tür direkt am Zimmereingang

    // Badezimmer
    roomX = crossHallXStart + Math.floor(Math.random() * 3);
    roomY = crossHallY + 5 + Math.floor(Math.random() * 2);
    addRoom(roomX, roomY, 3, 3, "Bad");
    let badConnY = crossHallY;
    for (let y = badConnY + 1; y < roomY; y++) grid[y][roomX + 1] = '0';
    addDoor(roomX + 1, roomY - 1); // Tür am Eingang des Bads

    // Vorratskammer / Abstellraum
    roomX = crossHallXEnd - 6 + Math.floor(Math.random() * 3);
    roomY = crossHallY + 5 + Math.floor(Math.random() * 2);
    addRoom(roomX, roomY, 3, 3, "Kammer");
    let kamConnY = crossHallY;
    for (let y = kamConnY + 1; y < roomY; y++) grid[y][roomX + 1] = '0';
    addDoor(roomX + 1, roomY - 1); // Tür am Eingang der Kammer

    // 3. ZUFÄLLIGE KLEINST-RÄUME (Kammern und Nischen, an die 1-Kachel-Flure andocken)
    const potentialConnectionPoints = [];
    // Entlang des vertikalen Hauptflurs mit Abstand (Step 4)
    for (let y = mainHallYStart + 2; y < mainHallYEnd - 2; y += 4) {
        if (grid[y][mainHallX] === '0') {
            if (grid[y][mainHallX - 1] === '1') potentialConnectionPoints.push({ x: mainHallX - 1, y: y, dir: 'left' });
            if (grid[y][mainHallX + 1] === '1') potentialConnectionPoints.push({ x: mainHallX + 1, y: y, dir: 'right' });
        }
    }
    // Entlang des horizontalen Querflurs mit Abstand (Step 4)
    for (let x = crossHallXStart + 2; x < crossHallXEnd - 2; x += 4) {
        if (grid[crossHallY][x] === '0') {
            if (grid[crossHallY - 1][x] === '1') potentialConnectionPoints.push({ x: x, y: crossHallY - 1, dir: 'up' });
            if (grid[crossHallY + 1][x] === '1') potentialConnectionPoints.push({ x: x, y: crossHallY + 1, dir: 'down' });
        }
    }

    for (let i = 0; i < 60; i++) { // Drastisch mehr Räume für eine riesige Map
        if (potentialConnectionPoints.length === 0) break;

        const connIdx = Math.floor(Math.random() * potentialConnectionPoints.length);
        const conn = potentialConnectionPoints.splice(connIdx, 1)[0]; // Punkt nach Verwendung entfernen

        let rw = 2 + Math.floor(Math.random() * 2); // 2-3 Kacheln
        let rh = 2 + Math.floor(Math.random() * 2); // 2-3 Kacheln
        let rx, ry;

        // Raum relativ zum Verbindungspunkt positionieren
        if (conn.dir === 'left') {
            rx = conn.x - rw;
            ry = conn.y - Math.floor(rh / 2);
        } else if (conn.dir === 'right') {
            rx = conn.x + 1;
            ry = conn.y - Math.floor(rh / 2);
        } else if (conn.dir === 'up') {
            rx = conn.x - Math.floor(rw / 2);
            ry = conn.y - rh;
        } else { // 'down'
            rx = conn.x - Math.floor(rw / 2);
            ry = conn.y + 1;
        }

        // Grundlegende Randprüfung
        if (rx > 1 && ry > 1 && rx + rw < MAP_WIDTH - 2 && ry + rh < MAP_HEIGHT - 2) {
            // Überlappungsprüfung mit bestehenden Räumen/Korridoren
            let overlap = false;
            for (let r of rooms) {
                // Puffer erhöht auf 2 Kacheln für sauberere Wände
                if (rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y) {
                    overlap = true;
                    break;
                }
            }

            if (!overlap) {
                let newRoom = addRoom(rx, ry, rw, rh, "Kammer");
                // Tür am Verbindungspunkt platzieren
                addDoor(conn.x, conn.y);

                // --- ANTI-SACKGASSEN-LOGIK (Loop-System) ---
                // Chance, eine Verbindung zu einem nahen Raum zu schaffen, wenn sie fast Wände teilen
                rooms.forEach(otherRoom => {
                    if (otherRoom === newRoom) return;

                    if (Math.random() < 0.6) { // Only attempt connection with 60% probability
                        let connected = false;

                        // Check for horizontal adjacency (newRoom left/right of otherRoom)
                        // Case 1: newRoom is to the right of otherRoom
                        if (newRoom.x === otherRoom.x + otherRoom.w + 1 || newRoom.x === otherRoom.x + otherRoom.w) { // Adjacent or 1 tile gap
                            let overlapYStart = Math.max(newRoom.y, otherRoom.y);
                            let overlapYEnd = Math.min(newRoom.y + newRoom.h, otherRoom.y + otherRoom.h);
                            if (overlapYEnd - overlapYStart >= 2) { // Need at least 2 tiles overlap for a door
                                let doorY = Math.floor(overlapYStart + (overlapYEnd - overlapYStart) / 2);
                                if (grid[doorY][newRoom.x - 1] === '1' && grid[doorY][newRoom.x] === '1') { // Ensure there's a wall to break
                                    grid[doorY][newRoom.x - 1] = '0'; // Break wall in otherRoom
                                    grid[doorY][newRoom.x] = '0'; // Break wall in newRoom
                                    addDoor(newRoom.x - 1, doorY);
                                    connected = true;
                                }
                            }
                        }
                        // Case 2: otherRoom is to the right of newRoom
                        else if (otherRoom.x === newRoom.x + newRoom.w + 1 || otherRoom.x === newRoom.x + newRoom.w) {
                            let overlapYStart = Math.max(newRoom.y, otherRoom.y);
                            let overlapYEnd = Math.min(newRoom.y + newRoom.h, otherRoom.y + otherRoom.h);
                            if (overlapYEnd - overlapYStart >= 2) {
                                let doorY = Math.floor(overlapYStart + (overlapYEnd - overlapYStart) / 2);
                                if (grid[doorY][otherRoom.x - 1] === '1' && grid[doorY][otherRoom.x] === '1') {
                                    grid[doorY][otherRoom.x - 1] = '0';
                                    grid[doorY][otherRoom.x] = '0';
                                    addDoor(otherRoom.x - 1, doorY);
                                    connected = true;
                                }
                            }
                        }

                        // Check for vertical adjacency (newRoom above/below otherRoom)
                        if (!connected) { // Only check vertical if not already connected horizontally
                            // Case 3: newRoom is below otherRoom
                            if (newRoom.y === otherRoom.y + otherRoom.h + 1 || newRoom.y === otherRoom.y + otherRoom.h) {
                                let overlapXStart = Math.max(newRoom.x, otherRoom.x);
                                let overlapXEnd = Math.min(newRoom.x + newRoom.w, otherRoom.x + otherRoom.w);
                                if (overlapXEnd - overlapXStart >= 2) {
                                    let doorX = Math.floor(overlapXStart + (overlapXEnd - overlapXStart) / 2);
                                    if (grid[newRoom.y - 1][doorX] === '1' && grid[newRoom.y][doorX] === '1') {
                                        grid[newRoom.y - 1][doorX] = '0';
                                        grid[newRoom.y][doorX] = '0';
                                        addDoor(doorX, newRoom.y - 1);
                                        connected = true;
                                    }
                                }
                            }
                            // Case 4: otherRoom is below newRoom
                            else if (otherRoom.y === newRoom.y + newRoom.h + 1 || otherRoom.y === newRoom.y + newRoom.h) {
                                let overlapXStart = Math.max(newRoom.x, otherRoom.x);
                                let overlapXEnd = Math.min(newRoom.x + newRoom.w, otherRoom.x + otherRoom.w);
                                if (overlapXEnd - overlapXStart >= 2) {
                                    let doorX = Math.floor(overlapXStart + (overlapXEnd - overlapXStart) / 2);
                                    if (grid[otherRoom.y - 1][doorX] === '1' && grid[otherRoom.y][doorX] === '1') {
                                        grid[otherRoom.y - 1][doorX] = '0';
                                        grid[otherRoom.y][doorX] = '0';
                                        addDoor(doorX, otherRoom.y - 1);
                                        connected = true;
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    return { grid: grid, rooms: rooms };
}

function initGameWorld() {
    maps = [];
    keysData = [];
    enemiesData = [];
    bloodSplattersData = [];
    doorsData = []; // doorsData bei jedem Start zurücksetzen
    torchesData = [];
    windowsData = [];

    // Reset Player Stats
    player.keys = 0;
    player.stamina = player.maxStamina;
    stairsCooldown = 0; // Sicherstellen, dass Treppen sofort benutzbar sind

    const settings = DIFFICULTY_SETTINGS[currentDifficulty];
    TOTAL_KEYS = settings.keys;
    const floorCount = settings.floors;

    for (let f = 0; f < floorCount; f++) {
        let gen = createRandomFloor();
        let grid = gen.grid;
        let rooms = gen.rooms;

        // Filtert Flure aus, damit Treppen und Startpunkte nur in "echten" Räumen landen
        let habitableRooms = rooms.filter(r => r.label !== "Hauptflur");

        if (f === 0) {
            let rStart = habitableRooms[0];
            player.x = rStart.centerX * TILE_SIZE;
            player.y = rStart.centerY * TILE_SIZE;
        }

        // Treppe nach oben (überall außer in der letzten Etage)
        if (f < floorCount - 1) {
            let rUp = habitableRooms[Math.floor(Math.random() * (habitableRooms.length - 2)) + 1];
            grid[rUp.y + Math.floor(Math.random() * rUp.h)][rUp.x + Math.floor(Math.random() * rUp.w)] = 'U';
        }

        // Treppe nach unten (überall außer in der ersten Etage)
        if (f > 0) {
            let rDown = habitableRooms[0];
            grid[rDown.y + Math.floor(Math.random() * rDown.h)][rDown.x + Math.floor(Math.random() * rDown.w)] = 'D';
        }

        // Ausgang (nur in der letzten Etage)
        if (f === floorCount - 1) {
            let rExit = habitableRooms[habitableRooms.length - 1];
            grid[rExit.centerY][rExit.centerX] = 'E';
        }

        let availableRooms = habitableRooms.slice(1, habitableRooms.length - 1);
        for (let i = availableRooms.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableRooms[i], availableRooms[j]] = [availableRooms[j], availableRooms[i]];
        }

        // Schlüssel gleichmäßig auf Etagen verteilen
        let numKeys = Math.ceil(TOTAL_KEYS / floorCount);
        if (f === floorCount - 1) numKeys = Math.max(1, TOTAL_KEYS - (numKeys * (floorCount - 1))); // Rest für letzte Etage (mindestens 1)

        let keysPlacedThisFloor = 0;
        // Mindestabstand zwischen Schlüsseln (ca. 18 Kacheln), um sie weit zu verteilen
        const MIN_KEY_DIST = TILE_SIZE * 18;

        for (let r of availableRooms) {
            if (keysPlacedThisFloor >= numKeys) break;

            let kx = r.centerX * TILE_SIZE;
            let ky = r.centerY * TILE_SIZE;

            // Prüfe Abstand zu bereits platzierten Schlüsseln auf DIESER Etage
            let tooClose = false;
            for (let i = keysData.length - keysPlacedThisFloor; i < keysData.length; i++) {
                let otherKey = keysData[i];
                if (Math.hypot(kx - otherKey.x, ky - otherKey.y) < MIN_KEY_DIST) {
                    tooClose = true;
                    break;
                }
            }

            if (!tooClose) {
                keysData.push({
                    x: kx + (Math.random() * 20 - 10),
                    y: ky + (Math.random() * 20 - 10),
                    floor: f,
                    collected: false
                });
                keysPlacedThisFloor++;
            }
        }

        // Fallback: Falls wegen des Abstands-Checks nicht genug Schlüssel platziert werden konnten
        if (keysPlacedThisFloor < numKeys) {
            for (let r of availableRooms) {
                if (keysPlacedThisFloor >= numKeys) break;
                let hasKey = keysData.some(k => k.floor === f && Math.abs(k.x - r.centerX * TILE_SIZE) < 10);
                if (!hasKey) {
                    keysData.push({ x: r.centerX * TILE_SIZE, y: r.centerY * TILE_SIZE, floor: f, collected: false });
                    keysPlacedThisFloor++;
                }
            }
        }

        let numEnemies = Math.round(settings.enemiesPerFloor);
        for (let e = 0; e < numEnemies; e++) {
            // Wähle einen zufälligen Raum, aber vermeide den Start- und Zielraum jeder Etage
            let r = null;
            let attempts = 0;
            const MIN_DIST = TILE_SIZE * 10; // Erhöht auf 10 Kacheln Sicherheitsabstand
            const spawnX = habitableRooms[0].centerX * TILE_SIZE;
            const spawnY = habitableRooms[0].centerY * TILE_SIZE;

            while (attempts < 100) { // Versuche, einen geeigneten Raum zu finden
                // Wähle einen zufälligen Raum, der nicht der Startraum ist
                let roomIdx = Math.floor(Math.random() * habitableRooms.length);
                let potentialRoom = habitableRooms[roomIdx];

                // Vermeide den Startraum des Spielers
                if (potentialRoom === habitableRooms[0]) {
                    attempts++;
                    continue;
                }

                let dist = Math.hypot(potentialRoom.centerX * TILE_SIZE - player.x, potentialRoom.centerY * TILE_SIZE - player.y);

                // Prüfe den Mindestabstand zum Spieler
                if (dist >= MIN_DIST) {
                    r = potentialRoom;
                    break;
                }
                attempts++;
            }
            // Fallback: Wenn nach vielen Versuchen kein geeigneter Raum gefunden wurde, nimm einen zufälligen, der nicht der Startraum ist.
            if (!r) {
                r = habitableRooms[Math.floor(Math.random() * habitableRooms.length)];
                if (r === habitableRooms[0] && habitableRooms.length > 1) r = habitableRooms[1]; // Nimm den nächsten, wenn es der Startraum ist
            }

            enemiesData.push({
                x: r.centerX * TILE_SIZE,
                y: r.centerY * TILE_SIZE,
                floor: f,
                baseSpeed: settings.speed + (f * 0.3),
                radius: 20 + f * 2,
                state: 'patrol',
                targetX: 0,
                targetY: 0,
                chaseTime: 0,
                wanderAngle: Math.random() * Math.PI * 2,
                lastKnownX: r.centerX * TILE_SIZE,
                lastKnownY: r.centerY * TILE_SIZE,
                chaseSoundTimer: 0
            });
        }

        // Türen für diese Etage in doorsData aufnehmen
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                if (grid[y][x] === '2') {
                    doorsData.push({ x: x, y: y, floor: f, state: 'closed', timer: 0 });
                }
            }
        }

        // Generate Torches
        for (let y = 1; y < MAP_HEIGHT - 1; y++) {
            for (let x = 1; x < MAP_WIDTH - 1; x++) {
                if (grid[y][x] === '1') {
                    let floorAdjacent = 0;
                    if (grid[y + 1][x] === '0') floorAdjacent++;
                    if (grid[y - 1][x] === '0') floorAdjacent++;
                    if (grid[y][x + 1] === '0') floorAdjacent++;
                    if (grid[y][x - 1] === '0') floorAdjacent++;

                    if (floorAdjacent > 0) {
                        if (Math.random() < 0.04) {
                            torchesData.push({
                                x: x * TILE_SIZE + TILE_SIZE / 2,
                                y: y * TILE_SIZE + TILE_SIZE / 2,
                                floor: f,
                                flickerCounter: Math.random() * 100
                            });
                        } else if (Math.random() < 0.008) {
                            // Only make it a window if it's not a torch
                            windowsData.push({
                                x: x,
                                y: y,
                                floor: f
                            });
                        }
                    }
                }
            }
        }

        maps[f] = grid;
    }

    currentFloor = 0;
    map = maps[currentFloor];

    // Initialisiere Fog of War für jede Etage
    exploredTiles = [];
    for (let f = 0; f < maps.length; f++) {
        exploredTiles.push(new Set());
    }

    updateMessage(); // Sofortige Aktualisierung der UI
}

let mouse = { x: (canvas ? canvas.width : 800) / 2, y: (canvas ? canvas.height : 600) / 2 };
let keysPressed = {};
let gameState = 'start';
let stairsCooldown = 0;

let jumpscareEffect = {
    active: false,
    timer: 0, // frames remaining for the effect
    maxTimer: 0, // total duration of the effect
    currentRedIntensity: 0 // 0 = no red, 1 = full red
};

// Schwierigkeits-Auswahl vor dem Start (Optional: Man könnte Buttons im HTML dafür haben)
// Hier setzen wir es beispielhaft über die URL oder einfach vor dem init:
function setDifficulty(level) {
    if (DIFFICULTY_SETTINGS[level]) {
        currentDifficulty = level;
        initGameWorld();
        const descEl = document.getElementById('difficulty-desc');
        if (descEl) {
            descEl.textContent = DIFFICULTY_SETTINGS[level].desc;

            // Animation neu triggern (durch Entfernen und Hinzufügen der Klasse)
            descEl.classList.remove('flicker-effect');
            void descEl.offsetWidth; // Force Reflow
            descEl.classList.add('flicker-effect');
        }
        const statsEl = document.getElementById('difficulty-stats');
        if (statsEl) {
            const s = DIFFICULTY_SETTINGS[level];
            const totalMonsters = s.floors * Math.round(s.enemiesPerFloor);
            statsEl.textContent = `Etagen: ${s.floors} | Monster: ${totalMonsters}`;
            statsEl.classList.remove('flicker-effect');
            void statsEl.offsetWidth;
            statsEl.classList.add('flicker-effect');
        }
    }
}

function spawnBloodSplatterNear(monster) {
    // Nur mit geringer Wahrscheinlichkeit spawnen (ca. alle 1-2 Sekunden während der Jagd)
    if (Math.random() > 0.02) return;

    const gx = Math.floor(monster.x / TILE_SIZE);
    const gy = Math.floor(monster.y / TILE_SIZE);

    // Prüfe die 4 Nachbarzellen auf Wände
    const directions = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
    for (let d of directions) {
        let nx = gx + d.x;
        let ny = gy + d.y;

        if (map[ny] && '1KSWB'.includes(map[ny][nx])) {
            bloodSplattersData.push({
                x: monster.x + d.x * (monster.radius + 2),
                y: monster.y + d.y * (monster.radius + 2),
                z: (Math.random() - 0.5) * TILE_SIZE * 0.5, // Zufällige Höhe an der Wand
                floor: monster.floor,
                size: 15 + Math.random() * 25,
                opacity: 0.8,
                timer: 1200 + Math.random() * 600 // Hält ca. 20-30 Sekunden
            });
            break; // Nur einen Spritzer pro Check
        }
    }
}

// Standard-Initialisierung
initGameWorld();

// Event-Listener für die Schwierigkeits-Buttons
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const level = btn.getAttribute('data-level');
        setDifficulty(level);
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Optional: Kurzes Feedback
        console.log(`Difficulty set to ${level}.`);
    });
});

const startBtn = document.getElementById('start-btn');
if (startBtn) {
    startBtn.addEventListener('click', () => {
        canvas.requestPointerLock();
        // Hide start screen content, show warning
        document.getElementById('start-content').classList.add('hidden');
        const statsEl = document.getElementById('difficulty-stats');
        if (statsEl) statsEl.classList.add('hidden');
        
        let warningContent = document.getElementById('warning-content');
        if (warningContent) {
            warningContent.classList.remove('hidden');
            warningContent.classList.add('flicker-effect');
        }

        // 3 Sekunden Warnung anzeigen, dann den Ladebalken starten
        setTimeout(async () => {
            if (warningContent) warningContent.classList.add('hidden');

            let loadingContent = document.getElementById('loading-content');
            loadingContent.classList.remove('hidden');
            loadingContent.classList.add('fade-in');

            // Echtzeit-Laden der Texturen
            let loadingBar = document.getElementById('loading-bar');
            let loadingText = document.querySelector('#loading-content p');

            // Sequentielles Laden für realistischen Ladebalken
            for (let i = 0; i < assetList.length; i++) {
                const asset = assetList[i];
                
                // Künstliche Verzögerung, damit man den Balken sieht (150-350ms pro Asset)
                await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
                
                // Das tatsächliche Asset laden
                await extractPixels(asset.img, asset.setter);
                
                let progress = ((i + 1) / assetList.length) * 100;
                loadingBar.style.width = progress + '%';
                
                if (progress < 40) loadingText.textContent = "summoning demons...";
                else if (progress < 80) loadingText.textContent = "extracting textures...";
                else loadingText.textContent = "loading mechanics...";
            }

            // Kurzer Moment bei 100%
            await new Promise(resolve => setTimeout(resolve, 600));

            let screen = document.getElementById('start-screen');
            if (screen) {
                screen.style.transition = 'opacity 1s ease';
                screen.style.opacity = '0';
            }
            gameState = 'playing';
            showHudMinimap();
            showFloorPopup(0);
            updateMessage();
            setTimeout(() => screen && screen.classList.add('hidden'), 1000);
        }, 3000);
    });
}

function updateMessage() {
    let msg = document.getElementById('message');
    let missing = TOTAL_KEYS - player.keys;
    msg.style.color = '#ffffff';
    msg.classList.remove('hidden');

    if (missing === 0) {
        msg.textContent = `Find the exit in the attic!`;
        msg.style.color = '#00ff00';
    } else {
        msg.textContent = `Find the keys! ${missing} remaining`;
    }
}
function showFloorPopup(floorIndex) {
    let names = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Attic"];
    // Wenn es mehr als 5 Etagen gibt, generiere Namen dynamisch
    if (floorIndex === maps.length - 1) names[floorIndex] = "Attic";
    else if (!names[floorIndex]) names[floorIndex] = (floorIndex) + ". Floor";

    let popup = document.getElementById('floor-popup');
    popup.textContent = names[floorIndex];
    popup.classList.remove('hidden');
    popup.style.transition = 'none';
    popup.style.opacity = '1';

    void popup.offsetWidth;

    popup.style.transition = 'opacity 2s ease-out';
    popup.style.opacity = '0';

    setTimeout(() => {
        if (popup.style.opacity === '0') popup.classList.add('hidden');
    }, 2000);
}

let jumpscareFrame = 0;

function drawDeathMonster() {
    const dCanvas = document.getElementById('deathMonsterCanvas');
    if (!dCanvas) return;
    dCanvas.width = 600;
    dCanvas.height = 600;
    const dCtx = dCanvas.getContext('2d');

    // Pre-render static noise once
    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = 600;
    noiseCanvas.height = 600;
    const noiseCtx = noiseCanvas.getContext('2d');
    for (let i = 0; i < 1000; i++) {
        noiseCtx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
        noiseCtx.fillRect(Math.random() * 600, Math.random() * 600, 2, 2);
    }

    function animateDeathMonster() {
        let cx = 300;
        let cy = 300;
        let time = Date.now() * 0.002;

        dCtx.fillStyle = '#000';
        dCtx.fillRect(0, 0, 600, 600);
        dCtx.drawImage(noiseCanvas, 0, 0); // Draw pre-rendered noise

        // ... (rest of monster drawing) ...


        dCtx.save();
        dCtx.translate(cx + Math.sin(time) * 5, cy + Math.cos(time * 0.8) * 5); // Leichtes Schweben
        dCtx.scale(0.6, 0.6);

        // Schatten hinter dem Monster
        dCtx.shadowBlur = 50;
        dCtx.shadowColor = 'rgba(255, 0, 0, 0.3)';

        // Gesicht (Deformiert)
        dCtx.fillStyle = '#c0c0c0';
        dCtx.beginPath();
        dCtx.ellipse(0, -50, 320, 480, Math.sin(time) * 0.02, 0, Math.PI * 2);
        dCtx.fill();
        dCtx.shadowBlur = 0;

        // Augenhöhlen
        dCtx.fillStyle = '#000';
        dCtx.beginPath();
        dCtx.ellipse(-140, -180, 90, 140, -0.1, 0, Math.PI * 2);
        dCtx.ellipse(140, -180, 90, 140, 0.1, 0, Math.PI * 2);
        dCtx.fill();

        // Glühende Augen (Pulsierend)
        let pulse = 20 + Math.sin(time * 5) * 10;
        dCtx.fillStyle = '#ff0000';
        dCtx.shadowBlur = pulse * 2;
        dCtx.shadowColor = '#ff0000';
        dCtx.beginPath();
        dCtx.arc(-140, -180, pulse, 0, Math.PI * 2);
        dCtx.arc(140, -180, pulse, 0, Math.PI * 2);
        dCtx.fill();
        dCtx.shadowBlur = 0;

        // Mund (Tiefes Schwarz)
        dCtx.fillStyle = '#050000';
        dCtx.beginPath();
        dCtx.ellipse(0, 220, 200, 280, 0, 0, Math.PI * 2);
        dCtx.fill();

        // Zähne (Blutig & Unregelmäßig)
        for (let i = 0; i < 15; i++) {
            dCtx.fillStyle = i % 3 === 0 ? '#600000' : '#e0e0e0';
            let tx = -185 + i * 26; // 15 Zähne
            let dx = (tx + 12) / 200; // Normierte Position auf der X-Achse der Ellipse
            if (dx < -1) dx = -1;
            if (dx > 1) dx = 1;

            // Exakte Y-Position auf dem Rand der Ellipse berechnen
            let dyOffset = 280 * Math.sqrt(1 - dx * dx);

            let tyTop = 220 - dyOffset + 10;
            let tyBottom = 220 + dyOffset - 10;

            // Obere Zahnreihe
            dCtx.beginPath();
            dCtx.moveTo(tx, tyTop - 20);
            dCtx.lineTo(tx + 12, tyTop + 70 + Math.random() * 40);
            dCtx.lineTo(tx + 25, tyTop - 20);
            dCtx.fill();

            // Untere Zahnreihe
            dCtx.beginPath();
            dCtx.moveTo(tx, tyBottom + 20);
            dCtx.lineTo(tx + 12, tyBottom - 70 - Math.random() * 40);
            dCtx.lineTo(tx + 25, tyBottom + 20);
            dCtx.fill();
        }
        dCtx.restore();

        // Rote Vignette über den Canvas
        let grad = dCtx.createRadialGradient(300, 300, 100, 300, 300, 350);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(100,0,0,0.5)');
        dCtx.fillStyle = grad;
        dCtx.fillRect(0, 0, 600, 600);

        if (gameState === 'gameover') requestAnimationFrame(animateDeathMonster);
    }
    animateDeathMonster(); // Start the animation loop
}

function triggerJumpscare() {
    if (gameState === 'gameover') return;
    gameState = 'gameover';
    hideHudMinimap();

    if (document.pointerLockElement) document.exitPointerLock();
    document.getElementById('jumpscare').classList.remove('hidden');

    try {
        // Removed sound logic
    } catch (e) { }

    jumpscareFrame = 0;
    let splatters = [];

    const jsCanvas = document.getElementById('jumpscareCanvas');
    if (!jsCanvas) return;
    const jCtx = jsCanvas.getContext('2d');

    // Setze die Größe nur einmalig fest, um Einfrieren zu verhindern
    jsCanvas.width = window.innerWidth;
    jsCanvas.height = window.innerHeight;

    function animate() {
        jumpscareFrame++;

        let cx = jsCanvas.width / 2;
        let cy = jsCanvas.height / 2;

        // Screen shake
        let shakeIntensity = jumpscareFrame * 1.5;
        let shakeX = (Math.random() - 0.5) * shakeIntensity;
        let shakeY = (Math.random() - 0.5) * shakeIntensity;

        // Scale factor (rushes forward)
        let scale = 1 + (jumpscareFrame * 0.04);
        if (scale > 3.5) scale = 3.5;

        jCtx.fillStyle = '#000';
        jCtx.fillRect(0, 0, jsCanvas.width, jsCanvas.height);

        jCtx.save();
        jCtx.translate(cx + shakeX, cy + shakeY);
        jCtx.scale(scale, scale);

        // Face base
        jCtx.fillStyle = '#e6e6e6';
        jCtx.beginPath();
        jCtx.ellipse(0, -50, 350, 450, 0, 0, Math.PI * 2);
        jCtx.fill();

        // Eyes
        jCtx.fillStyle = '#000';
        jCtx.beginPath();
        jCtx.ellipse(-150, -200, 80, 120, -0.2, 0, Math.PI * 2);
        jCtx.ellipse(150, -200, 80, 120, 0.2, 0, Math.PI * 2);
        jCtx.fill();

        // Glowing red pupils (grow over time)
        let pupilSize = 15 + (jumpscareFrame * 0.4);
        if (pupilSize > 40) pupilSize = 40;
        jCtx.fillStyle = '#ff0000';
        jCtx.shadowBlur = 40 + jumpscareFrame;
        jCtx.shadowColor = '#ff0000';
        jCtx.beginPath();
        jCtx.arc(-150, -200, pupilSize, 0, Math.PI * 2);
        jCtx.arc(150, -200, pupilSize, 0, Math.PI * 2);
        jCtx.fill();
        jCtx.shadowBlur = 0;

        // Mouth (opens wider over time)
        let mouthHeight = 180 + (jumpscareFrame * 2.5);
        if (mouthHeight > 320) mouthHeight = 320;
        jCtx.fillStyle = '#050000';
        jCtx.beginPath();
        jCtx.ellipse(0, 200, 250, mouthHeight, 0, 0, Math.PI * 2);
        jCtx.fill();

        // Teeth
        jCtx.fillStyle = '#800000';
        for (let i = 0; i < 16; i++) {
            jCtx.beginPath();
            jCtx.moveTo(-230 + i * 30, 200 - mouthHeight + 10);
            jCtx.lineTo(-215 + i * 30, 200 - mouthHeight + 80 + Math.random() * 30);
            jCtx.lineTo(-200 + i * 30, 200 - mouthHeight + 10);
            jCtx.fill();

            jCtx.beginPath();
            jCtx.moveTo(-230 + i * 30, 200 + mouthHeight - 10);
            jCtx.lineTo(-215 + i * 30, 200 + mouthHeight - 80 - Math.random() * 30);
            jCtx.lineTo(-200 + i * 30, 200 + mouthHeight - 10);
            jCtx.fill();
        }

        jCtx.restore();

        // Add new blood splatters progressively
        if (jumpscareFrame % 2 === 0) {
            for (let i = 0; i < 4; i++) {
                splatters.push({
                    x: Math.random() * jsCanvas.width,
                    y: Math.random() * jsCanvas.height,
                    r: Math.random() * 80 + 20
                });
            }
        }

        // Draw splatters
        jCtx.fillStyle = '#800000';
        splatters.forEach(s => {
            jCtx.beginPath();
            jCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            jCtx.fill();
        });

        if (jumpscareFrame < 35) {
            requestAnimationFrame(animate);
        } else {
            document.getElementById('jumpscare').classList.add('hidden');
            document.getElementById('game-over').classList.remove('hidden');
            drawDeathMonster();
        }
    }

    requestAnimationFrame(animate);
}

setTimeout(updateMessage, 100);

window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'f') {
        if (document.pointerLockElement === canvas) {
            document.exitPointerLock();
        } else {
            canvas.requestPointerLock();
        }
    }
    // Minimap Toggle mit 'M'
    if (e.key.toLowerCase() === 'm' && gameState === 'playing') {
        toggleMinimap();
    }
    keysPressed[e.key.toLowerCase()] = true; if (e.key === 'Shift') keysPressed['shift'] = true;
});
window.addEventListener('keyup', (e) => { keysPressed[e.key.toLowerCase()] = false; if (e.key === 'Shift') keysPressed['shift'] = false; });
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas && gameState === 'playing') {
        player.angle += (e.movementX || 0) * 0.004; // Erhöhte horizontale Sensitivität
        // Limit leicht angepasst für bessere Stabilität und POV-Gefühl
        player.pitch = Math.max(-0.75, Math.min(0.75, player.pitch - (e.movementY || 0) * 0.005)); // Erhöhte vertikale Sensitivität
    }
});

// Klick-Listener, um die Steuerung zu reaktivieren, falls sie verloren geht
canvas.addEventListener('click', () => {
    if (gameState === 'playing' && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
    }
});

function castRay(ox, oy, angle, maxDist) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let x = ox, y = oy;
    for (let i = 0; i < maxDist; i += 4) {
        x += dx * 4;
        y += dy * 4;
        const gx = Math.floor(x / TILE_SIZE);
        const gy = Math.floor(y / TILE_SIZE);
        if (gy >= 0 && gy < map.length && gx >= 0 && gx < map[0].length) {
            let t = map[gy][gx];
            if (t === '1' || t === '2' || t === '4' || t === '5' || 'KSWB'.includes(t)) {
                let bx = x, by = y;
                while (Math.floor(bx / TILE_SIZE) === gx && Math.floor(by / TILE_SIZE) === gy) {
                    bx -= dx;
                    by -= dy;
                }
                return { x: bx + dx * 30, y: by + dy * 30 };
            }
        } else {
            return { x, y };
        }
    }
    return { x, y };
}

function hasLineOfSight(x1, y1, x2, y2) {
    if (!map || !map.length) return false;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    let x = x1, y = y1;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    for (let i = 0; i < dist; i += 5) {
        x += dx * 5;
        y += dy * 5;
        const gx = Math.floor(x / TILE_SIZE);
        const gy = Math.floor(y / TILE_SIZE);
        let t = map[gy] ? map[gy][gx] : null;
        // Monster können nicht durch Wände, Türen oder Treppenaufbauten sehen
        if ('12UDKSWB'.includes(t)) return false;
    }
    return true;
}

function handleCollision(entity) {
    const buffer = entity.radius;
    const gx = Math.floor(entity.x / TILE_SIZE);
    const gy = Math.floor(entity.y / TILE_SIZE);

    for (let y = gy - 1; y <= gy + 1; y++) {
        for (let x = gx - 1; x <= gx + 1; x++) {
            let t = map[y] ? map[y][x] : null;
            if (t === '1' || t === '2' || t === '4' || t === '5' || 'KSWB'.includes(t)) {
                const wallX = x * TILE_SIZE;
                const wallY = y * TILE_SIZE;

                const closestX = Math.max(wallX, Math.min(entity.x, wallX + TILE_SIZE));
                const closestY = Math.max(wallY, Math.min(entity.y, wallY + TILE_SIZE));

                const distanceX = entity.x - closestX;
                const distanceY = entity.y - closestY;
                const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

                if (distanceSquared < buffer * buffer) {
                    const distance = Math.sqrt(distanceSquared);
                    if (distance > 0) {
                        const overlap = buffer - distance;
                        entity.x += (distanceX / distance) * overlap;
                        entity.y += (distanceY / distance) * overlap;
                    }
                }
            }
        }
    }
}

function checkStairs() {
    const gx = Math.floor(player.x / TILE_SIZE);
    const gy = Math.floor(player.y / TILE_SIZE);
    const tile = (maps[currentFloor] && maps[currentFloor][gy]) ? maps[currentFloor][gy][gx] : null;

    let onStairTile = (tile === 'U' || tile === 'D');

    if (onStairTile && stairsCooldown === 0 && keysPressed['e']) { // Spieler ist auf Treppe und drückt 'E'
        if (player.z === 0) { // Nur snappen, wenn noch nicht geklettert wird
            player.x = gx * TILE_SIZE + TILE_SIZE / 2;
            player.y = gy * TILE_SIZE + TILE_SIZE / 2;
        }

        if (tile === 'U' && currentFloor < maps.length - 1) { // Treppe nach oben
            player.z += 1.2; // Speed of ascent
            player.pitch = -0.1; // Look slightly up during ascent
            fadeAlpha = Math.min(1, player.z / (TILE_SIZE * 0.8)); // Fade out animation

            if (player.z >= TILE_SIZE) {
                // Etagenwechsel
                currentFloor++;
                map = maps[currentFloor];
                spawnAtTile('D'); // Spawn at the 'down' stair on the new floor
                player.z = 0; // Reset for new floor
                player.pitch = 0; // Reset pitch after transition
                showFloorPopup(currentFloor);
                keysPressed['e'] = false; // 'E' Taste konsumieren, um Mehrfachauslösung zu verhindern
            }
        } else if (tile === 'D' && currentFloor > 0) { // Treppe nach unten
            player.z -= 1.2; // Speed of descent
            player.pitch = 0.1; // Look slightly down during descent
            fadeAlpha = Math.min(1, Math.abs(player.z) / (TILE_SIZE * 0.8)); // Fade out animation

            if (player.z <= -TILE_SIZE) {
                currentFloor--;
                map = maps[currentFloor];
                spawnAtTile('U'); // Spawn at the 'up' stair on the new floor
                player.z = 0; // Reset for new floor
                player.pitch = 0; // Reset pitch after transition
                showFloorPopup(currentFloor);
                keysPressed['e'] = false; // 'E' Taste konsumieren, um Mehrfachauslösung zu verhindern
            }
        }
    } else {
        // Sanftes Zurücksetzen der Z-Position, wenn nicht auf Treppe
        player.z *= 0.8;
        fadeAlpha *= 0.8;
        if (Math.abs(player.z) < 0.1) player.z = 0;
    }
}

function spawnAtTile(targetTile) {
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === targetTile) {
                player.x = x * TILE_SIZE + TILE_SIZE / 2;
                player.y = y * TILE_SIZE + TILE_SIZE / 2;
                stairsCooldown = 60;
                return;
            }
        }
    }
}

function update() {
    if (gameState !== 'playing') return;

    // --- EXPLORATION TRACKING ---
    updateExploration();
    // --- TASCHENLAMPEN-FLACKERN ---
    if (!window._flashlightFlicker) window._flashlightFlicker = 1.0;
    // Subtiles Flackern: meistens stabil, gelegentlich kurzes Zucken
    if (Math.random() < 0.03) {
        window._flashlightFlicker = 0.7 + Math.random() * 0.2; // kurzer Einbruch
    } else {
        window._flashlightFlicker += (1.0 - window._flashlightFlicker) * 0.15; // sanft zurück zu 1.0
    }
    window._flashlightFlicker = Math.min(1.0, window._flashlightFlicker + (Math.random() - 0.5) * 0.02);

    // --- DONNER & BLITZ SYSTEM ---
    if (thunderState.timer > 0) {
        thunderState.timer--;
        thunderState.intensity *= 0.88; // Schneller Abfall des Blitzes
    } else {
        thunderState.active = false;
        thunderState.intensity = 0;
    }
    thunderState.nextThunder--;
    if (thunderState.nextThunder <= 0) {
        thunderState.active = true;
        thunderState.intensity = 0.6 + Math.random() * 0.4;
        thunderState.timer = 8 + Math.floor(Math.random() * 12); // 8-20 Frames
        thunderState.nextThunder = 400 + Math.floor(Math.random() * 1200); // 7-27 Sekunden bis zum nächsten
        playThunderSound();
    }

    // --- RANDOM AMBIENT STINGS ---
    stingTimer--;
    if (stingTimer <= 0) {
        playScarySting();
        stingTimer = 600 + Math.random() * 1800; // Alle 10-40 Sekunden
    }

    // Blutspritzer altern, verblassen und entfernen
    for (let i = bloodSplattersData.length - 1; i >= 0; i--) {
        let b = bloodSplattersData[i];
        b.timer--;
        if (b.timer < 150) b.opacity = b.timer / 150;
        if (b.timer <= 0) bloodSplattersData.splice(i, 1);
    }

    // Update jumpscare effect
    if (jumpscareEffect.active) {
        jumpscareEffect.timer--;

        const progress = 1 - (jumpscareEffect.timer / jumpscareEffect.maxTimer); // 0 to 1
        // Use sine wave to smoothly ramp up and down
        const effectPhase = Math.sin(progress * Math.PI); // Peaks at 0.5, goes from 0 to 1 to 0

        // Red intensity in and then out (max 0.6 opacity)
        jumpscareEffect.currentRedIntensity = 0.6 * effectPhase;

        if (jumpscareEffect.timer <= 0) {
            jumpscareEffect.active = false;
            jumpscareEffect.currentRedIntensity = 0;
        }
    }

    const DOOR_OPEN_TIME = 180; // 3 Sekunden bei 60 FPS
    const DOOR_INTERACTION_DISTANCE = TILE_SIZE * 1.5; // Spieler muss innerhalb von 1.5 Kacheln sein

    let interactionPromptMessage = null; // Speichert die Nachricht für den Interaktions-Prompt
    let currentFloorDoors = doorsData.filter(d => d.floor === currentFloor);

    // --- 1. TREPPEN-CHECK (Priorität vor Türen) ---
    const pgx = Math.floor(player.x / TILE_SIZE);
    const pgy = Math.floor(player.y / TILE_SIZE);
    const currentTile = (map[pgy] && map[pgy][pgx]) ? map[pgy][pgx] : null;
    const floorNames = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Attic"];

    if ((currentTile === 'U' || currentTile === 'D') && stairsCooldown === 0) {
        if (currentTile === 'U') {
            let nextFloorName = currentFloor + 1 === maps.length - 1 ? "Attic" : (currentFloor + 1) + ". Floor";
            interactionPromptMessage = `press E: Climb to ${nextFloorName}`;
        } else {
            let nextFloorName = currentFloor - 1 === 0 ? "Ground Floor" : (currentFloor - 1) + ". Floor";
            interactionPromptMessage = `press E: Descend to ${nextFloorName}`;
        }
    }
    checkStairs();

    if (stairsCooldown > 0) stairsCooldown--; // Keep only one decrement per frame

    // --- 2. TÜR-INTERAKTION ---
    // Tür-Interaktion und -Zustand verwalten
    currentFloorDoors.forEach(door => {
        const doorCenterX = door.x * TILE_SIZE + TILE_SIZE / 2;
        const doorCenterY = door.y * TILE_SIZE + TILE_SIZE / 2;
        const distToDoor = Math.hypot(player.x - doorCenterX, player.y - doorCenterY);

        // Performance-Optimierung: Nur berechnen, wenn der Spieler oder ein Gegner in der Nähe ist
        if (distToDoor > TILE_SIZE * 5 && door.state === 'closed') return;

        // Prüfen, ob jemand in der Tür steht (Spieler oder Monster)
        const isBlocked = distToDoor < TILE_SIZE * 0.6 ||
            enemiesData.some(e => e.floor === door.floor &&
                Math.hypot(e.x - doorCenterX, e.y - doorCenterY) < TILE_SIZE * 0.6);

        if (door.state === 'closed') {
            if (distToDoor < DOOR_INTERACTION_DISTANCE) { // Spieler ist in Reichweite einer geschlossenen Tür
                let angleToDoor = Math.atan2(doorCenterY - player.y, doorCenterX - player.x);
                let angleDiff = Math.abs(Math.atan2(Math.sin(angleToDoor - player.angle), Math.cos(angleToDoor - player.angle)));
                if (angleDiff < Math.PI / 4) { // Prüfen ob Spieler die Tür ansieht (innerhalb von 45 Grad)
                    interactionPromptMessage = "press E to open";
                    if (keysPressed['e']) { // Manuelles Öffnen mit E
                        door.state = 'open';
                        door.timer = DOOR_OPEN_TIME;
                        maps[door.floor][door.y][door.x] = '0'; // Tür in der richtigen Etage öffnen
                        // keysPressed['e'] = false; // ENTFERNT: Nicht konsumieren, damit Treppenhalten funktioniert
                    }
                }
            }
        } else if (door.state === 'open') {
            if (door.timer > 0) {
                door.timer--;
            } else if (!isBlocked) { // Tür schließt nur, wenn niemand darin steht
                door.state = 'closed';
                maps[door.floor][door.y][door.x] = '2'; // Tür in der richtigen Etage schließen
            }
        }
    });

    // --- 3. PICKUP & EXIT ---
    updatePickupsAndExit();

    // --- 4. BEWEGUNG & KOLLISION ---

    // EMF-Reader Logik (Gefahrenmeter)
    let minEnemyDist = Infinity;
    enemiesData.forEach(e => {
        if (e.floor === currentFloor) {
            let d = Math.hypot(player.x - e.x, player.y - e.y);
            if (d < minEnemyDist) minEnemyDist = d;
        }
    });

    const emfSegments = document.getElementsByClassName('emf-segment');
    if (emfSegments.length > 0) { // EMF-Reader Logik (Gefahrenmeter)
        let emfIntensity = 0;
        if (minEnemyDist < 1000) { // Erkennungsradius 1000 Einheiten
            emfIntensity = 1 - Math.max(0, (minEnemyDist - 150) / 850);
            emfIntensity = Math.min(1, emfIntensity);
        }

        let activeSegments = Math.ceil(emfIntensity * 5);
        const colors = ['#00ff00', '#00ff00', '#ffff00', '#ffff00', '#ff0000'];
        for (let i = 0; i < 5; i++) {
            if (i < activeSegments) {
                emfSegments[i].style.backgroundColor = colors[i];
                emfSegments[i].style.boxShadow = `0 0 10px ${colors[i]}`;
            } else {
                emfSegments[i].style.backgroundColor = '#111';
                emfSegments[i].style.boxShadow = 'none';
            }
        }
    }

    // Interaktions-Hinweis am unteren Bildschirmrand anzeigen
    const promptEl = document.getElementById('interaction-prompt');
    if (promptEl && interactionPromptMessage) {
        promptEl.textContent = interactionPromptMessage;
        promptEl.classList.remove('hidden');
    } else if (promptEl) {
        promptEl.classList.add('hidden');
    }

    let speed = player.speed;
    let isMoving = keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'];

    // Stamina-Logik: Verhindert "Stottern" bei leerer Ausdauer
    if (keysPressed['shift'] && isMoving && player.stamina > 0 && !player.isExhausted) {
        speed = player.runSpeed;
        player.stamina = Math.max(0, player.stamina - 0.8);
        player.footstepTimer -= 2.5;
        if (player.stamina <= 0) player.isExhausted = true;
    } else {
        player.stamina = Math.min(player.maxStamina, player.stamina + 0.4);
        if (isMoving) player.footstepTimer -= 1.5;
        if (player.stamina >= player.maxStamina) player.isExhausted = false; // Erst wieder rennen, wenn voll regeneriert
    }

    if (isMoving && player.footstepTimer <= 0) {
        playFootstepSound();
        player.footstepTimer = 25;
    }

    const staminaBarFill = document.getElementById('stamina-bar-fill');
    const staminaText = document.getElementById('stamina-percentage-text');

    if (staminaBarFill) {
        let staminaPercent = (player.stamina / player.maxStamina * 100);
        staminaBarFill.style.width = staminaPercent + '%';

        if (staminaText) {
            staminaText.textContent = `Stamina: ${Math.round(staminaPercent)}%`;
        }

        if (player.isExhausted) {
            staminaBarFill.style.backgroundColor = '#ff0000'; // Rot bei Erschöpfung
            staminaBarFill.style.boxShadow = '0 0 15px #ff0000';
            staminaBarFill.style.animation = 'pulseRed 1s infinite alternate';
        } else {
            staminaBarFill.style.animation = 'none';
            if (staminaPercent > 70) {
                staminaBarFill.style.backgroundColor = '#ffffff'; // Voll
            } else if (staminaPercent > 30) {
                staminaBarFill.style.backgroundColor = '#ffff00'; // Mittel
            } else {
                staminaBarFill.style.backgroundColor = '#ffa500'; // Niedrig
            }
            staminaBarFill.style.boxShadow = '0 0 5px ' + staminaBarFill.style.backgroundColor;
        }
    }

    // Only allow horizontal movement if not actively climbing/descending stairs
    // A small threshold for player.z is used to allow slight z-movement without blocking horizontal movement
    if (Math.abs(player.z) < 1) {
        let moveX = 0; let moveY = 0;
        if (keysPressed['w']) { moveX += Math.cos(player.angle) * speed; moveY += Math.sin(player.angle) * speed; }
        if (keysPressed['s']) { moveX -= Math.cos(player.angle) * speed; moveY -= Math.sin(player.angle) * speed; }
        if (keysPressed['a']) { moveX += Math.cos(player.angle - Math.PI / 2) * speed; moveY += Math.sin(player.angle - Math.PI / 2) * speed; }
        if (keysPressed['d']) { moveX += Math.cos(player.angle + Math.PI / 2) * speed; moveY += Math.sin(player.angle + Math.PI / 2) * speed; }

        if (moveX !== 0 || moveY !== 0) { // Check if there's any movement
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            moveX = (moveX / length) * speed;
            moveY = (moveY / length) * speed;
        }

        player.x += moveX;
        player.y += moveY;
        handleCollision(player);
    } else {
        // If climbing, still handle collision for the current stair tile to prevent going through walls
        handleCollision(player);
    }

    keysData.forEach(k => {
        if (!k.collected && k.floor === currentFloor && Math.hypot(player.x - k.x, player.y - k.y) < player.radius + 20) {
            k.collected = true;
            player.keys++;
            updateMessage();
        }
    });

    if (player.keys >= TOTAL_KEYS && currentFloor === maps.length - 1) {
        if (map[pgy] && (map[pgy][pgx] === 'E' || map[pgy][pgx] === '0')) {
            const distToExit = Math.hypot(player.x - (pgx * TILE_SIZE + 30), player.y - (pgy * TILE_SIZE + 30));
            if (distToExit < 40 && map[pgy][pgx] === 'E') {
                gameState = 'victory';
                hideHudMinimap();
                if (document.pointerLockElement) document.exitPointerLock();
                document.getElementById('victory').classList.remove('hidden');
            }
        }
    }

    enemiesData.forEach(e => {
        const settings = DIFFICULTY_SETTINGS[currentDifficulty];
        if (e.floor !== currentFloor) return;

        // Wenn das Monster aktiv ist, hinterlässt es Spuren
        if (e.state === 'chase' || e.state === 'search') {
            spawnBloodSplatterNear(e);
        }

        // Gegner öffnet Türen jetzt über das neue doorsData System
        const egx = Math.floor(e.x / TILE_SIZE);
        const egy = Math.floor(e.y / TILE_SIZE);

        for (let i = 0; i < currentFloorDoors.length; i++) {
            let door = currentFloorDoors[i];
            if (door.state === 'closed' && Math.abs(door.x - egx) <= 1 && Math.abs(door.y - egy) <= 1) {
                door.state = 'open';
                door.timer = 180;
                maps[door.floor][door.y][door.x] = '0';
            }
        }

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        let canSee = hasLineOfSight(e.x, e.y, player.x, player.y);

        // Sicherheitscheck für atan2 (vermeidet NaN bei identischer Position)
        let angleToPlayer = distToPlayer > 0.1 ? Math.atan2(player.y - e.y, player.x - e.x) : e.wanderAngle;
        let angleDiff = Math.abs(Math.atan2(Math.sin(e.wanderAngle - angleToPlayer), Math.cos(e.wanderAngle - angleToPlayer)));

        let inFOV = (angleDiff < Math.PI / 2.2);
        if (e.state === 'chase') inFOV = true;

        if (canSee && (distToPlayer < 100 || (distToPlayer < settings.visionRange && inFOV))) {
            e.state = 'chase';
            if (!jumpscareEffect.active) { // Trigger effect only if not already active
                jumpscareEffect.active = true;
                jumpscareEffect.timer = 90; // 1.5 seconds
                jumpscareEffect.maxTimer = 90;

                // Removed sight sound
            }
            e.lastKnownX = player.x;
            e.lastKnownY = player.y;
        } else if (e.state === 'chase') {
            // Bei niedriger Intelligenz (Leicht) vergisst das Monster sofort
            if (settings.intelligence > 0) {
                e.state = 'search';
            } else {
                e.state = 'patrol';
            }
        } else if (e.state === 'search' && distToPlayer > settings.searchDist) {
            e.state = 'patrol';
        }

        let currentBaseSpeed = e.baseSpeed + (player.keys * 0.2);

        if (e.state === 'chase') {
            e.wanderAngle = angleToPlayer;
            e.chaseTime += 1 / 60;
            // Beschleunigung begrenzt: Das Monster wird schneller, aber nur bis zu einem fairen Maximum
            let activeSpeed = Math.min(currentBaseSpeed + (e.chaseTime * 0.3), currentBaseSpeed + 2);

            // Jagd-Sound Logik: Intervalle verkürzen sich, wenn das Monster näher kommt
            e.chaseSoundTimer--;
            if (e.chaseSoundTimer <= 0) {
                e.chaseSoundTimer = 20 + Math.floor(distToPlayer / 20); // Schneller bei Annäherung
            }

            e.x += Math.cos(angleToPlayer) * activeSpeed;
            e.y += Math.sin(angleToPlayer) * activeSpeed;

            if (distToPlayer < player.radius + e.radius) {
                triggerJumpscare();
            }
            handleCollision(e);
        } else if (e.state === 'search') {
            e.chaseTime = 0; // Beschleunigung zurücksetzen
            let distToLastKnown = Math.hypot(e.lastKnownX - e.x, e.lastKnownY - e.y);

            if (distToLastKnown > 10) {
                // Gehe zum Ort, an dem der Spieler zuletzt gesehen wurde
                let angleToPoint = Math.atan2(e.lastKnownY - e.y, e.lastKnownX - e.x);
                e.wanderAngle = angleToPoint;
                e.x += Math.cos(angleToPoint) * currentBaseSpeed;
                e.y += Math.sin(angleToPoint) * currentBaseSpeed;
                handleCollision(e);
            } else {
                // Am Ziel angekommen und nichts gefunden? Zurück zum Patrouillieren
                e.state = 'patrol';
            }
        } else {
            e.chaseTime = 0;

            if (Math.random() < 0.02) e.wanderAngle += (Math.random() - 0.5);

            let moveSpeed = currentBaseSpeed * 0.4;
            let prevX = e.x;
            let prevY = e.y;

            e.x += Math.cos(e.wanderAngle) * moveSpeed;
            e.y += Math.sin(e.wanderAngle) * moveSpeed;

            handleCollision(e);

            if (Math.hypot(e.x - prevX, e.y - prevY) < moveSpeed * 0.5) {
                e.wanderAngle += Math.PI / 2 + (Math.random() * Math.PI / 2);
            }
        }
    });
}

function updateSanity() {
    let currentSanityDrain = player.sanityDrainRate;
    let monsterProximityDrain = 0;

    enemiesData.forEach(e => {
        if (e.floor === currentFloor) {
            let d = Math.hypot(player.x - e.x, player.y - e.y);
            if (d < 500) monsterProximityDrain += (1 - d / 500) * 0.2;
            if (e.state === 'chase') monsterProximityDrain += 0.1;
        }
    });
    
    if (window._flashlightFlicker < 0.8) currentSanityDrain += 0.05;
    currentSanityDrain += monsterProximityDrain;

    if (monsterProximityDrain === 0 && !player.isHiding) {
        player.sanity = Math.min(player.maxSanity, player.sanity + player.sanityRegenRate);
    } else {
        player.sanity = Math.max(0, player.sanity - currentSanityDrain);
    }

    player.sanityEffectIntensity = 1 - (player.sanity / player.maxSanity);
    if (player.sanity <= 0 && gameState === 'playing') triggerJumpscare();
}

function updatePickupsAndExit() {
    const pgx = Math.floor(player.x / TILE_SIZE);
    const pgy = Math.floor(player.y / TILE_SIZE);

    keysData.forEach(k => {
        if (!k.collected && k.floor === currentFloor && Math.hypot(player.x - k.x, player.y - k.y) < player.radius + 20) {
            k.collected = true;
            player.keys++;
            updateMessage();
        }
    });

    if (player.keys >= TOTAL_KEYS && currentFloor === maps.length - 1) {
        if (map[pgy] && map[pgy][pgx] === 'E') {
            const distToExit = Math.hypot(player.x - (pgx * TILE_SIZE + 30), player.y - (pgy * TILE_SIZE + 30));
            if (distToExit < 40) {
                gameState = 'victory';
                if (document.pointerLockElement) document.exitPointerLock();
                document.getElementById('victory').classList.remove('hidden');
            }
        }
    }
}

function drawFirstPersonOverlay() {
    let isMoving = keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'];
    let time = Date.now() / 1000;
    let shakeY = Math.sin(time * 6.5) * (isMoving ? 5 : 1.5);
    let shakeX = Math.cos(time * 3.3) * (isMoving ? 4 : 1);
    let flicker = window._flashlightFlicker || 1.0;

    // --- 1. Realistischer runder Lichtkegel (Vignette) ---
    // Der Lichtkegel bewegt sich synchron mit der Taschenlampe
    // Das Licht bleibt nun im Zentrum des Bildschirms (da wo man hinschaut)
    let gazeCenterY = canvas.height / 2 + shakeY * 1.5;
    let gazeCenterX = canvas.width / 2 + canvas.width * 0.02 + shakeX * 2.0;

    // Basis-Vignette (hartes Abfallen am Rand wie bei LED-Taschenlampen) - Jetzt deutlich dunkler außen
    let vig = ctx.createRadialGradient(gazeCenterX, gazeCenterY, canvas.height * 0.12, gazeCenterX, gazeCenterY, canvas.height * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(0.25, `rgba(0,0,0,${0.05 * flicker})`);
    vig.addColorStop(0.4, `rgba(0,0,0,${0.35 * flicker})`);
    vig.addColorStop(0.55, 'rgba(0,0,0,0.92)');
    vig.addColorStop(0.75, 'rgba(0,0,0,1)');
    vig.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Innerer LED-Ring (Hotspot)
    let hotSpot = ctx.createRadialGradient(gazeCenterX, gazeCenterY, 0, gazeCenterX, gazeCenterY, canvas.height * 0.25);
    hotSpot.addColorStop(0, `rgba(255, 250, 240, ${0.12 * flicker})`);
    hotSpot.addColorStop(0.7, `rgba(255, 245, 220, ${0.05 * flicker})`);
    hotSpot.addColorStop(0.8, `rgba(255, 240, 200, 0)`);
    ctx.fillStyle = hotSpot;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Streulicht-Ringe (Lens Flare / Reflektor-Artefakte)
    ctx.strokeStyle = `rgba(255, 250, 230, ${0.02 * flicker})`;
    ctx.lineWidth = canvas.height * 0.02;
    ctx.beginPath();
    ctx.arc(gazeCenterX, gazeCenterY, canvas.height * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 245, 220, ${0.015 * flicker})`;
    ctx.lineWidth = canvas.height * 0.05;
    ctx.beginPath();

    ctx.globalAlpha = 1.0;

    // --- 2. Realistisches Taschenlampen-Modell ---
    ctx.save();

    let fx = canvas.width * 0.72 + shakeX;
    // Die Taschenlampe bewegt sich leicht vertikal mit dem Blickwinkel mit
    let fy = canvas.height + shakeY - 10 - (player.pitch * 40);

    ctx.translate(fx, fy);

    let modelScale = (canvas.height / 600) * 1.25;
    ctx.scale(modelScale, modelScale);

    // Die Taschenlampe neigt sich jetzt passend zur Blickrichtung (player.pitch)
    let tiltAngle = -0.12 + Math.sin(time * 1.5) * 0.008 - (player.pitch * 0.5); 
    ctx.rotate(tiltAngle);

    // --- Unterarm mit Ärmel ---
    let armGrad = ctx.createLinearGradient(40, 120, 130, 400);
    armGrad.addColorStop(0, '#1a3350');
    armGrad.addColorStop(0.5, '#152a42');
    armGrad.addColorStop(1, '#0f1e30');
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(15, 95);
    ctx.quadraticCurveTo(-10, 180, 80, 400);
    ctx.lineTo(155, 400);
    ctx.quadraticCurveTo(110, 200, 55, 95);
    ctx.closePath();
    ctx.fill();

    // Ärmel-Falten
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(25, 130); ctx.quadraticCurveTo(50, 145, 50, 130);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, 160); ctx.quadraticCurveTo(60, 170, 55, 155);
    ctx.stroke();

    // --- Hand (Hautfarbe mit Fingern) ---
    let skinGrad = ctx.createRadialGradient(30, 75, 5, 30, 75, 40);
    skinGrad.addColorStop(0, '#f5c9a0');
    skinGrad.addColorStop(1, '#d4a574');
    ctx.fillStyle = skinGrad;

    // Handfläche (hinter dem Griff)
    ctx.beginPath();
    ctx.ellipse(28, 78, 28, 22, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Finger um den Griff (4 Finger vorne sichtbar)
    ctx.fillStyle = '#e8b888';
    for (let f = 0; f < 4; f++) {
        let fingerY = 40 + f * 18;
        let fingerCurve = Math.sin(f * 0.7 + 0.3) * 3;
        ctx.beginPath();
        ctx.ellipse(-2 + fingerCurve, fingerY, 7, 9, -0.2, 0, Math.PI * 2);
        ctx.fill();
        // Knöchel-Detail
        ctx.strokeStyle = 'rgba(180, 140, 100, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(-2 + fingerCurve, fingerY - 2, 4, 0, Math.PI);
        ctx.stroke();
    }

    // Daumen (seitlich)
    ctx.fillStyle = '#e8b888';
    ctx.beginPath();
    ctx.ellipse(48, 55, 8, 14, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // --- Taschenlampen-Griff (zylindrisch, metallisch) ---
    let handleGrad = ctx.createLinearGradient(0, 20, 42, 20);
    handleGrad.addColorStop(0, '#1a1a1a');
    handleGrad.addColorStop(0.2, '#333');
    handleGrad.addColorStop(0.4, '#2a2a2a');
    handleGrad.addColorStop(0.6, '#444');
    handleGrad.addColorStop(0.8, '#2a2a2a');
    handleGrad.addColorStop(1, '#111');
    ctx.fillStyle = handleGrad;

    // Gerundeter Griff
    ctx.beginPath();
    ctx.moveTo(3, 20);
    ctx.lineTo(3, 115);
    ctx.quadraticCurveTo(3, 125, 10, 125);
    ctx.lineTo(32, 125);
    ctx.quadraticCurveTo(39, 125, 39, 115);
    ctx.lineTo(39, 20);
    ctx.closePath();
    ctx.fill();

    // Gummi-Grip Rillen
    ctx.strokeStyle = 'rgba(80, 80, 80, 0.5)';
    ctx.lineWidth = 1.5;
    for (let gy = 35; gy < 115; gy += 6) {
        ctx.beginPath();
        ctx.moveTo(5, gy);
        ctx.lineTo(37, gy);
        ctx.stroke();
    }

    // Schalter (kleiner Knopf an der Seite)
    ctx.fillStyle = '#555';
    ctx.fillRect(39, 50, 5, 12);
    ctx.fillStyle = '#777';
    ctx.fillRect(40, 52, 3, 8);

    // --- Taschenlampen-Kopf (konisch, Reflektor) ---
    let headGrad = ctx.createLinearGradient(-15, -50, 55, -50);
    headGrad.addColorStop(0, '#0d0d0d');
    headGrad.addColorStop(0.3, '#2a2a2a');
    headGrad.addColorStop(0.5, '#333');
    headGrad.addColorStop(0.7, '#2a2a2a');
    headGrad.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(2, 22);
    ctx.lineTo(-12, -35);
    ctx.quadraticCurveTo(-14, -42, -8, -44);
    ctx.lineTo(50, -44);
    ctx.quadraticCurveTo(56, -42, 54, -35);
    ctx.lineTo(40, 22);
    ctx.closePath();
    ctx.fill();

    // Metallischer Ring zwischen Kopf und Griff
    ctx.fillStyle = '#555';
    ctx.fillRect(-1, 18, 44, 5);
    let ringHighlight = ctx.createLinearGradient(-1, 18, 43, 18);
    ringHighlight.addColorStop(0, 'rgba(100,100,100,0)');
    ringHighlight.addColorStop(0.4, 'rgba(180,180,180,0.3)');
    ringHighlight.addColorStop(0.6, 'rgba(180,180,180,0.3)');
    ringHighlight.addColorStop(1, 'rgba(100,100,100,0)');
    ctx.fillStyle = ringHighlight;
    ctx.fillRect(-1, 18, 44, 5);

    // Reflektor-Ring am Kopfende
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -40);
    ctx.lineTo(52, -40);
    ctx.stroke();

    // --- Linse (leuchtend, mit Flicker-Effekt) ---
    let lensFlicker = flicker;

    // Linsen-Reflektor (innere Verspiegelung)
    let reflectorGrad = ctx.createLinearGradient(-6, -44, 48, -44);
    reflectorGrad.addColorStop(0, `rgba(200, 190, 170, ${0.3 * lensFlicker})`);
    reflectorGrad.addColorStop(0.5, `rgba(255, 250, 235, ${0.6 * lensFlicker})`);
    reflectorGrad.addColorStop(1, `rgba(200, 190, 170, ${0.3 * lensFlicker})`);
    ctx.fillStyle = reflectorGrad;
    ctx.fillRect(-8, -47, 58, 6);

    // Leuchtende Linse
    ctx.fillStyle = `rgba(255, 252, 240, ${0.95 * lensFlicker})`;
    ctx.fillRect(-8, -47, 58, 4);

    // Glow um die Linse
    let lensGlow = ctx.createRadialGradient(21, -47, 0, 21, -47, 100);
    lensGlow.addColorStop(0, `rgba(255, 250, 230, ${0.8 * lensFlicker})`);
    lensGlow.addColorStop(0.15, `rgba(255, 245, 210, ${0.5 * lensFlicker})`);
    lensGlow.addColorStop(0.4, `rgba(255, 240, 200, ${0.15 * lensFlicker})`);
    lensGlow.addColorStop(1, 'rgba(255, 235, 180, 0)');
    ctx.fillStyle = lensGlow;
    ctx.fillRect(-80, -150, 200, 140);

    // Lens flare (kleine Lichtreflexe)
    ctx.globalAlpha = 0.3 * lensFlicker;
    ctx.fillStyle = '#fffde8';
    ctx.beginPath(); ctx.arc(-5, -48, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(47, -48, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

function render() {
    // Nur rendern, wenn der Context existiert und wir nicht im Jumpscare sind
    if (!ctx) return;

    if (gameState === 'gameover') {
        canvas.style.filter = 'none'; // Filter zurücksetzen bei Game Over
        return;
    }

    // --- ORIENTIERUNGSLOSIGKEIT (Blur-Effekt) ---
    // Erzeugt eine dynamische Unschärfe basierend auf der Intensität des roten Rand-Effekts
    const blurValue = jumpscareEffect.currentRedIntensity * 5; // Ergibt max ca. 3px Blur bei 0.6 Intensität
    canvas.style.filter = blurValue > 0.1 ? `blur(${blurValue}px)` : 'none';

    let time = Date.now() / 1000;

    const pAngle = gameState === 'start' ? 0.05 : player.angle; // Leicht schräger Blick im Startbildschirm
    const pX = gameState === 'start' ? 1.5 * TILE_SIZE : player.x;
    const pY = gameState === 'start' ? 1.5 * TILE_SIZE : player.y;

    const aspectRatio = width / height;
    const FOV = 2 * Math.atan(aspectRatio / 2);
    const dirX = Math.cos(pAngle);
    const dirY = Math.sin(pAngle);
    const planeX = -dirY * (aspectRatio / 2);
    const planeY = dirX * (aspectRatio / 2);
    const pitchOffset = player.pitch * (height * 0.5);

    if (gameState === 'playing' && floorPixels !== null && ceilingPixels !== null) {
        // --- TEXTURIERTER BODEN & DECKE (Performance-Buffer) ---
        if (!cachedScreenImg || cachedScreenImg.width !== width || cachedScreenImg.height !== height) {
            cachedScreenImg = ctx.createImageData(width, height);
            cachedPixels = new Uint32Array(cachedScreenImg.data.buffer);
        }
        const screenImg = cachedScreenImg;
        const pixels = cachedPixels;

        // Loop über den gesamten Bildschirm für Decke UND Boden
        for (let y = 0; y < height; y++) {
            const isFloor = y > height / 2 + pitchOffset;
            // p ist der vertikale Abstand zum Horizont
            const p = isFloor ? (y - height / 2 - pitchOffset) : (height / 2 + pitchOffset - y);
            
            // Sicherheits-Check: p darf nicht 0 oder negativ sein
            if (p < 0.1) continue;

            // Vertikale Distanz synchronisieren (muss exakt zur wallHeight-Logik passen)
            const rowDistance = (height / 2) / p;

            // Welt-Position der Zeile berechnen
            const floorStepX = (rowDistance * planeX * 2) / width;
            const floorStepY = (rowDistance * planeY * 2) / width;

            let floorX = (pX / TILE_SIZE) + rowDistance * (dirX - planeX);
            let floorY = (pY / TILE_SIZE) + rowDistance * (dirY - planeY);

            // Shading einmal pro Zeile berechnen (spart Millionen Kalkulationen)
            const shade = 1 - Math.min(1, rowDistance / 4);

            for (let x = 0; x < width; x++) {
                const tx = ((floorX * 1024) | 0) & 1023;
                const ty = ((floorY * 1024) | 0) & 1023;
                const texPos = ty * 1024 + tx;
                let color = isFloor ? floorPixels[texPos] : ceilingPixels[texPos];

                floorX += floorStepX;
                floorY += floorStepY;

                if (shade < 1) {
                    const r = ((color & 0xFF) * shade) | 0;
                    const g = (((color >> 8) & 0xFF) * shade) | 0;
                    const b = (((color >> 16) & 0xFF) * shade) | 0;
                    color = (color & 0xFF000000) | (b << 16) | (g << 8) | r;
                }

                pixels[y * width + x] = color;
            }
        }
        ctx.putImageData(screenImg, 0, 0);
    } else {
        // Fallback falls Texturen noch laden oder fehlgeschlagen sind
        ctx.fillStyle = '#111'; // Boden
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#050505'; // Decke
        ctx.fillRect(0, 0, width, height / 2 + pitchOffset);
    }
    const STRIP_WIDTH = 2; // Höhere Auflösung
    const NUM_RAYS = Math.ceil(width / STRIP_WIDTH); // Changed from 2 to 3 for performance

    if (!zBuffer || zBuffer.length !== NUM_RAYS) {
        zBuffer = new Float64Array(NUM_RAYS);
    }
    zBuffer.fill(Infinity);

    for (let i = 0; i < NUM_RAYS; i++) {
        // camX ist die Position auf der Bildebene von -1 (links) bis 1 (rechts)
        const camX = (2 * i) / (NUM_RAYS - 1) - 1;
        const dx = dirX + planeX * camX;
        const dy = dirY + planeY * camX;

        let renderMap = gameState === 'start' ? startScreenMap : map;
        let mapW = gameState === 'start' ? renderMap[0].length : MAP_WIDTH;
        let mapH = gameState === 'start' ? renderMap.length : MAP_HEIGHT;

        let mapX = (pX / TILE_SIZE) | 0;
        let mapY = (pY / TILE_SIZE) | 0;

        let deltaDistX = Math.abs(1 / dx);
        let deltaDistY = Math.abs(1 / dy);

        let stepX, stepY;
        let sideDistX, sideDistY;

        if (dx < 0) {
            stepX = -1;
            sideDistX = ((pX / TILE_SIZE) - mapX) * deltaDistX;
        } else {
            stepX = 1;
            sideDistX = (mapX + 1.0 - (pX / TILE_SIZE)) * deltaDistX;
        }

        if (dy < 0) {
            stepY = -1;
            sideDistY = ((pY / TILE_SIZE) - mapY) * deltaDistY;
        } else {
            stepY = 1;
            sideDistY = (mapY + 1.0 - (pY / TILE_SIZE)) * deltaDistY;
        }

        let hit = false;
        let side = 0;
        let hitTile = null;

        while (!hit && mapX >= 0 && mapX < mapW && mapY >= 0 && mapY < mapH) {
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                mapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                mapY += stepY;
                side = 1;
            }
            if (renderMap[mapY] && renderMap[mapY][mapX] !== '0') {
                let t = renderMap[mapY][mapX];
                if (t === '1' || t === '2' || t === '4' || t === '5' || t === 'U' || t === 'D' || t === 'E' || 'KSWB'.includes(t)) {
                    hit = true;
                    hitTile = t;
                }
            }
        }

        if (hit) {
            let perpWallDist;
            // Use pX and pY instead of player.x/y to ensure consistency with the start screen and floor transitions
            if (side === 0) perpWallDist = (mapX - (pX / TILE_SIZE) + (1 - stepX) / 2) / dx;
            else perpWallDist = (mapY - (pY / TILE_SIZE) + (1 - stepY) / 2) / dy;

            if (perpWallDist < 0.1) perpWallDist = 0.1;
            let dist = perpWallDist * TILE_SIZE;
            zBuffer[i] = dist;

            // Perspektivisch korrekte Wandhöhe: Wand füllt bei Distanz 1 exakt den Bildschirm
            let wallHeight = canvas.height / perpWallDist;

            // Die Z-Position des Spielers verschiebt die vertikale Zeichnung der Wand
            let zOffset = (player.z / TILE_SIZE) * wallHeight;
            let wallTop = (canvas.height / 2) - (wallHeight / 2) + pitchOffset + zOffset;
            let wallBottom = wallTop + wallHeight;

            let wallX;
            if (side === 0) wallX = (pY / TILE_SIZE) + perpWallDist * dy;
            else wallX = (pX / TILE_SIZE) + perpWallDist * dx;
            wallX -= Math.floor(wallX);

            // Textur-Auswahl mit Fallback-Check
            let tex;
            let roomColor = null;
            let hasPoster = false;
            let baseWallTint = null; // Neue Variable für generische Wandtönung

            if (hitTile === '1' || 'KSWB'.includes(hitTile)) {
                if (wallImg.complete && wallImg.width > 0) tex = wallImg;
                else { tex = wallTexFallback; }

                if (hitTile === 'K') roomColor = 'rgba(0, 120, 0, 0.45)'; // Küche: Moosgrün
                if (hitTile === 'S') { roomColor = 'rgba(0, 0, 150, 0.45)'; hasPoster = true; } // Schlafzimmer: Nachtblau
                if (hitTile === 'W') roomColor = 'rgba(150, 0, 0, 0.45)'; // Wohnzimmer: Blutrot
                if (hitTile === 'B') roomColor = 'rgba(180, 160, 0, 0.5)'; // Bad: Krankhaftes Gelb

                // Generische Wandtönung für '1' und andere Raumwände, falls keine spezifische Raumfarbe vorhanden ist
                if (!roomColor) {
                    let hue = (mapX * 47 + mapY * 31 + (currentFloor * 90)) % 360; // Größere Farbsprünge
                    let saturation = 45;
                    let lightness = 35;
                    baseWallTint = `hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`; // Kräftigerer Tint
                }
            } else if (hitTile === 'U' || hitTile === 'D') {
                if (stairsImg.complete && stairsImg.width > 0) tex = stairsImg;
                else { tex = stairsTexFallback; }
            } else if (hitTile === '2') {
                if (doorImg.complete && doorImg.width > 0) tex = doorImg;
                else { tex = doorTexFallback; }
            } else {
                tex = wallTexFallback; // Standard-Fallback für unbekannte Kacheln
            }

            // Grafik-Fix: Clamp texX um Out-of-Bounds Fehler und schwarze Linien zu vermeiden
            let texX = Math.min(tex.width - 1, Math.floor(wallX * tex.width));

            if (side === 0 && dx > 0) texX = tex.width - texX - 1;
            if (side === 1 && dy < 0) texX = tex.width - texX - 1;

            // Stark reduziertes Umgebungslicht für echtes Horror-Feeling
            let ambientLight = (gameState === 'start') ? 0.2 : 0.01; // Fast pechschwarz
            let shade = Math.pow(Math.max(0, 1 - (dist / 300)), 2) * ambientLight;

            // Oberflächen-Varianz für mehr Realismus (Schmutz-Simulation)
            let surfaceNoise = Math.sin(mapX * 13 + mapY * 7 + wallX * 5) * 0.03;
            shade = Math.max(0, shade + surfaceNoise);

            // RICHTUNGS-SHADING: Hilft extrem bei der Orientierung in Ecken
            if (side === 1) shade *= 0.6; // Seitliche Wände dunkler
            else if (dx < 0) shade *= 0.85; // West-Wände leicht abdunkeln

            // --- REALISTISCHE TASCHENLAMPE mit rundem Kegel ---
            let flicker = window._flashlightFlicker || 1.0;
            let centerDistX = Math.abs(i - NUM_RAYS / 2);
            
            // Optimierte vertikale Lichtberechnung: Prüft die Distanz zum nächsten Punkt der Wand
            let screenCenterY = canvas.height / 2;
            let closestWallY = Math.max(wallTop, Math.min(screenCenterY, wallBottom));
            let centerDistY = Math.abs(closestWallY - screenCenterY) / canvas.height * NUM_RAYS;
            
            // Euklidische Distanz für runden Lichtkegel
            let centerDist2D = Math.sqrt(centerDistX * centerDistX + centerDistY * centerDistY);

            // Warmer Farbton-Multiplikator (wird beim Zeichnen angewendet)
            let warmR = 1.0, warmG = 1.0, warmB = 1.0;

            // Taschenlampe immer an (auch im Startbildschirm)
            if (true) {
                let flashlightCone = NUM_RAYS / 2.3;
                let flashlightFactor = Math.max(0, 1 - (centerDist2D / flashlightCone));
                if (flashlightFactor > 0 && dist < 650) {
                    // Realistischer Hotspot mit inverse-square-artigem Abfall
                    let distFalloff = 1 / (1 + (dist / 120) * (dist / 120)) * 2.5;
                    let beamIntensity = Math.pow(flashlightFactor, 2.5) * distFalloff * 4.2 * flicker; // Hellerer Kern
                    shade += beamIntensity;

                    // Breitere Corona (Streulicht)
                    let coronaFactor2D = Math.max(0, 1 - (centerDist2D / (NUM_RAYS / 1.5)));
                    shade += Math.pow(coronaFactor2D, 2) * (1 - (dist / 450)) * 0.3 * flicker; // Dunklerer Rand

                    // Warmer Farbton im Lichtkegel (stärker im Zentrum)
                    let warmth = flashlightFactor * 0.15;
                    warmR = 1.0 + warmth * 0.3;
                    warmG = 1.0 + warmth * 0.15;
                    warmB = 1.0 - warmth * 0.2;
                }
            }

            // --- FENSTER & DONNER-BELEUCHTUNG ---
            let isWindow = false;
            for (let w = 0; w < windowsData.length; w++) {
                if (windowsData[w].floor === currentFloor && windowsData[w].x === mapX && windowsData[w].y === mapY) {
                    isWindow = true;
                    break;
                }
            }
            if (isWindow && thunderState.active) {
                // Blitz erhellt Fenster-Kacheln dramatisch
                shade += thunderState.intensity * 1.5;
            } else if (isWindow) {
                // Fenster haben schwaches bläuliches Mondlicht
                shade += 0.03;
                warmB = Math.min(warmB + 0.1, 1.2);
            }

            // Fackeln beleuchten nahe Wände
            for (let ti = 0; ti < torchesData.length; ti++) {
                let torch = torchesData[ti];
                if (torch.floor !== currentFloor) continue;
                let wallWorldX = mapX * TILE_SIZE + wallX * TILE_SIZE;
                let wallWorldY = mapY * TILE_SIZE + TILE_SIZE / 2;
                let torchDist = Math.hypot(wallWorldX - torch.x, wallWorldY - torch.y);
                if (torchDist < TILE_SIZE * 3) {
                    let torchLight = Math.pow(1 - torchDist / (TILE_SIZE * 3), 2) * 0.3;
                    torch.flickerCounter += 0.07;
                    torchLight *= 0.8 + Math.sin(torch.flickerCounter) * 0.2;
                    shade += torchLight;
                    warmR = Math.min(warmR + torchLight * 0.5, 1.4);
                    warmG = Math.min(warmG + torchLight * 0.2, 1.2);
                }
            }

            // Fog effect: blend with black based on distance
            let fogAmount = Math.min(1, dist / 450); // Sichtweite drastisch reduziert
            shade = shade * (1 - fogAmount);
            
            // Sicherheit: Wand nur zeichnen, wenn sie existiert. Shade wird auf 0 geklammert statt abzubrechen.
            if (wallHeight > 0.1) {
                ctx.globalAlpha = Math.max(0, Math.min(1, shade));
                if (hitTile !== 'E') {
                    // Zeichne Wand (mit Clipping-Schutz)
                    ctx.drawImage(tex, texX, 0, 1, tex.height, i * STRIP_WIDTH, wallTop, STRIP_WIDTH + 0.5, wallHeight);

                    // Warmer Licht-Tint über die Textur (additiv)
                    if (warmR > 1.01 || warmG > 1.01 || warmB < 0.99) {
                        let tintAlpha = Math.min(0.15, shade * 0.12);
                        let tR = Math.floor(Math.min(255, (warmR - 1) * 400));
                        let tG = Math.floor(Math.min(255, (warmG - 1) * 300));
                        ctx.globalAlpha = tintAlpha;
                        ctx.fillStyle = `rgb(${tR}, ${tG}, 0)`;
                        ctx.fillRect(i * STRIP_WIDTH, wallTop, STRIP_WIDTH + 0.6, wallHeight);
                        ctx.globalAlpha = Math.min(1, shade);
                    }

                    // Fenster-Rendering: hellere Fläche mit Rahmen
                    if (isWindow && wallX > 0.15 && wallX < 0.85) {
                        let winTop = wallTop + wallHeight * 0.15;
                        let winH = wallHeight * 0.55;
                        // Hintergrund: dunkles Blau (Nachthimmel)
                        let skyBrightness = thunderState.active ? Math.floor(40 + thunderState.intensity * 180) : 15;
                        ctx.fillStyle = `rgb(${Math.floor(skyBrightness * 0.3)}, ${Math.floor(skyBrightness * 0.35)}, ${skyBrightness})`;
                        ctx.fillRect(i * STRIP_WIDTH, winTop, STRIP_WIDTH + 0.6, winH);
                        // Rahmen
                        if (wallX > 0.14 && wallX < 0.18 || wallX > 0.82 && wallX < 0.86 || wallX > 0.48 && wallX < 0.52) {
                            ctx.fillStyle = 'rgba(20, 15, 10, 0.9)';
                            ctx.fillRect(i * STRIP_WIDTH, winTop, STRIP_WIDTH + 0.6, winH);
                        }
                    }

                    // --- RAUM-DETAILS (Farben & Poster) / Generische Wandfarbe ---
                    if ((roomColor || baseWallTint) && !isWindow) {
                        const baseAlpha = roomColor ? parseFloat(roomColor.split(',')[3]) : 0.4;
                        ctx.globalAlpha = baseAlpha * Math.min(1, shade * 1.2);
                        ctx.fillStyle = roomColor || baseWallTint;
                        ctx.fillRect(i * STRIP_WIDTH, wallTop, STRIP_WIDTH + 0.6, wallHeight);
                    }
                    ctx.globalAlpha = Math.min(1, shade);

                    // Poster-Effekt
                    if (hasPoster && wallX > 0.4 && wallX < 0.6) {
                        ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
                        ctx.fillRect(i * STRIP_WIDTH, wallTop + wallHeight * 0.25, STRIP_WIDTH + 0.6, wallHeight * 0.4);
                        ctx.fillStyle = 'rgba(120, 0, 0, 0.6)';
                        ctx.fillRect(i * STRIP_WIDTH, wallTop + wallHeight * 0.4, STRIP_WIDTH + 0.6, wallHeight * 0.05);
                    }

                    // Fußleiste und Deckenkante
                    ctx.fillStyle = 'rgba(10, 5, 5, 0.7)';
                    ctx.fillRect(i * STRIP_WIDTH, wallTop + wallHeight * 0.88, STRIP_WIDTH + 0.6, wallHeight * 0.12);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                    ctx.fillRect(i * STRIP_WIDTH, wallTop, STRIP_WIDTH + 0.6, wallHeight * 0.06);
                } else {
                    let color = hitTile === 'E' ? '#115511' : '#444';
                    ctx.fillStyle = color;
                    ctx.fillRect(i * STRIP_WIDTH, wallTop, STRIP_WIDTH, wallHeight);
                }
                ctx.lineWidth = 1;
                ctx.globalAlpha = 1.0;
            }
        }
    }

    // Draw Sprites
    let sprites = [];
    if (gameState === 'start') {
        // Monster-Augen lauern bei der zweiten Tür rechts
        sprites.push({ x: 8.25 * TILE_SIZE, y: 1.95 * TILE_SIZE, type: 'start_eyes', radius: 10 });
    } else {
        enemiesData.forEach(e => { if (e.floor === currentFloor) sprites.push({ x: e.x, y: e.y, type: 'enemy', radius: e.radius, state: e.state }) });
        keysData.forEach(k => { if (!k.collected && k.floor === currentFloor) sprites.push({ x: k.x, y: k.y, type: 'key', radius: 10 }) });
        torchesData.forEach(t => { if (t.floor === currentFloor) sprites.push({ x: t.x, y: t.y, type: 'torch', radius: 10, flick: t.flickerCounter }) });
        bloodSplattersData.forEach(b => { if (b.floor === currentFloor) sprites.push({ x: b.x, y: b.y, z: b.z, type: 'blood', radius: b.size, opacity: b.opacity }) });
    }

    sprites.forEach(s => {
        let dx = s.x - pX;
        let dy = s.y - pY;

        // Manhattan-Distanz Quick-Culling (Performance)
        if (Math.abs(dx) + Math.abs(dy) > 4000) {
            s.dist = 99999;
            s.angle = 0;
            return;
        }

        s.dist = Math.hypot(dx, dy);
        let angleToSprite = Math.atan2(dy, dx);
        s.angle = angleToSprite - pAngle;
        while (s.angle > Math.PI) s.angle -= Math.PI * 2;
        while (s.angle < -Math.PI) s.angle += Math.PI * 2;
    });

    sprites.sort((a, b) => b.dist - a.dist);

    sprites.forEach(s => {
        if (s.dist < 5) return;
        if (Math.abs(s.angle) > FOV / 1.5) return;

        let screenX = (0.5 * (s.angle / (FOV / 2)) + 0.5) * canvas.width;
        let spriteScale = (TILE_SIZE * canvas.height * 0.8) / (s.dist * Math.cos(s.angle));
        if (!isFinite(spriteScale) || spriteScale <= 0) return;

        let spriteHeight = spriteScale * (s.radius / TILE_SIZE) * 2;
        let spriteWidth = spriteHeight;

        // Grafik-Fix: Sprites müssen den vertikalen Z-Offset des Spielers (Treppen) mitmachen
        let spriteZOffset = (player.z / TILE_SIZE) * spriteScale;
        let customZOffset = (s.z || 0) / TILE_SIZE * spriteScale;
        let spriteTop = (canvas.height / 2) - (spriteHeight / 2) + pitchOffset + spriteZOffset + customZOffset;

        if (s.type === 'key') spriteTop += spriteHeight * 0.5;

        let centerIdx = Math.floor(screenX / STRIP_WIDTH);
        let projectedSpriteDist = s.dist * Math.cos(s.angle);
        let visible = (centerIdx >= 0 && centerIdx < NUM_RAYS && zBuffer[centerIdx] > projectedSpriteDist - 5);

        if (visible) {
            // Umgebungslicht für Sprites (pechschwarz)
            let shade = Math.max(0.005, 0.02 - (s.dist / 250));
            let flicker = window._flashlightFlicker || 1.0;
            let centerDistX = Math.abs((screenX / canvas.width) - 0.5) * NUM_RAYS;
            // Vertikale Komponente für Sprites (runder Kegel)
            let spriteCenterY = spriteTop + spriteHeight / 2;
                // Auch für Objekte/Monster bleibt das Licht im Zentrum des Blicks
                let screenCenterY = canvas.height / 2;
            let centerDistY = Math.abs(spriteCenterY - screenCenterY) / canvas.height * NUM_RAYS;
            let centerDist2D = Math.sqrt(centerDistX * centerDistX + centerDistY * centerDistY);
            let flashlightRadius = NUM_RAYS / 2.3;

            if (centerDist2D < flashlightRadius * 2 && s.dist < 650) {
                // Realistischer Hotspot mit inverse-square Abfall
                let distFalloff = 1 / (1 + (s.dist / 120) * (s.dist / 120)) * 2.5;
                let spriteFlashLight = Math.pow(Math.max(0, 1 - (centerDist2D / flashlightRadius)), 2.5) * distFalloff * 4.5 * flicker;
                shade += spriteFlashLight;

                // Corona
                let corona = Math.pow(Math.max(0, 1 - (centerDist2D / (NUM_RAYS / 1.5))), 2) * (1 - (s.dist / 450)) * 0.3 * flicker;
                shade += corona;
            }

            // Fackel-Beleuchtung für Sprites
            for (let ti = 0; ti < torchesData.length; ti++) {
                let torch = torchesData[ti];
                if (torch.floor !== currentFloor) continue;
                let torchDist = Math.hypot(s.x - torch.x, s.y - torch.y);
                if (torchDist < TILE_SIZE * 3) {
                    shade += Math.pow(1 - torchDist / (TILE_SIZE * 3), 2) * 0.25;
                }
            }

            // Blitz beleuchtet alle Sprites kurz
            if (thunderState.active) {
                shade += thunderState.intensity * 0.3;
            }

            if (s.type === 'torch') shade = 1;

            shade = shade * (1 - Math.min(1, s.dist / 450)); // Nebel für Sprites

            ctx.globalAlpha = Math.min(1, shade);

            if (s.type === 'start_eyes') {
                // Nur zwei glühende rote Augen im Dunkeln
                let eyeY = spriteTop + spriteHeight * 0.45;
                let eyeSize = Math.max(1, spriteWidth * 0.08);
                let eyeDist = spriteWidth * 0.15;

                ctx.fillStyle = '#ff0000';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 15 + Math.sin(time * 3) * 5;

                ctx.beginPath();
                ctx.arc(screenX - eyeDist, eyeY, eyeSize, 0, Math.PI * 2);
                ctx.fill();

                ctx.beginPath();
                ctx.arc(screenX + eyeDist, eyeY, eyeSize, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
            } else if (s.type === 'enemy' && spriteWidth > 1) { // Nur zeichnen, wenn groß genug
                let t = Date.now() / 1000;
                let w = spriteWidth;
                let h = spriteHeight;
                let cx = screenX;
                let top = spriteTop;
                let jiggle = Math.sin(t * 10) * 0.05; // Organisches Wackeln
                let breathing = Math.sin(t * 2) * 0.03;
                let isChase = s.state === 'chase';
                let bodyColor = isChase ? '#2a0505' : '#0d0d0d';
                let boneColor = isChase ? '#3a1010' : '#181818';

                // --- Legs (bent, skeletal) ---
                ctx.strokeStyle = bodyColor;
                ctx.lineWidth = w * 0.045;
                // Left leg: thigh + shin
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.08, top + h * 0.7);
                ctx.lineTo(cx - w * (0.12 + jiggle), top + h * 0.82);
                ctx.lineTo(cx - w * 0.08, top + h * 0.95);
                ctx.stroke();
                // Left foot
                ctx.lineTo(cx - w * 0.14, top + h * 0.97);
                ctx.stroke();
                // Right leg
                ctx.beginPath();
                ctx.moveTo(cx + w * 0.08, top + h * 0.7);
                ctx.lineTo(cx + w * (0.12 - jiggle), top + h * 0.82);
                ctx.lineTo(cx + w * 0.08, top + h * 0.95);
                ctx.stroke();
                ctx.lineTo(cx + w * 0.14, top + h * 0.97);
                ctx.stroke();

                // --- Torso (emaciated, elongated) ---
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                ctx.moveTo(cx - w * (0.12 + breathing), top + h * 0.28);
                ctx.quadraticCurveTo(cx - w * (0.18 + jiggle), top + h * 0.5, cx - w * 0.1, top + h * 0.72);
                ctx.lineTo(cx + w * 0.1, top + h * 0.72);
                ctx.quadraticCurveTo(cx + w * (0.18 - jiggle), top + h * 0.5, cx + w * (0.12 + breathing), top + h * 0.28);
                ctx.closePath();
                ctx.fill();

                // Ribs (visible through skin)
                ctx.strokeStyle = boneColor;
                ctx.lineWidth = w * 0.015;
                for (let r = 0; r < 5; r++) {
                    let ry = top + h * (0.35 + r * 0.065);
                    let ribW = w * (0.10 - r * 0.008);
                    ctx.beginPath();
                    ctx.moveTo(cx - ribW, ry);
                    ctx.quadraticCurveTo(cx, ry - w * 0.015, cx + ribW, ry);
                    ctx.stroke();
                }

                // --- Arms (long, dangling, with claws) ---
                ctx.strokeStyle = bodyColor;
                ctx.lineWidth = w * 0.04;
                let armSway = Math.sin(t * 3 + s.dist * 0.01) * w * 0.05;
                // Left arm: shoulder → elbow → wrist
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.13, top + h * 0.3);
                ctx.lineTo(cx - w * 0.25 + armSway, top + h * 0.55);
                ctx.lineTo(cx - w * (0.28 + jiggle) - armSway, top + h * (0.78 + breathing));
                ctx.stroke();
                // Left claws (3 fingers)
                ctx.lineWidth = w * 0.02;
                for (let f = -1; f <= 1; f++) {
                    ctx.beginPath();
                    ctx.moveTo(cx - w * 0.28 - armSway, top + h * 0.78);
                    ctx.lineTo(cx - w * 0.32 - armSway + f * w * 0.03, top + h * 0.85);
                    ctx.stroke();
                }
                // Right arm
                ctx.lineWidth = w * 0.04;
                ctx.beginPath();
                ctx.moveTo(cx + w * 0.13, top + h * 0.3);
                ctx.lineTo(cx + w * 0.25 - armSway, top + h * 0.55);
                ctx.lineTo(cx + w * (0.28 + jiggle) + armSway, top + h * (0.78 + breathing));
                ctx.stroke();
                // Right claws
                ctx.lineWidth = w * 0.02;
                for (let f = -1; f <= 1; f++) {
                    ctx.beginPath();
                    ctx.moveTo(cx + w * 0.28 + armSway, top + h * 0.78);
                    ctx.lineTo(cx + w * 0.32 + armSway + f * w * 0.03, top + h * 0.85);
                    ctx.stroke();
                }

                // --- Head (deformed, elongated skull) ---
                ctx.fillStyle = bodyColor;
                ctx.beginPath();
                let headRadX = Math.max(0.1, w * (0.1 + jiggle * 0.5));
                let headRadY = Math.max(0.1, w * 0.14);
                ctx.ellipse(cx, top + h * 0.18, headRadX, headRadY, jiggle * 0.1, 0, Math.PI * 2);
                ctx.fill();
                // Jaw (slightly open)
                ctx.beginPath();
                let jawRadX = Math.max(0.1, w * 0.07);
                let jawRadY = Math.max(0.1, w * (0.04 + jiggle));
                ctx.ellipse(cx, top + h * (0.26 + breathing), jawRadX, jawRadY, 0, 0, Math.PI);
                ctx.fill();
                // Mouth slit
                ctx.strokeStyle = '#000';
                ctx.lineWidth = w * 0.01;
                ctx.beginPath();
                ctx.moveTo(cx - w * 0.05, top + h * 0.24);
                ctx.lineTo(cx + w * 0.05, top + h * 0.24);
                ctx.stroke();

                // --- Eyes (glowing red) ---
                ctx.fillStyle = '#ff0000';
                let eyeY = top + h * 0.16;
                let eyeSpread = w * (0.045 + breathing);
                let eyeR = w * 0.025 + (isChase ? Math.sin(t * 10) * w * 0.005 : 0);
                ctx.beginPath(); ctx.arc(cx - eyeSpread, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + eyeSpread, eyeY, eyeR, 0, Math.PI * 2); ctx.fill();
                // Pupil
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath(); ctx.arc(cx - eyeSpread, eyeY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(cx + eyeSpread, eyeY, eyeR * 0.4, 0, Math.PI * 2); ctx.fill();
            } else if (s.type === 'key') {
                let t = Date.now() / 1000;
                let w = spriteWidth * 0.6; // Schlüssel etwas schmaler
                let h = spriteHeight * 0.6;
                let cx = screenX;
                let floatingY = spriteTop + spriteHeight * 0.5 + Math.sin(t * 4) * 10; // Schweb-Effekt

                ctx.fillStyle = '#ffd700'; // Gold
                ctx.strokeStyle = '#b8860b'; // Dunkles Gold für Outlines
                ctx.lineWidth = 2;

                // Schlüssel-Kopf (Ring oben)
                ctx.beginPath();
                ctx.arc(cx, floatingY, w * 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();

                // Loch im Kopf
                ctx.globalCompositeOperation = 'destination-out';
                ctx.beginPath();
                ctx.arc(cx, floatingY, w * 0.08, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalCompositeOperation = 'source-over';

                // Schaft (Stab)
                ctx.fillRect(cx - w * 0.05, floatingY + w * 0.2, w * 0.1, h * 0.5);

                // Bart (die Zacken unten)
                ctx.fillRect(cx + w * 0.05, floatingY + w * 0.2 + h * 0.35, w * 0.15, h * 0.06);
                ctx.fillRect(cx + w * 0.05, floatingY + w * 0.2 + h * 0.45, w * 0.12, h * 0.06);
            } else if (s.type === 'torch') {
                ctx.fillStyle = '#ff6600'; // Feste Farbe, da kein Flackern mehr durch Blitz
                ctx.beginPath(); ctx.arc(screenX, spriteTop, spriteWidth / 2, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1.0;
        }
    });

    // --- 3D STAUB PARTIKEL (Performance-optimierter Wrap-Around) ---
    if (!window._dustParticles3D) {
        window._dustParticles3D = [];
        for (let i = 0; i < 150; i++) {
            window._dustParticles3D.push({
                x: player.x + (Math.random() - 0.5) * 600,
                y: player.y + (Math.random() - 0.5) * 600,
                z: Math.random() * TILE_SIZE, // 0 (Boden) bis TILE_SIZE (Decke)
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                vz: (Math.random() - 0.5) * 0.2 - 0.1, // Leichtes Sinken
                size: Math.random() * 2 + 0.5,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    let flicker = window._flashlightFlicker || 1.0;
    let flashlightRadius = NUM_RAYS / 2.3;
    // Staubpartikel werden nun auch im Zentrum des Blicks beleuchtet
    let screenCenterY = canvas.height / 2;

    window._dustParticles3D.forEach(p => {
        // Bewegung
        p.x += p.vx + Math.sin(time + p.phase) * 0.3;
        p.y += p.vy + Math.cos(time + p.phase) * 0.3;
        p.z += p.vz;

        // Wrap-around um den Spieler
        if (p.x - pX > 300) p.x -= 600;
        if (p.x - pX < -300) p.x += 600;
        if (p.y - pY > 300) p.y -= 600;
        if (p.y - pY < -300) p.y += 600;
        if (p.z < 0) p.z += TILE_SIZE;
        if (p.z > TILE_SIZE) p.z -= TILE_SIZE;

        let dx = p.x - pX;
        let dy = p.y - pY;
        let dist = Math.hypot(dx, dy);

        // Nur rendern wenn vor dem Spieler und im Sichtfeld
        if (dist > 10 && dist < 650) {
            let angleToDust = Math.atan2(dy, dx);
            let dAngle = angleToDust - pAngle;
            while (dAngle > Math.PI) dAngle -= Math.PI * 2;
            while (dAngle < -Math.PI) dAngle += Math.PI * 2;

            if (Math.abs(dAngle) < FOV / 1.3) {
                let screenX = (0.5 * (dAngle / (FOV / 2)) + 0.5) * canvas.width;
                let projectedDist = dist * Math.cos(dAngle);

                let centerIdx = Math.floor(screenX / STRIP_WIDTH);
                // Z-Buffer check (wird hinter Wänden versteckt)
                if (centerIdx >= 0 && centerIdx < NUM_RAYS && zBuffer[centerIdx] > projectedDist - 5) {

                    let spriteScale = (TILE_SIZE * canvas.height * 0.8) / projectedDist;
                    // Z-Koordinate auf Bildschirm-Y abbilden
                    let dustY = (canvas.height / 2) + (spriteScale / 2) + pitchOffset - (p.z / TILE_SIZE) * spriteScale;

                    let centerDistX = Math.abs((screenX / canvas.width) - 0.5) * NUM_RAYS;
                    let centerDistY = Math.abs(dustY - screenCenterY) / canvas.height * NUM_RAYS;
                    let centerDist2D = Math.sqrt(centerDistX * centerDistX + centerDistY * centerDistY);

                    // Nur rendern wenn im runden Taschenlampenkegel
                    if (centerDist2D < flashlightRadius * 2) {
                        let distFalloff = 1 / (1 + (dist / 120) * (dist / 120)) * 2.5;
                        let intensity = Math.pow(Math.max(0, 1 - (centerDist2D / flashlightRadius)), 2.5) * distFalloff * 6.0 * flicker;

                        if (intensity > 0.05) {
                            let alpha = Math.min(1, intensity);
                            let sSize = Math.max(0.5, Math.min(8, p.size * (150 / projectedDist))); // Partikel kleiner

                            let dustGlow = ctx.createRadialGradient(screenX, dustY, 0, screenX, dustY, sSize * 2);
                            dustGlow.addColorStop(0, `rgba(200, 220, 255, ${alpha})`);
                            dustGlow.addColorStop(1, 'rgba(200, 220, 255, 0)');

                            ctx.fillStyle = dustGlow;
                            ctx.fillRect(screenX - sSize * 2, dustY - sSize * 2, sSize * 4, sSize * 4);
                        }
                    }
                }
            }
        }
    });
    ctx.globalAlpha = 1.0;

    drawFirstPersonOverlay();

    // Treppen-Fade Animation
    if (fadeAlpha > 0.01) {
        ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
        ctx.fillRect(0, 0, width, height);
    }

    // Red screen effect (drawn last, on top of everything else)
    if (jumpscareEffect.currentRedIntensity > 0.001) { // Check for a small threshold
        ctx.globalAlpha = jumpscareEffect.currentRedIntensity;

        // Add a red vignette for more intensity at edges
        let redVignette = ctx.createRadialGradient(width / 2, height / 2, width / 4, width / 2, height / 2, width / 2);
        redVignette.addColorStop(0, 'rgba(255,0,0,0)');
        redVignette.addColorStop(0.7, 'rgba(150,0,0,0.2)');
        redVignette.addColorStop(1, 'rgba(139,0,0,0.8)'); // Dunkles Blutrot am Rand
        ctx.fillStyle = redVignette;
        ctx.fillRect(0, 0, width, height);
        ctx.globalAlpha = 1.0; // Reset globalAlpha
    }
}

function gameLoop() {
    update();
    render();
    // HUD Minimap jedes Frame aktualisieren
    if (gameState === 'playing') {
        drawHudMinimap();
    }
    // Große Minimap aktualisieren wenn offen
    if (minimapOpen) {
        drawMinimap();
    }
    requestAnimationFrame(gameLoop);
}

// --- MINIMAP FUNKTIONEN ---

function toggleMinimap() {
    minimapOpen = !minimapOpen;
    const overlay = document.getElementById('minimap-overlay');
    if (minimapOpen) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// HUD Minimap ein-/ausblenden bei Spielstart
function showHudMinimap() {
    const hud = document.getElementById('minimap-hud');
    if (hud) hud.classList.remove('hidden-hud');
}
function hideHudMinimap() {
    const hud = document.getElementById('minimap-hud');
    if (hud) hud.classList.add('hidden-hud');
}

function updateExploration() {
    if (!exploredTiles[currentFloor]) return;
    const pgx = Math.floor(player.x / TILE_SIZE);
    const pgy = Math.floor(player.y / TILE_SIZE);
    const set = exploredTiles[currentFloor];

    for (let dy = -EXPLORE_RADIUS; dy <= EXPLORE_RADIUS; dy++) {
        for (let dx = -EXPLORE_RADIUS; dx <= EXPLORE_RADIUS; dx++) {
            // Kreisförmiger Radius
            if (dx * dx + dy * dy > EXPLORE_RADIUS * EXPLORE_RADIUS) continue;
            const tx = pgx + dx;
            const ty = pgy + dy;
            if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
                // Nur erkunden, wenn Sichtlinie besteht (nicht durch Wände)
                const key = ty * MAP_WIDTH + tx;
                if (!set.has(key)) {
                    // Einfacher Sichtlinien-Check: Prüfe ob Weg frei ist
                    let blocked = false;
                    const steps = Math.max(Math.abs(dx), Math.abs(dy));
                    if (steps > 1) {
                        for (let s = 1; s < steps; s++) {
                            const cx = pgx + Math.round(dx * s / steps);
                            const cy = pgy + Math.round(dy * s / steps);
                            if (cx >= 0 && cx < MAP_WIDTH && cy >= 0 && cy < MAP_HEIGHT) {
                                const tile = maps[currentFloor][cy][cx];
                                if ('1KSWB'.includes(tile)) {
                                    blocked = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (!blocked) {
                        set.add(key);
                    }
                }
            }
        }
    }
}

let minimapCache = document.createElement('canvas');
let minimapCacheCtx = minimapCache.getContext('2d', { alpha: false });
let minimapCacheFloor = -1;
let minimapCacheExploredSize = -1;

function updateMinimapCache() {
    if (!exploredTiles[currentFloor]) return;
    if (minimapCacheFloor === currentFloor && minimapCacheExploredSize === exploredTiles[currentFloor].size) return;
    
    minimapCacheFloor = currentFloor;
    minimapCacheExploredSize = exploredTiles[currentFloor].size;
    
    const CELL = 8;
    if (minimapCache.width !== MAP_WIDTH * CELL) {
        minimapCache.width = MAP_WIDTH * CELL;
        minimapCache.height = MAP_HEIGHT * CELL;
    }
    
    minimapCacheCtx.fillStyle = '#111115';
    minimapCacheCtx.fillRect(0, 0, minimapCache.width, minimapCache.height);
    
    const grid = maps[currentFloor];
    const explored = exploredTiles[currentFloor];
    if (!grid || !explored) return;
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const key = y * MAP_WIDTH + x;
            if (!explored.has(key)) continue;
            
            const tile = grid[y][x];
            let color = '';
            
            if (tile === '0') color = '#333340';
            else if (tile === '1') color = '#5c4b38';
            else if (tile === 'K') color = '#2e522e';
            else if (tile === 'S') color = '#2e2e52';
            else if (tile === 'W') color = '#522626';
            else if (tile === 'B') color = '#525226';
            else if (tile === '2') color = '#8c541d';
            else if (tile === 'U' || tile === 'D') color = '#33bbff';
            else if (tile === 'E') color = player.keys >= TOTAL_KEYS ? '#00ff00' : '#ff4444';
            else color = '#222222';
            
            minimapCacheCtx.fillStyle = color;
            minimapCacheCtx.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
    }
    
    minimapCacheCtx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    minimapCacheCtx.lineWidth = 1;
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const key = y * MAP_WIDTH + x;
            if (!explored.has(key)) continue;
            
            const neighbors = [[0,-1],[0,1],[-1,0],[1,0]];
            for (const [ndx, ndy] of neighbors) {
                const nx = x + ndx;
                const ny = y + ndy;
                if (nx >= 0 && nx < MAP_WIDTH && ny >= 0 && ny < MAP_HEIGHT) {
                    if (!explored.has(ny * MAP_WIDTH + nx)) {
                        minimapCacheCtx.beginPath();
                        if (ndx === 1) { minimapCacheCtx.moveTo((x+1)*CELL, y*CELL); minimapCacheCtx.lineTo((x+1)*CELL, (y+1)*CELL); }
                        if (ndx === -1) { minimapCacheCtx.moveTo(x*CELL, y*CELL); minimapCacheCtx.lineTo(x*CELL, (y+1)*CELL); }
                        if (ndy === 1) { minimapCacheCtx.moveTo(x*CELL, (y+1)*CELL); minimapCacheCtx.lineTo((x+1)*CELL, (y+1)*CELL); }
                        if (ndy === -1) { minimapCacheCtx.moveTo(x*CELL, y*CELL); minimapCacheCtx.lineTo((x+1)*CELL, y*CELL); }
                        minimapCacheCtx.stroke();
                    }
                }
            }
        }
    }
}

// --- GROßE MINIMAP (Overlay, volle Karte) ---
function drawMinimap() {
    updateMinimapCache();
    
    const mmCanvas = document.getElementById('minimapCanvas');
    if (!mmCanvas) return;
    const mmCtx = mmCanvas.getContext('2d', { alpha: false });

    if (mmCanvas.width !== minimapCache.width) {
        mmCanvas.width = minimapCache.width;
        mmCanvas.height = minimapCache.height;
    }

    mmCtx.drawImage(minimapCache, 0, 0);

    const CELL = 8;
    const explored = exploredTiles[currentFloor];
    if (!explored) return;

    keysData.forEach(k => {
        if (k.collected || k.floor !== currentFloor) return;
        const kx = Math.floor(k.x / TILE_SIZE);
        const ky = Math.floor(k.y / TILE_SIZE);
        if (!explored.has(ky * MAP_WIDTH + kx)) return;

        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        mmCtx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        mmCtx.shadowColor = '#ffd700';
        mmCtx.shadowBlur = 6;
        mmCtx.beginPath();
        mmCtx.arc(kx * CELL + CELL / 2, ky * CELL + CELL / 2, CELL * 0.5, 0, Math.PI * 2);
        mmCtx.fill();
        mmCtx.shadowBlur = 0;
    });

    const playerScreenX = (player.x / TILE_SIZE) * CELL;
    const playerScreenY = (player.y / TILE_SIZE) * CELL;

    const arrowLen = CELL * 2;
    const arrowAngle = player.angle;
    mmCtx.fillStyle = 'rgba(0, 255, 0, 0.6)';
    mmCtx.beginPath();
    mmCtx.moveTo(playerScreenX + Math.cos(arrowAngle) * arrowLen, playerScreenY + Math.sin(arrowAngle) * arrowLen);
    mmCtx.lineTo(playerScreenX + Math.cos(arrowAngle + 2.5) * arrowLen * 0.5, playerScreenY + Math.sin(arrowAngle + 2.5) * arrowLen * 0.5);
    mmCtx.lineTo(playerScreenX + Math.cos(arrowAngle - 2.5) * arrowLen * 0.5, playerScreenY + Math.sin(arrowAngle - 2.5) * arrowLen * 0.5);
    mmCtx.closePath();
    mmCtx.fill();

    const playerPulse = Math.sin(Date.now() / 250) * 0.3 + 0.7;
    mmCtx.fillStyle = `rgba(0, 255, 0, ${playerPulse})`;
    mmCtx.shadowColor = '#00ff00';
    mmCtx.shadowBlur = 10;
    mmCtx.beginPath();
    mmCtx.arc(playerScreenX, playerScreenY, CELL * 0.7, 0, Math.PI * 2);
    mmCtx.fill();
    mmCtx.shadowBlur = 0;

    const vigGrad = mmCtx.createRadialGradient(
        playerScreenX, playerScreenY, mmCanvas.width * 0.15,
        playerScreenX, playerScreenY, mmCanvas.width * 0.55
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(0.7, 'rgba(0,0,0,0.2)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    mmCtx.fillStyle = vigGrad;
    mmCtx.fillRect(0, 0, mmCanvas.width, mmCanvas.height);

    const titleEl = document.getElementById('minimap-title');
    if (titleEl) {
        const floorNames = ["Ground Floor", "1st Floor", "2nd Floor", "3rd Floor", "Attic"];
        let name = floorNames[currentFloor] || (currentFloor + ". Floor");
        if (currentFloor === maps.length - 1) name = "Attic";
        titleEl.textContent = name.toUpperCase();
    }
}

// --- KLEINE HUD MINIMAP (dauerhaft rechts unten, flüssig zentriert) ---
const HUD_SIZE = 240; 
const HUD_CELL = 8;   

function drawHudMinimap() {
    updateMinimapCache();

    const hudCanvas = document.getElementById('minimapHudCanvas');
    if (!hudCanvas) return;
    const hCtx = hudCanvas.getContext('2d', { alpha: false });

    if (hudCanvas.width !== HUD_SIZE) {
        hudCanvas.width = HUD_SIZE;
        hudCanvas.height = HUD_SIZE;
    }

    const explored = exploredTiles[currentFloor];
    if (!explored) return;

    // Weiche Kamera-Bewegung (Sub-Pixel genau)
    const pxInCells = player.x / TILE_SIZE;
    const pyInCells = player.y / TILE_SIZE;
    
    const viewHalf = HUD_SIZE / 2;
    const cacheX = pxInCells * HUD_CELL - viewHalf;
    const cacheY = pyInCells * HUD_CELL - viewHalf;

    hCtx.fillStyle = '#060608';
    hCtx.fillRect(0, 0, HUD_SIZE, HUD_SIZE);

    hCtx.save();
    hCtx.translate(-cacheX, -cacheY);
    hCtx.drawImage(minimapCache, 0, 0);

    // Schlüssel zeichnen
    keysData.forEach(k => {
        if (k.collected || k.floor !== currentFloor) return;
        const kx = Math.floor(k.x / TILE_SIZE);
        const ky = Math.floor(k.y / TILE_SIZE);
        if (!explored.has(ky * MAP_WIDTH + kx)) return;

        const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.7;
        hCtx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        hCtx.shadowColor = '#ffd700';
        hCtx.shadowBlur = 4;
        hCtx.beginPath();
        hCtx.arc(kx * HUD_CELL + HUD_CELL / 2, ky * HUD_CELL + HUD_CELL / 2, HUD_CELL * 0.45, 0, Math.PI * 2);
        hCtx.fill();
        hCtx.shadowBlur = 0;
    });

    hCtx.restore();

    // Spieler immer exakt in der Mitte
    const playerHudX = viewHalf;
    const playerHudY = viewHalf;

    const arrowLen = HUD_CELL * 1.5;
    const angle = player.angle;
    hCtx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    hCtx.beginPath();
    hCtx.moveTo(playerHudX + Math.cos(angle) * arrowLen, playerHudY + Math.sin(angle) * arrowLen);
    hCtx.lineTo(playerHudX + Math.cos(angle + 2.5) * arrowLen * 0.4, playerHudY + Math.sin(angle + 2.5) * arrowLen * 0.4);
    hCtx.lineTo(playerHudX + Math.cos(angle - 2.5) * arrowLen * 0.4, playerHudY + Math.sin(angle - 2.5) * arrowLen * 0.4);
    hCtx.closePath();
    hCtx.fill();

    const pp = Math.sin(Date.now() / 250) * 0.3 + 0.7;
    hCtx.fillStyle = `rgba(0, 255, 0, ${pp})`;
    hCtx.shadowColor = '#00ff00';
    hCtx.shadowBlur = 6;
    hCtx.beginPath();
    hCtx.arc(playerHudX, playerHudY, HUD_CELL * 0.5, 0, Math.PI * 2);
    hCtx.fill();
    hCtx.shadowBlur = 0;

    // Runde Schatten-Vignette
    const vigGrad = hCtx.createRadialGradient(viewHalf, viewHalf, HUD_SIZE * 0.15, viewHalf, viewHalf, HUD_SIZE * 0.5);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    hCtx.fillStyle = vigGrad;
    hCtx.fillRect(0, 0, HUD_SIZE, HUD_SIZE);

    const floorEl = document.getElementById('minimap-hud-floor');
    if (floorEl) {
        const floorNames = ["GF", "1st", "2nd", "3rd", "Attic"];
        let name = floorNames[currentFloor] || (currentFloor + "th");
        if (currentFloor === maps.length - 1) name = "Attic";
        floorEl.textContent = name;
    }
}

gameLoop();
