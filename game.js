const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let W, H, keys = {}, gameState = 'menu', animFrame;
let score = 0, wave = 1, kills = 0, health = 200, maxHealth = 200, rapidFire = 0;
let shieldTimer = 0, homingTimer = 0, magnetTimer = 0;
let player, bullets = [], enemies = [], particles = [], powerups = [], starLayers = [], boss = null;
let enemyTimer = 1, waveTimer = 0, powerupTimer = 0, fireTimer = 0;
let highScore = parseInt(localStorage.getItem('novaHS')) || 0;
let combo = 0, maxCombo = 0, comboTimer = 0, comboMultiplier = 1;
let novaBombs = 2, maxBombs = 3, bombCooldown = 0;
let shakeIntensity = 0, shakeDuration = 0, shakeTime = 0;
let hitFreezeTimer = 0, bulletTimeActive = false;
let shotsFired = 0, shotsHit = 0, timeSurvived = 0, bossesDefeated = 0;
let scorePopups = [], nebulaHue = 0, upgradesPending = false;
let playerUpgrades;
let dangerLeft, dangerRight;
let waveClearChecked;
let mines;
let missiles, missileCooldown;
let notifications, powerupRings;
let killsSinceLastReward, rewardThreshold;
let empDebuffTimer = 0;
let trapZones = [];

// ─── REWARD DROP CONFIG (kill-counter based) ─────
// Waves 2-5 keep the original 2-kill threshold unchanged. From Wave 6 onward,
// the threshold rises gradually so rewards stay regular but don't flood later,
// enemy-heavy waves.
const minKillsForReward = 2;
const maxKillsForReward = 2;
function pickRewardThreshold() {
    let min = minKillsForReward, max = maxKillsForReward;
    if (wave === 6) { min = 3; max = 3; }
    else if (wave >= 7 && wave <= 8) { min = 3; max = 4; }
    else if (wave >= 9) { min = 4; max = 4; }
    return min + Math.floor(Math.random() * (max - min + 1));
}
const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };
const POWERUP_TYPES = {
    shield: { label: 'SHIELD', color: '#00f0ff', rarity: 'rare', glow: '#00f0ff' },
    rapid: { label: 'RAPID FIRE', color: '#ff6a00', rarity: 'common', glow: '#ff6a00' },
    repair: { label: 'HEALTH +30', color: '#39ff14', rarity: 'common', glow: '#39ff14' },
    bomb: { label: 'NOVA CHARGE', color: '#ffe600', rarity: 'rare', glow: '#ffe600' },
    bulletSpeed: { label: 'BULLET SPEED', color: '#00d4ff', rarity: 'common', glow: '#00d4ff' },
    doubleMissile: { label: 'MISSILE ×2', color: '#ff4444', rarity: 'rare', glow: '#ff4444', minWave: 3 },
    bullet2: { label: '2 BULLETS', color: '#b44dff', rarity: 'common', glow: '#b44dff', minWave: 3, columns: 2 },
    bullet3: { label: '3 BULLETS', color: '#c94dff', rarity: 'rare', glow: '#c94dff', minWave: 3, columns: 3 },
    bullet4: { label: '4 BULLETS', color: '#e04dff', rarity: 'epic', glow: '#e04dff', minWave: 3, columns: 4 },
    damageBoost: { label: 'DAMAGE +1', color: '#ff8800', rarity: 'epic', glow: '#ff8800' },
    homing: { label: 'HOMING', color: '#39ffb0', rarity: 'epic', glow: '#39ffb0' },
    magnet: { label: 'MAGNET', color: '#ffcc00', rarity: 'common', glow: '#ffcc00' },
    healthBoost: { label: 'MAX HP+', color: '#ffd23f', rarity: 'legendary', glow: '#ffd23f' }
};
const screens = {
    start: document.getElementById('start-screen'),
    howto: document.getElementById('howto-screen'),
    game: document.getElementById('game-screen'),
    over: document.getElementById('gameover-screen')
};
const hudScore = document.getElementById('hud-score');
const hudWave = document.getElementById('hud-wave');
const hudCombo = document.getElementById('hud-combo');
const healthFill = document.getElementById('health-fill');
const shieldInd = document.getElementById('hud-shield');
const waveAnnounce = document.getElementById('wave-announce');
const waveNum = document.getElementById('wave-num');
const pauseOverlay = document.getElementById('pause-overlay');
const bossHud = document.getElementById('boss-hud');
const bossNameEl = document.getElementById('boss-name');
const bossHealthFill = document.getElementById('boss-health-fill');
const hudBombs = document.getElementById('hud-bombs');
const dangerLeftEl = document.getElementById('danger-left');
const dangerRightEl = document.getElementById('danger-right');
const gameScreen = document.getElementById('game-screen');
const missileIndicator = document.getElementById('missile-indicator');
const hudMissiles = document.getElementById('hud-missiles');
const bulletColumnsIndicator = document.getElementById('bulletcolumns-indicator');
const hudBulletColumns = document.getElementById('hud-bulletcolumns');
const bulletSpeedIndicator = document.getElementById('bulletspeed-indicator');
const hudBulletSpeed = document.getElementById('hud-bulletspeed');
const damageIndicator = document.getElementById('damage-indicator');
const hudDamage = document.getElementById('hud-damage');
const fireRateIndicator = document.getElementById('firerate-indicator');
const hudFireRate = document.getElementById('hud-firerate');
const activePowerupsEl = document.getElementById('active-powerups');
document.getElementById('hs-value').textContent = highScore;
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}
function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
// ─── REALISTIC DEEP SPACE STARFIELD SYSTEM ─────────────────────────
let shootingStars = [];
let meteorSpawnTimer = 5.0;

const STAR_SPECTRAL_COLORS = [
    { fill: '#ffffff', weight: 40 }, // Diamond White
    { fill: '#bae6fd', weight: 26 }, // Class B Soft Blue
    { fill: '#93c5fd', weight: 14 }, // Class O Sapphire
    { fill: '#fef08a', weight: 12 }, // Class G Soft Yellow
    { fill: '#fed7aa', weight: 8 }   // Class K Soft Amber
];

function pickSpectralColor() {
    const total = STAR_SPECTRAL_COLORS.reduce((sum, c) => sum + c.weight, 0);
    let rand = Math.random() * total;
    for (const sc of STAR_SPECTRAL_COLORS) {
        if (rand < sc.weight) return sc;
        rand -= sc.weight;
    }
    return STAR_SPECTRAL_COLORS[0];
}

function initStars() {
    const width = W || window.innerWidth || 1200;
    const height = H || window.innerHeight || 800;

    starLayers = [
        // Layer 0: Distant stars (0.4px - 0.9px)
        { stars: [], speed: 0.12, count: 220, minSize: 0.4, maxSize: 0.9, alphaBase: 0.68 },
        // Layer 1: Mid stars (0.8px - 1.4px)
        { stars: [], speed: 0.35, count: 130, minSize: 0.8, maxSize: 1.4, alphaBase: 0.85 },
        // Layer 2: Bright near stars (1.1px - 1.8px)
        { stars: [], speed: 0.75, count: 60, minSize: 1.1, maxSize: 1.8, alphaBase: 1.0 }
    ];

    starLayers.forEach(layer => {
        layer.stars = [];
        for (let i = 0; i < layer.count; i++) {
            const spec = pickSpectralColor();
            layer.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                s: layer.minSize + Math.random() * (layer.maxSize - layer.minSize),
                twinkle: Math.random() * Math.PI * 2,
                twinkleSpeed: 0.8 + Math.random() * 2.2,
                twinkleAmp: 0.3 + Math.random() * 0.4,
                fill: spec.fill
            });
        }
    });
}

function spawnShootingStar() {
    const width = W || window.innerWidth || 1200;
    const height = H || window.innerHeight || 800;

    // Always spawn from top or left edge so it travels across the full screen
    const fromTop = Math.random() < 0.6; // 60% from top, 40% from left
    let startX, startY;
    if (fromTop) {
        startX = Math.random() * width;
        startY = -10;
    } else {
        startX = -10;
        startY = Math.random() * height * 0.7;
    }

    // Angle: mostly downward-diagonal so it sweeps across screen
    const angle = (Math.PI / 4) + (Math.random() - 0.5) * 0.35;
    const speed = 280 + Math.random() * 180; // px per second — fast sweep

    // Compute life so it travels roughly the full diagonal distance
    const diagDist = Math.hypot(width, height);
    const maxLife = (diagDist / speed) * (0.85 + Math.random() * 0.3);

    shootingStars.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        len: 55 + Math.random() * 60,  // long glowing tail
        maxLife,
        life: maxLife,
        color: Math.random() < 0.5 ? '#bae6fd' : '#ffffff'
    });
}

function updateStars(dt) {
    const width = W || window.innerWidth;
    const height = H || window.innerHeight;

    starLayers.forEach(layer => {
        layer.stars.forEach(s => {
            s.y += layer.speed * dt * 60;
            s.twinkle += s.twinkleSpeed * dt;
            if (s.y > height + 5) {
                s.y = -5;
                s.x = Math.random() * width;
            }
        });
    });

    // Update Shooting Stars
    meteorSpawnTimer -= dt;
    if (meteorSpawnTimer <= 0) {
        meteorSpawnTimer = 4.0 + Math.random() * 6.0;
        spawnShootingStar();
    }

    shootingStars.forEach(m => {
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.life -= dt;
    });
    shootingStars = shootingStars.filter(m => m.life > 0);
}

function drawShootingStars() {
    shootingStars.forEach(m => {
        const progress = m.life / m.maxLife;
        const alpha = Math.sin(progress * Math.PI);
        if (alpha <= 0) return;

        const spd = Math.hypot(m.vx, m.vy);
        const nx = m.vx / spd;
        const ny = m.vy / spd;
        const tailX = m.x - nx * m.len;
        const tailY = m.y - ny * m.len;

        ctx.save();

        // Long gradient tail
        ctx.globalAlpha = alpha * 0.9;
        const grad = ctx.createLinearGradient(tailX, tailY, m.x, m.y);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(0.45, m.color);
        grad.addColorStop(0.85, '#ffffff');
        grad.addColorStop(1, '#ffffff');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(m.x, m.y);
        ctx.stroke();

        // Glowing bright head
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.restore();
    });
}

function drawStars() {
    starLayers.forEach(layer => {
        layer.stars.forEach(s => {
            const flicker = 0.6 + Math.sin(s.twinkle) * s.twinkleAmp + Math.cos(s.twinkle * 1.5) * (s.twinkleAmp * 0.25);
            const alpha = Math.max(0.25, Math.min(1.0, layer.alphaBase * flicker));

            ctx.globalAlpha = alpha;
            ctx.fillStyle = s.fill;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
            ctx.fill();
        });
    });

    ctx.globalAlpha = 1;
    drawShootingStars();
}
function createPlayer() {
    return {
        x: W / 2, y: H - 120, w: 44, h: 50, hitboxR: 17, speed: 6,
        invincible: 0, bank: 0, damageFlash: 0, engineGlow: 0.6,
        vx: 0, vy: 0, turnPunch: 0, muzzleFlash: 0
    };
}
function getPlayerSpeed() {
    const base = player.speed + (playerUpgrades.speed || 0) * 0.8;
    return empDebuffTimer > 0 ? base * 0.55 : base;
}
function getFireRate() {
    const base = rapidFire > 0 ? 0.08 : 0.18;
    const rate = base * (1 - (playerUpgrades.fireRate || 0) * 0.08);
    return empDebuffTimer > 0 ? rate * 1.9 : rate;
}
function getPlayerDamage() {
    return 1 + (playerUpgrades.damage || 0) + (playerUpgrades.damageBoost || 0);
}
function getBulletSpeed() {
    return 10 + (playerUpgrades.bulletSpeed || 0) * 5;
}
function getBulletCount() {

    return Math.min(1 + (playerUpgrades.multiShot || 0), 4);
}
function getMissileCount() {

    return playerUpgrades.doubleMissile || 0;
}
function drawPlayerShip(p, scale, invincibleFlicker) {

    const speedFrac = Math.min(1, Math.hypot(p.vx || 0, p.vy || 0) / 10);
    const thrusting = (keys['ArrowUp'] || keys['KeyW']) || speedFrac > 0.15;
    const bank = p.bank || 0;
    const turnPunch = p.turnPunch || 0;
    // differential thrust: the engine opposite the bank direction burns harder to push the turn
    const leftBoost = 1 - Math.max(0, -bank) * 0.35 + Math.max(0, bank) * 0.25;
    const rightBoost = 1 - Math.max(0, bank) * 0.35 + Math.max(0, -bank) * 0.25;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(bank * 0.24 + Math.sign(bank) * turnPunch * 0.08);
    ctx.scale(scale, scale);
    if (invincibleFlicker) ctx.globalAlpha = 0.4;

    const w = p.w, h = p.h;
    const t = performance.now();
    const engineFlicker = 0.75 + Math.sin(t * 0.02) * 0.25;
    const thrustBoost = (thrusting ? 1.5 : 1) + speedFrac * 0.9;
    const cols = getBulletCount();
    const emitters = getWeaponEmitters(cols);
    const muzzleActive = (p.muzzleFlash || 0) > 0;

    // ══════════════════ REAR: engine housings + exhaust ══════════════════
    const enginePositions = [{ ox: -w * 0.26, boost: leftBoost }, { ox: w * 0.26, boost: rightBoost }];
    enginePositions.forEach(({ ox, boost }) => {
        const flameLen = (13 + engineFlicker * 8) * thrustBoost * boost;
        const turbulence = speedFrac > 0.5 ? (Math.random() - 0.5) * 3 : 0;
        ctx.save();
        ctx.translate(ox, h * 0.47);
        const flameGrad = ctx.createLinearGradient(0, 0, 0, flameLen);
        flameGrad.addColorStop(0, '#ffffff');
        flameGrad.addColorStop(0.3, '#00f0ff');
        flameGrad.addColorStop(1, 'rgba(255,45,149,0)');
        ctx.fillStyle = flameGrad;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(-3.2, 0);
        ctx.lineTo(turbulence, flameLen);
        ctx.lineTo(3.2, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    });

    // engine housings (two distinct nacelles, darker structural material)
    enginePositions.forEach(({ ox }) => {
        ctx.save();
        ctx.translate(ox, h * 0.34);
        const nacelleGrad = ctx.createLinearGradient(-5, -6, 5, 10);
        nacelleGrad.addColorStop(0, '#3a3a52'); nacelleGrad.addColorStop(1, '#15151f');
        ctx.fillStyle = nacelleGrad;
        ctx.strokeStyle = 'rgba(0,240,255,0.5)';
        ctx.lineWidth = 1;
        ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.moveTo(-5.5, -7);
        ctx.lineTo(5.5, -7);
        ctx.lineTo(6.5, 11);
        ctx.lineTo(-6.5, 11);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        // exhaust nozzle ring
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#0a0a12'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 10, 4.2, 0, Math.PI * 2); ctx.stroke();
        // heat vent slats
        ctx.strokeStyle = 'rgba(255,106,0,0.5)'; ctx.lineWidth = 0.8;
        for (let i = 0; i < 2; i++) {
            ctx.beginPath();
            ctx.moveTo(-4, -1 + i * 3.5); ctx.lineTo(4, -1 + i * 3.5);
            ctx.stroke();
        }
        ctx.restore();
    });
    // exhaust nozzle glow (bright core at each engine)
    enginePositions.forEach(({ ox, boost }) => {
        const g = ctx.createRadialGradient(ox, h * 0.44, 0, ox, h * 0.44, 5 * boost);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.4, '#00f0ff');
        g.addColorStop(1, 'rgba(0,240,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(ox, h * 0.44, 4.5 * engineFlicker * boost, 0, Math.PI * 2);
        ctx.fill();
    });

    // ══════════════════ SIDES: wings, control surfaces, weapon pods ══════════════════
    [-1, 1].forEach(side => {
        ctx.save();
        ctx.scale(side, 1);

        // wing root (structural connector to fuselage)
        ctx.fillStyle = '#2a2a40';
        ctx.beginPath();
        ctx.moveTo(w * 0.08, -h * 0.06); ctx.lineTo(w * 0.2, h * 0.02);
        ctx.lineTo(w * 0.14, h * 0.14); ctx.lineTo(w * 0.05, h * 0.08);
        ctx.closePath(); ctx.fill();

        // outer wing plate (layered armor)
        const wingGrad = ctx.createLinearGradient(0, 0, w * 0.58, h * 0.32);
        wingGrad.addColorStop(0, '#42425e'); wingGrad.addColorStop(0.5, '#2c2c44');
        wingGrad.addColorStop(1, '#161624');
        ctx.fillStyle = wingGrad;
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.moveTo(w * 0.07, -h * 0.03);
        ctx.lineTo(w * 0.58, h * 0.28);
        ctx.lineTo(w * 0.44, h * 0.4);
        ctx.lineTo(w * 0.14, h * 0.22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // panel seam on wing
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(10,10,20,0.5)'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(w * 0.16, h * 0.05); ctx.lineTo(w * 0.5, h * 0.26); ctx.stroke();
        // control surface (small flap near trailing edge)
        ctx.fillStyle = '#1a1a2c'; ctx.strokeStyle = 'rgba(0,240,255,0.3)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(w * 0.34, h * 0.3); ctx.lineTo(w * 0.46, h * 0.37);
        ctx.lineTo(w * 0.4, h * 0.42); ctx.lineTo(w * 0.3, h * 0.35);
        ctx.closePath(); ctx.fill(); ctx.stroke();

        // navigation light (steady, not pulsing - a real nav light)
        ctx.fillStyle = '#ff2d95';
        ctx.shadowColor = '#ff2d95';
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(w * 0.56, h * 0.28, 1.6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    });

    // ══════════════════ CENTER: main fuselage ══════════════════
    const hullGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    hullGrad.addColorStop(0, '#eef0ff');
    hullGrad.addColorStop(0.3, '#9a9ac8');
    hullGrad.addColorStop(0.65, '#40405e');
    hullGrad.addColorStop(1, '#18182a');
    ctx.fillStyle = hullGrad;
    ctx.strokeStyle = 'rgba(0,240,255,0.7)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(w * 0.17, -h * 0.15);
    ctx.lineTo(w * 0.14, h * 0.34);
    ctx.lineTo(0, h * 0.44);
    ctx.lineTo(-w * 0.14, h * 0.34);
    ctx.lineTo(-w * 0.17, -h * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // darker recessed underside strip (depth: lighter upper surfaces, darker lower/recessed)
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, h * 0.18); ctx.lineTo(w * 0.1, h * 0.18);
    ctx.lineTo(w * 0.08, h * 0.36); ctx.lineTo(-w * 0.08, h * 0.36);
    ctx.closePath(); ctx.fill();

    // hull panel seams + rivets (structural detail following the hull outline)
    ctx.strokeStyle = 'rgba(10,10,26,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w * 0.11, -h * 0.02); ctx.lineTo(w * 0.11, -h * 0.02);
    ctx.moveTo(-w * 0.1, h * 0.15); ctx.lineTo(w * 0.1, h * 0.15);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,210,255,0.4)';
    [[-w * 0.1, -h * 0.02], [w * 0.1, -h * 0.02], [-w * 0.09, h * 0.15], [w * 0.09, h * 0.15]].forEach(([bx, by]) => {
        ctx.beginPath(); ctx.arc(bx, by, 0.7, 0, Math.PI * 2); ctx.fill();
    });

    // forward sensor module (small emissive dot ahead of the cockpit)
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(0, -h * 0.34, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // ══════════════════ FRONT: cockpit + nose ══════════════════
    const cockGrad = ctx.createRadialGradient(0, -h * 0.16, 1, 0, -h * 0.12, w * 0.15);
    cockGrad.addColorStop(0, '#ffffff');
    cockGrad.addColorStop(0.5, '#00f0ff');
    cockGrad.addColorStop(1, '#0a5a66');
    ctx.fillStyle = cockGrad;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.15, w * 0.095, h * 0.17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // canopy frame line
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(20,20,35,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -h * 0.3); ctx.lineTo(0, 0); ctx.stroke();

    // nose weapon mount (center emitter housing, only prominent when a center emitter is active)
    ctx.fillStyle = '#0d0d1a';
    ctx.shadowBlur = 0;
    ctx.fillRect(-1.4, -h * 0.52, 2.8, 6);

    // ══════════════════ Energy core (mid-hull, pulsing) ══════════════════
    const coreGlow = 0.5 + Math.sin(t * 0.006) * 0.3;
    ctx.strokeStyle = 'rgba(180,77,255,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, h * 0.08, 7, 0, Math.PI * 2); ctx.stroke();
    const coreGrad = ctx.createRadialGradient(0, h * 0.08, 0, 0, h * 0.08, 6);
    coreGrad.addColorStop(0, `rgba(180,77,255,${coreGlow})`);
    coreGrad.addColorStop(1, 'rgba(180,77,255,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, h * 0.08, 6, 0, Math.PI * 2);
    ctx.fill();

    // ══════════════════ Weapon emitters (barrels + muzzle flash at true firing positions) ══════════════════
    emitters.forEach(em => {
        const ex = em.xFrac * w, ey = em.yFrac * h;
        ctx.save();
        ctx.translate(ex, ey);
        ctx.fillStyle = '#0d0d16';
        ctx.strokeStyle = 'rgba(0,240,255,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.rect(-1.6, -4, 3.2, 8);
        ctx.fill(); ctx.stroke();
        if (muzzleActive) {
            const mg = ctx.createRadialGradient(0, -4, 0, 0, -4, 7);
            mg.addColorStop(0, '#ffffff'); mg.addColorStop(0.5, '#00f0ff'); mg.addColorStop(1, 'rgba(0,240,255,0)');
            ctx.fillStyle = mg;
            ctx.shadowColor = '#00f0ff'; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(0, -4, 6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    });

    // ══════════════════ Damage flash overlay ══════════════════
    if (p.damageFlash > 0) {
        ctx.globalAlpha = Math.min(0.7, p.damageFlash);
        ctx.fillStyle = '#ff2d95';
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(w * 0.17, -h * 0.15);
        ctx.lineTo(w * 0.14, h * 0.34);
        ctx.lineTo(0, h * 0.44);
        ctx.lineTo(-w * 0.14, h * 0.34);
        ctx.lineTo(-w * 0.17, -h * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // sparks on hit
        for (let i = 0; i < 2; i++) {
            const sa = Math.random() * Math.PI * 2, sr = 6 + Math.random() * 10;
            ctx.strokeStyle = '#ffe600'; ctx.lineWidth = 1; ctx.globalAlpha = p.damageFlash;
            ctx.beginPath();
            ctx.moveTo(Math.cos(sa) * 3, Math.sin(sa) * 3);
            ctx.lineTo(Math.cos(sa) * sr, Math.sin(sa) * sr);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    ctx.restore();
}
function drawPlayer() {
    const p = player;
    const flicker = p.invincible > 0 && Math.floor(p.invincible * 10) % 2 === 0;

    drawPlayerShip(p, 1, flicker);

    ctx.save();
    ctx.translate(p.x, p.y);

    if (shieldTimer > 0) {
        const shieldPulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.15;
        const fading = shieldTimer < 1.5;
        ctx.globalAlpha = fading ? (0.5 + Math.sin(performance.now() * 0.02) * 0.5) : 1;
        ctx.strokeStyle = `rgba(0,240,255,${shieldPulse})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.w + 6, 0, Math.PI * 2);
        ctx.stroke();
        // hex facets on the shield
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            const a1 = (Math.PI * 2 * i) / 6;
            const a2 = (Math.PI * 2 * (i + 1)) / 6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a1) * (p.w + 6), Math.sin(a1) * (p.w + 6));
            ctx.lineTo(Math.cos(a2) * (p.w + 6), Math.sin(a2) * (p.w + 6));
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    if (bulletTimeActive) {
        ctx.strokeStyle = 'rgba(255, 45, 149, 0.3)';
        ctx.shadowColor = '#ff2d95';
        ctx.shadowBlur = 30;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, p.w + 20, 0, Math.PI * 2);
        ctx.stroke();
    }

    if (p.glowColor && p.glowTimer > 0) {
        ctx.strokeStyle = p.glowColor;
        ctx.shadowColor = p.glowColor;
        ctx.shadowBlur = 20;
        ctx.globalAlpha = Math.min(1, p.glowTimer * 2);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.w + 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    ctx.restore();
}
function updatePlayer(dt) {
    const p = player;
    const maxSpeed = getPlayerSpeed() * 1.55;
    const accel = maxSpeed / 9;
    const drag = 0.86;

    const inputX = ((keys['ArrowRight'] || keys['KeyD']) ? 1 : 0) - ((keys['ArrowLeft'] || keys['KeyA']) ? 1 : 0);
    const inputY = ((keys['ArrowDown'] || keys['KeyS']) ? 1 : 0) - ((keys['ArrowUp'] || keys['KeyW']) ? 1 : 0);

    const prevVx = p.vx;

    if (inputX !== 0) {
        p.vx += inputX * accel * dt * 60;
    } else {

        p.vx *= Math.pow(drag, dt * 60);
        if (Math.abs(p.vx) < 0.02) p.vx = 0;
    }
    if (inputY !== 0) {
        p.vy += inputY * accel * dt * 60;
    } else {
        p.vy *= Math.pow(drag, dt * 60);
        if (Math.abs(p.vy) < 0.02) p.vy = 0;
    }

    p.vx = Math.max(-maxSpeed, Math.min(maxSpeed, p.vx));
    p.vy = Math.max(-maxSpeed, Math.min(maxSpeed, p.vy));

    // quick-reversal punch: a sudden opposite-direction input gets a brief extra bank kick,
    // simulating asymmetric thruster output during a fast direction change
    const velDelta = p.vx - prevVx;
    if (Math.sign(velDelta) !== 0 && Math.sign(prevVx) !== 0 && Math.sign(velDelta) !== Math.sign(prevVx)) {
        p.turnPunch = Math.min(1, p.turnPunch + Math.abs(velDelta) * 0.15);
    }
    if (p.turnPunch > 0) p.turnPunch = Math.max(0, p.turnPunch - dt * 2.5);

    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.x = Math.max(p.w * 0.4, Math.min(W - p.w * 0.4, p.x));
    p.y = Math.max(p.h * 0.4, Math.min(H - p.h * 0.4, p.y));
    if (p.x <= p.w * 0.4 || p.x >= W - p.w * 0.4) p.vx = 0;
    if (p.y <= p.h * 0.4 || p.y >= H - p.h * 0.4) p.vy = 0;

    if (p.invincible > 0) p.invincible -= dt;
    if (p.damageFlash > 0) p.damageFlash -= dt * 2.5;
    if (p.glowTimer > 0) p.glowTimer -= dt;
    if (p.muzzleFlash > 0) p.muzzleFlash -= dt * 4;

    // banking driven by actual lateral velocity (not raw input), so it reflects real momentum
    const bankTarget = Math.max(-1, Math.min(1, p.vx / (maxSpeed * 0.6))) + Math.sign(p.turnPunch ? velDelta : 0) * p.turnPunch * 0.4;
    p.bank += (bankTarget - p.bank) * Math.min(1, dt * 9);

    const speedFrac = Math.min(1, Math.hypot(p.vx, p.vy) / maxSpeed);
    const thrusting = inputY < 0 || speedFrac > 0.15;
    if (thrusting) {
        const particleCount = 1 + Math.round(speedFrac * 2);
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: p.x + (Math.random() - 0.5) * 10, y: p.y + p.h * 0.42,
                vx: (Math.random() - 0.5) * (1.5 + speedFrac * 2), vy: 3 + Math.random() * 2 + speedFrac * 2,
                size: 1.5 + Math.random() * 1.5 + speedFrac, life: 0.3, maxLife: 0.3,
                color: Math.random() < 0.5 ? '#00f0ff' : '#ffffff'
            });
        }
    }
}
function getWeaponEmitters(cols) {
    if (cols <= 1) return [{ xFrac: 0, yFrac: -0.5 }];
    if (cols === 2) return [{ xFrac: -0.38, yFrac: 0.1 }, { xFrac: 0.38, yFrac: 0.1 }];
    if (cols === 3) return [{ xFrac: -0.42, yFrac: 0.1 }, { xFrac: 0, yFrac: -0.5 }, { xFrac: 0.42, yFrac: 0.1 }];
    if (cols === 4) return [
        { xFrac: -0.48, yFrac: 0.2 }, { xFrac: -0.2, yFrac: 0.02 },
        { xFrac: 0.2, yFrac: 0.02 }, { xFrac: 0.48, yFrac: 0.2 }
    ];
    return [
        { xFrac: -0.52, yFrac: 0.25 }, { xFrac: -0.26, yFrac: 0.05 },
        { xFrac: 0, yFrac: -0.5 },
        { xFrac: 0.26, yFrac: 0.05 }, { xFrac: 0.52, yFrac: 0.25 }
    ];
}
function createBulletPattern() {
    const speed = getBulletSpeed();
    const pierce = playerUpgrades.pierce || 0;
    const homing = (playerUpgrades.homing || 0) > 0 || homingTimer > 0;
    const cols = getBulletCount();
    const emitters = getWeaponEmitters(cols);
    const pattern = [];
    emitters.forEach(em => {
        pattern.push({
            x: player.x + em.xFrac * player.w, y: player.y + em.yFrac * player.h,
            vx: em.xFrac * 2.5, vy: -speed, r: 3, color: '#00f0ff', friendly: true, pierce, homing
        });
    });
    return pattern;
}
function shoot() {
    const pattern = createBulletPattern();
    pattern.forEach(b => { bullets.push(b); shotsFired++; });
    pattern.forEach(b => particles.push(makeParticle(b.x, b.y, '#00f0ff', 2, 0.3)));
    player.muzzleFlash = 0.09;
}
function spawnPlayerMissile() {
    const count = getMissileCount();
    if (count <= 0 || missileCooldown > 0) return;
    missileCooldown = 0.75;
    const offsets = count === 1 ? [0] : (count === 2 ? [-12, 12] : [-16, 0, 16]);
    offsets.forEach(ox => {
        missiles.push({
            x: player.x + ox, y: player.y - player.h * 0.3,
            vx: (ox / 16) * 1.5, vy: -7.5,
            trackTime: 2.2, turnRate: 0.095, r: 4.5, friendly: true, exploded: false, life: 5.0
        });
    });
}
function spawnEnemyMissile(e) {
    e.missileLock = 0.65;
    e.pendingMissile = true;
}
function launchEnemyMissile(e) {
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    const spd = 4.2;
    missiles.push({
        x: e.x, y: e.y + (e.h || e.w) * 0.2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        trackTime: 1.8, // tracks for 1.8 seconds, then stops chasing!
        turnRate: 0.058,
        r: 4.5,
        friendly: false,
        exploded: false,
        life: 4.5
    });
    e.pendingMissile = false;
    e.muzzleFlash = 0.18;
    explode(e.x, e.y + 10, '#ff3300', 8);
}
function enemyShoot(e, opts) {
    opts = opts || {};
    const angle = Math.atan2(player.y - e.y, player.x - e.x);
    const spd = opts.speed || 5;
    const color = opts.color || e.color || '#ff2d95';
    const kind = opts.kind || 'bolt';
    bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, r: opts.r || 3, color, friendly: false, kind });
    for (let i = 0; i < 4; i++) particles.push(makeParticle(e.x, e.y, color, 2, 0.25));
}
function makeParticle(x, y, color, size, life) {
    return { x, y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, size: size || 3, life: life || 0.6, maxLife: life || 0.6, color };
}
function explode(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
        const speed = Math.random() * 5 + 2;
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size: Math.random() * 3 + 1, life: 0.8 + Math.random() * 0.4, maxLife: 1.2, color });
    }
}
function destroyShip(x, y, color, size, segmented) {

    const scale = Math.max(0.6, Math.min(3, size / 26));

    // 1. armor fragments break away (rotating rect debris, flung outward)
    const fragCount = Math.round(6 + scale * 6);
    for (let i = 0; i < fragCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4 * scale;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: (2 + Math.random() * 3) * scale, life: 0.6 + Math.random() * 0.5, maxLife: 1.1,
            color: Math.random() < 0.5 ? '#888' : '#444', shape: 'debris',
            rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.6
        });
    }

    // segmented (splitter) craft: its distinct hull sections visibly separate and fly apart
    if (segmented) {
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 * i) / 3 + Math.random() * 0.4;
            const speed = 1.5 + Math.random() * 2.5;
            particles.push({
                x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 2, life: 1.0 + Math.random() * 0.4, maxLife: 1.4,
                color, shape: 'debris', rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.5
            });
        }
    }

    // 2. energy core flash (bright white-hot center flash)
    for (let i = 0; i < Math.round(8 * scale); i++) {
        particles.push(makeParticle(x, y, '#ffffff', (2 + Math.random() * 2) * scale, 0.25));
    }

    // 3. explosion expands (colored shockwave burst)
    explode(x, y, color, Math.round(18 * scale));
    explode(x, y, '#ffe600', Math.round(6 * scale));

    // 4. debris spreads outward (secondary slower-moving chunks)
    const debrisCount = Math.round(4 + scale * 4);
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 1.8 * scale;
        particles.push({
            x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: (1.5 + Math.random() * 2) * scale, life: 0.9 + Math.random() * 0.6, maxLife: 1.5,
            color: '#2a2a2a', shape: 'debris', rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.4
        });
    }

    // 5. particles fade — handled automatically by existing life/maxLife decay in updateParticles

    // 6. larger ships create stronger shockwaves
    triggerShake(scale > 1.8 ? 'heavy' : scale > 1.1 ? 'medium' : 'light');
    if (scale > 1.3) {
        powerupRings.push({ x, y, r: 4, maxR: 30 + scale * 25, color: '#ffffff', life: 0.4, maxLife: 0.4 });
    }
}
function addScorePopup(x, y, text, color) {
    scorePopups.push({ x, y, text, color: color || '#fff', life: 1.0, maxLife: 1.0 });
}
function updateScorePopups(dt) {
    scorePopups.forEach(p => { p.y -= 40 * dt; p.life -= dt; });
    scorePopups = scorePopups.filter(p => p.life > 0);
}
function drawScorePopups() {
    scorePopups.forEach(p => {
        const alpha = p.life / p.maxLife;
        const scale = 0.8 + (1 - alpha) * 0.4;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${Math.floor(14 * scale)}px Orbitron, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillText(p.text, p.x, p.y);
        ctx.restore();
    });
}
function spawnEnemy() {
    const weighted = [
        { type: 'basic', w: 3 }, { type: 'fast', w: 2 }, { type: 'tank', w: 2 }, { type: 'shooter', w: 2 }
    ];
    if (wave >= 4) weighted.push({ type: 'splitter', w: 1.5 });
    if (wave >= 5) weighted.push({ type: 'zigzag', w: 1.5 });
    if (wave >= 6) weighted.push({ type: 'shielded', w: 1.2 });
    if (wave >= 7) weighted.push({ type: 'orbiter', w: 1.2 });
    if (wave >= 8) weighted.push({ type: 'bomber', w: 1 });
    // ── new enemy classes, progressively unlocked, kept uncommon via low weight ──
    if (wave >= 3) { weighted.push({ type: 'interceptor', w: 1.3 }); weighted.push({ type: 'flanker', w: 1.1 }); }
    if (wave >= 5) { weighted.push({ type: 'sniper', w: 0.9 }); weighted.push({ type: 'minelayer', w: 0.8 }); }
    if (wave >= 7) { weighted.push({ type: 'empship', w: 0.7 }); weighted.push({ type: 'shieldsupport', w: 0.7 }); }
    if (wave >= 9) { weighted.push({ type: 'elite', w: 0.6 }); }

    const totalW = weighted.reduce((s, e) => s + e.w, 0);
    let r = Math.random() * totalW;
    let type = weighted[0].type;
    for (const w2 of weighted) { r -= w2.w; if (r <= 0) { type = w2.type; break; } }

    const x = Math.random() * (W - 80) + 40;

    const atkMult = getAttackFrequencyMult();
    const configs = {
        basic: { w: 24, h: 24, hp: 1, speed: 2, color: '#ff2d95', score: 100, canShoot: wave >= 2, shootTimer: (2.5 + Math.random() * 2) * atkMult },
        fast: { w: 20, h: 20, hp: 1, speed: 4.5, color: '#ff6a00', score: 150, canShoot: wave >= 3, shootTimer: (2.0 + Math.random() * 2) * atkMult },
        tank: { w: 40, h: 40, hp: 3, speed: 1.2, color: '#b44dff', score: 300, canShoot: true, shootTimer: 2.0 * atkMult },
        shooter: { w: 26, h: 26, hp: 2, speed: 1.5, color: '#ffe600', score: 250, canShoot: true, shootTimer: (1.3 + Math.random()) * atkMult },
        zigzag: { w: 22, h: 22, hp: 1, speed: 3, color: '#39ff14', score: 200, phase: Math.random() * Math.PI * 2, canShoot: wave >= 3, shootTimer: (2.2 + Math.random() * 2) * atkMult },
        splitter: { w: 28, h: 28, hp: 2, speed: 1.8, color: '#ff9900', score: 180, splits: true, canShoot: wave >= 2, shootTimer: 2.6 * atkMult },
        splitterMini: { w: 14, h: 14, hp: 1, speed: 3.2, color: '#ff9900', score: 60 },
        shielded: { w: 30, h: 30, hp: 2, speed: 1.3, color: '#00d4ff', score: 280, shieldAngle: Math.random() * Math.PI * 2, hasShield: true, canShoot: true, shootTimer: 2.4 * atkMult },
        orbiter: { w: 20, h: 20, hp: 1, speed: 0.8, color: '#c9ff00', score: 220, orbitR: 50 + Math.random() * 30, orbitDir: Math.random() < 0.5 ? 1 : -1, canShoot: wave >= 2, shootTimer: (2.2 + Math.random()) * atkMult },
        bomber: { w: 38, h: 32, hp: 2, speed: 1.5, color: '#ff0055', score: 220, diving: false, diveDelay: 1 + Math.random(), canShoot: true, shootTimer: 1.8 * atkMult },

        // ── new enemy classes ──
        interceptor: { w: 18, h: 20, hp: 1, speed: 5.5, color: '#ff3355', score: 170, canShoot: true, shootTimer: (1.6 + Math.random()) * atkMult, attackRun: false, runCooldown: 0 },
        sniper: { w: 26, h: 30, hp: 2, speed: 0.6, color: '#e600ff', score: 260, canShoot: true, shootTimer: (3.5 + Math.random() * 1.5) * atkMult, settled: false },
        flanker: { w: 22, h: 20, hp: 1, speed: 3.3, color: '#ff9933', score: 190, canShoot: true, shootTimer: (1.8 + Math.random()) * atkMult, side: Math.random() < 0.5 ? -1 : 1, dashCooldown: 1.5, dashTelegraph: 0 },
        empship: { w: 32, h: 26, hp: 2, speed: 1.0, color: '#00ccff', score: 240, canShoot: false, empTimer: (3 + Math.random() * 1.5) * atkMult },
        minelayer: { w: 34, h: 28, hp: 2, speed: 0.9, color: '#cc8800', score: 230, canShoot: false, layTimer: (2.2 + Math.random()) * atkMult },
        shieldsupport: { w: 28, h: 24, hp: 2, speed: 1.1, color: '#66ffcc', score: 250, canShoot: false, pulseTimer: (2.5 + Math.random()) * atkMult },
        elite: { w: 30, h: 30, hp: 4, speed: 2.2, color: '#ff0044', score: 400, canShoot: true, shootTimer: (1.4 + Math.random()) * atkMult }
    };
    const c = configs[type];
    const e = { x, y: -30, type, ...c, maxHp: c.hp, baseX: x, baseY: -30, time: 0, telegraph: 0, muzzleFlash: 0, missileLock: 0, pendingMissile: false };
    if (type === 'orbiter') e.orbitAngle = Math.random() * Math.PI * 2;
    if (type === 'sniper') e.targetY = 90 + Math.random() * 60;
    enemies.push(e);

    if (type === 'flanker') { e.x = e.side < 0 ? -20 : W + 20; e.y = 80 + Math.random() * 150; }

    if (type === 'sniper') return;
}
function spawnDroneSwarm() {

    const clusterSize = 2 + Math.floor(Math.random() * 2);
    const baseX = Math.random() * (W - 120) + 60;
    for (let i = 0; i < clusterSize; i++) {
        const x = baseX + (i - clusterSize / 2) * 26;
        const atkMult = getAttackFrequencyMult();
        const e = {
            x, y: -30, type: 'droneswarmer', w: 14, h: 14, hp: 1, maxHp: 1, speed: 2.5,
            color: '#00ffaa', score: 70, canShoot: true, shootTimer: (1 + Math.random()) * atkMult,
            baseX: x, baseY: -30, time: 0, telegraph: 0, muzzleFlash: 0, missileLock: 0, pendingMissile: false,
            wobble: Math.random() * Math.PI * 2
        };
        enemies.push(e);
    }
}

function getAttackFrequencyMult() {
    return Math.max(0.5, 1 - (wave - 1) * 0.035);
}

function getAdvancedPatternChance(baseAtWave2, maxChance) {
    if (wave < 2) return 0;
    const t = Math.min(1, (wave - 2) / 12);
    return baseAtWave2 + (maxChance - baseAtWave2) * t;
}
function splitEnemy(e) {
    for (let i = 0; i < 2; i++) {
        const c = { w: 14, h: 14, hp: 1, speed: 3.2, color: '#ff9900', score: 60 };
        enemies.push({
            x: e.x + (i === 0 ? -14 : 14), y: e.y, type: 'splitterMini',
            ...c, maxHp: c.hp, baseX: e.x, baseY: e.y, time: 0, telegraph: 0, muzzleFlash: 0, missileLock: 0, pendingMissile: false
        });
    }
}
function enemyFire(e) {
    const missileChance = getAdvancedPatternChance(0.20, 0.55);
    const roll = Math.random();

    if (e.type === 'tank') {
        const burstChance = getAdvancedPatternChance(0.08, 0.35);
        if (wave >= 2 && roll < missileChance) {
            spawnEnemyMissile(e);
        } else if (wave >= 2 && roll < missileChance + burstChance) {
            e.burstQueue = 3;
            e.burstTimer = 0;
        } else {
            [-6, 6].forEach(ox => {
                const angle = Math.atan2(player.y - e.y, player.x - (e.x + ox));
                bullets.push({ x: e.x + ox, y: e.y, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, r: 4, color: '#b44dff', friendly: false, kind: 'heavy' });
            });
        }
    } else if (e.type === 'bomber') {
        if (roll < 0.65) {
            spawnEnemyMissile(e);
        } else {
            enemyShoot(e, { color: '#ff0055', speed: 5.5, r: 4, kind: 'heavy' });
        }
    } else if (e.type === 'shooter') {
        if (wave >= 2 && roll < missileChance * 0.5) {
            spawnEnemyMissile(e);
        } else if (wave >= 2 && Math.random() < getAdvancedPatternChance(0.08, 0.42)) {
            for (let i = -1; i <= 1; i++) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x) + i * 0.22;
                bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, r: 3, color: '#ffe600', friendly: false, kind: 'bolt' });
            }
        } else {
            enemyShoot(e, { color: '#ffe600', speed: 5.5, kind: 'bolt' });
        }
    } else if (e.type === 'shielded') {
        if (wave >= 2 && roll < missileChance * 0.4) {
            spawnEnemyMissile(e);
        } else if (wave >= 2 && Math.random() < getAdvancedPatternChance(0.06, 0.4)) {
            const spokes = 6;
            for (let i = 0; i < spokes; i++) {
                const angle = (Math.PI * 2 * i) / spokes;
                bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, r: 3, color: '#00d4ff', friendly: false, kind: 'bolt' });
            }
        } else {
            enemyShoot(e, { color: '#00d4ff', speed: 5, kind: 'bolt' });
        }
    } else if (e.type === 'interceptor') {

        for (let i = -1; i <= 1; i++) {
            const angle = Math.atan2(player.y - e.y, player.x - e.x) + i * 0.15;
            bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6, r: 2.5, color: '#ff3355', friendly: false, kind: 'bolt' });
        }
    } else if (e.type === 'sniper') {

        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3, r: 5, color: '#e600ff', friendly: false, kind: 'heavy' });
    } else if (e.type === 'elite') {
        if (wave >= 9 && roll < 0.3) {
            spawnEnemyMissile(e);
        } else {
            e.burstQueue = 4;
            e.burstTimer = 0;
            e.burstColor = '#ff0044';
        }
    } else if (e.type === 'droneswarmer') {

        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, r: 2, color: '#00ffaa', friendly: false, kind: 'bolt' });
    } else if (e.type === 'flanker') {

        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, r: 3, color: '#ff9933', friendly: false, kind: 'bolt' });
    } else {
        if (wave >= 2 && roll < missileChance * 0.3) {
            spawnEnemyMissile(e);
        } else {
            enemyShoot(e);
        }
    }
    e.muzzleFlash = 0.15;
}

function empShipPulse(e) {

    empDebuffTimer = 3;
    for (let i = 0; i < 24; i++) {
        const angle = (Math.PI * 2 * i) / 24;
        particles.push({
            x: e.x, y: e.y, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
            size: 2.5, life: 0.4, maxLife: 0.4, color: '#00ccff'
        });
    }
    triggerShake('light');
}
function minelayerDrop(e) {
    if (mines.length >= 12) return;
    mines.push({
        x: e.x, y: e.y, targetY: e.y, settled: false, r: 10,
        timer: 2.5, color: '#cc8800'
    });
}
function shieldSupportPulse(e) {
    const radius = 130;
    let count = 0;
    enemies.forEach(other => {
        if (other === e || other.type === 'shieldsupport' || count >= 3) return;
        const dist = Math.hypot(other.x - e.x, other.y - e.y);
        if (dist < radius) {
            other.supportedBy = e;
            other.supportedTimer = 4;
            count++;
        }
    });
    for (let i = 0; i < 10; i++) particles.push(makeParticle(e.x, e.y, '#66ffcc', 2, 0.35));
}

function updateEnemies(dt) {
    enemies.forEach(e => {
        const prevX = e.x;
        const prevY = e.y;
        e.time += dt;
        if (e.muzzleFlash > 0) e.muzzleFlash -= dt;
        if (e.shieldFlash > 0) e.shieldFlash -= dt;
        if (e.supportedTimer > 0) { e.supportedTimer -= dt; if (e.supportedTimer <= 0) e.supportedBy = null; }

        if (e.type === 'zigzag') {
            e.y += e.speed * dt * 60;
            e.x = e.baseX + Math.sin((e.phase || 0) + e.time * 4) * 60;
        } else if (e.type === 'orbiter') {
            if (e.baseY < 120) e.baseY += e.speed * dt * 60;
            e.orbitAngle += e.orbitDir * dt * 2;
            e.x = e.baseX + Math.cos(e.orbitAngle) * e.orbitR;
            e.y = e.baseY + Math.sin(e.orbitAngle) * e.orbitR * 0.6;
        } else if (e.type === 'droneswarmer') {
            e.y += e.speed * dt * 60;
            e.x = e.baseX + Math.sin(e.wobble + e.time * 3) * 18 + Math.sign(player.x - e.baseX) * Math.min(30, e.time * 4);
        } else if (e.type === 'interceptor') {
            e.y += e.speed * dt * 60;
            const dx = player.x - e.x;
            e.x += Math.sign(dx) * Math.min(Math.abs(dx), e.speed * 1.4 * dt * 60);
        } else if (e.type === 'sniper') {
            if (e.y < e.targetY) {
                e.y += e.speed * dt * 60 * 3;
            } else {
                e.y = e.targetY;
                const dx = player.x - e.x;
                e.x += Math.sign(dx) * Math.min(Math.abs(dx), 0.6 * dt * 60);
            }
        } else if (e.type === 'flanker') {
            if (!e.dashing) {
                e.x += -e.side * e.speed * dt * 60;
                e.y += e.speed * 0.5 * dt * 60;
                e.dashCooldown -= dt;
                if (e.dashCooldown <= 0 && e.dashTelegraph <= 0 && Math.abs(e.y - player.y) < 220) e.dashTelegraph = 0.4;
                if (e.dashTelegraph > 0) {
                    e.dashTelegraph -= dt;
                    if (e.dashTelegraph <= 0) {
                        e.dashing = true;
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        e.vx = Math.cos(angle) * 6.5; e.vy = Math.sin(angle) * 6.5;
                        e.dashTime = 0.5;
                    }
                }
            } else {
                e.x += e.vx * dt * 60; e.y += e.vy * dt * 60;
                e.dashTime -= dt;
                if (e.dashTime <= 0) { e.dashing = false; e.dashCooldown = 2 + Math.random(); }
            }
        } else if (e.type === 'empship') {
            e.y += e.speed * dt * 60;
            if (e.y > 300) e.y = 300;
            e.empTimer -= dt;
            if (e.empTimer <= 0 && e.telegraph <= 0) e.telegraph = 0.7;
            if (e.telegraph > 0) {
                e.telegraph -= dt;
                if (e.telegraph <= 0) { empShipPulse(e); e.empTimer = (5 + Math.random() * 2) * getAttackFrequencyMult(); }
            }
        } else if (e.type === 'minelayer') {
            e.y += e.speed * dt * 60;
            if (e.y > 400) e.y = 400;
            e.layTimer -= dt;
            if (e.layTimer <= 0) { minelayerDrop(e); e.layTimer = (2.5 + Math.random()) * getAttackFrequencyMult(); }
        } else if (e.type === 'shieldsupport') {
            e.y += e.speed * dt * 60;
            if (e.y > 250) e.y = 250;
            e.pulseTimer -= dt;
            if (e.pulseTimer <= 0) { shieldSupportPulse(e); e.pulseTimer = (3.5 + Math.random()) * getAttackFrequencyMult(); }
        } else if (e.type === 'bomber') {
            if (!e.diving) {
                e.y += e.speed * dt * 60;
                e.diveDelay -= dt;
                if (e.diveDelay <= 0 && e.y > 40 && e.telegraph <= 0) e.telegraph = 0.5;
                if (e.telegraph > 0) {
                    e.telegraph -= dt;
                    if (e.telegraph <= 0) {
                        e.diving = true;
                        const angle = Math.atan2(player.y - e.y, player.x - e.x);
                        e.vx = Math.cos(angle) * 7.5;
                        e.vy = Math.sin(angle) * 7.5;
                    }
                }
            } else {
                e.x += e.vx * dt * 60;
                e.y += e.vy * dt * 60;
            }
        } else if (e.type === 'shielded') {
            e.y += e.speed * dt * 60;
            e.shieldAngle += dt * 1.2;
        } else {
            e.y += e.speed * dt * 60;
        }

        // Calculate physics velocity and momentum
        const frameVx = (e.x - prevX) / (dt * 60 || 1);
        const frameVy = (e.y - prevY) / (dt * 60 || 1);
        e.actualVx = frameVx;
        e.actualVy = frameVy;
        const currentSpeed = Math.hypot(frameVx, frameVy);
        e.speedFrac = Math.min(1, currentSpeed / 5);

        // Smooth physics-based banking roll
        const targetBank = Math.max(-1, Math.min(1, frameVx / 2.2));
        e.bank = (e.bank || 0) + (targetBank - (e.bank || 0)) * Math.min(1, dt * 9);

        // Engine exhaust physics: spawn wake particles behind engine nacelles
        if (e.y > -20 && e.y < H + 20 && Math.random() < (0.35 + e.speedFrac * 0.45)) {
            const shipAngle = (e.type === 'bomber' && e.diving && e.vx !== undefined && e.vy !== undefined)
                ? (Math.atan2(e.vy, e.vx) - Math.PI / 2)
                : (Math.PI + (e.bank || 0) * 0.25);
            const h = e.w * 1.14;
            const cosA = Math.cos(shipAngle), sinA = Math.sin(shipAngle);

            [-e.w * 0.26, e.w * 0.26].forEach(ox => {
                const oy = h * 0.47;
                const wx = e.x + (ox * cosA - oy * sinA);
                const wy = e.y + (ox * sinA + oy * cosA);
                const pSpeed = 2 + e.speedFrac * 4;
                const trailAngle = shipAngle + Math.PI / 2;
                particles.push({
                    x: wx,
                    y: wy,
                    vx: -Math.cos(trailAngle) * pSpeed + (Math.random() - 0.5) * 1.5,
                    vy: -Math.sin(trailAngle) * pSpeed + (Math.random() - 0.5) * 1.5,
                    size: 1.2 + Math.random() * 1.4 + e.speedFrac * 1.2,
                    life: 0.25,
                    maxLife: 0.25,
                    color: Math.random() < 0.6 ? e.color : '#ffffff'
                });
            });
        }

        if (e.pendingMissile) {
            e.missileLock -= dt;
            if (e.missileLock <= 0) launchEnemyMissile(e);
        } else if (e.burstQueue > 0) {
            e.burstTimer -= dt;
            if (e.burstTimer <= 0) {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                bullets.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 4.5, vy: Math.sin(angle) * 4.5, r: 3.5, color: e.burstColor || '#b44dff', friendly: false, kind: 'heavy' });
                e.muzzleFlash = 0.12;
                e.burstQueue--;
                e.burstTimer = 0.14;
            }
        } else if (e.canShoot && e.y > 20) {
            if (e.telegraph > 0 && e.type !== 'bomber') {
                e.telegraph -= dt;
                if (e.telegraph <= 0) {
                    enemyFire(e);
                    const cooldowns = {
                        sniper: 3.5 + Math.random() * 1.5,
                        interceptor: 1.4 + Math.random(),
                        elite: 1.3 + Math.random(),
                        droneswarmer: 0.9 + Math.random() * 0.6,
                        flanker: 1.6 + Math.random()
                    };
                    e.shootTimer = (cooldowns[e.type] || (1.5 + Math.random())) * getAttackFrequencyMult();
                }
            } else if (e.type !== 'bomber') {
                e.shootTimer -= dt;
                if (e.shootTimer <= 0) {
                    const telegraphs = { sniper: 1.3, interceptor: 0.2, droneswarmer: 0.15 };
                    e.telegraph = telegraphs[e.type] || 0.35;
                }
            }
        }
    });
    enemies = enemies.filter(e => e.y < H + 50 && e.y > -200 && e.x > -100 && e.x < W + 100);
}

function drawEnemyShip(e) {
    const c = e.color;
    const w = e.w;
    const h = e.w * 1.14; // match sleek fighter aspect ratio
    const t = performance.now();
    const engineFlicker = 0.75 + Math.sin(t * 0.02 + e.x) * 0.25;
    const speedFrac = e.speedFrac || 0.3;
    const bank = e.bank || 0;

    // Differential thrust physics: outer engine burns stronger when banking to push the turn
    const leftBoost = 1 - Math.max(0, -bank) * 0.35 + Math.max(0, bank) * 0.25;
    const rightBoost = 1 - Math.max(0, bank) * 0.35 + Math.max(0, -bank) * 0.25;
    const thrustBoost = 1 + speedFrac * 1.4;

    // Calculate rotation with physics banking
    let shipAngle = Math.PI;
    if (e.type === 'bomber' && e.diving && e.vx !== undefined && e.vy !== undefined) {
        shipAngle = Math.atan2(e.vy, e.vx) - Math.PI / 2;
    } else {
        shipAngle += bank * 0.25;
    }

    ctx.save();
    ctx.translate(e.x, e.y);

    // Render special atmospheric effects (e.g. Orbiter halo, Shielded barrier)
    if (e.type === 'orbiter') {
        ctx.save();
        ctx.rotate(e.time * 3);
        ctx.strokeStyle = c;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, 0, w * 0.75, w * 0.38, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    if (e.type === 'shielded') {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.65 + 6, e.shieldAngle - 0.8, e.shieldAngle + 0.8);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0,212,255,0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.65 + 6, 0, Math.PI * 2);
        ctx.stroke();
        if (e.shieldFlash > 0) {
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = e.shieldFlash;
            ctx.lineWidth = 2;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, w * 0.65 + 6 + (1 - e.shieldFlash) * 14, e.shieldAngle - 0.9, e.shieldAngle + 0.9);
            ctx.stroke();
        }
        ctx.restore();
    }

    // Ally-support protective aura, granted by a nearby Shield Support Ship
    if (e.supportedBy) {
        ctx.save();
        ctx.strokeStyle = 'rgba(102,255,204,0.55)';
        ctx.shadowColor = '#66ffcc';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.6 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // Shield Support Ship - own protective pulse radius (shows its area of effect)
    if (e.type === 'shieldsupport') {
        const pulseAlpha = 0.12 + Math.sin(e.time * 2) * 0.05;
        ctx.save();
        ctx.strokeStyle = `rgba(102,255,204,${pulseAlpha + 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 130, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Sniper - visible aiming beam telegraph before its slow, powerful shot
    if (e.type === 'sniper' && e.telegraph > 0) {
        const aimProgress = 1 - e.telegraph / 1.3;
        ctx.save();
        ctx.strokeStyle = '#e600ff';
        ctx.globalAlpha = 0.25 + aimProgress * 0.5;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = '#e600ff';
        ctx.shadowBlur = 12;
        ctx.setLineDash([6, 6]);
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 500, Math.sin(angle) * 500);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
    }

    // EMP Ship - charging ring telegraph before its disruptive pulse
    if (e.type === 'empship' && e.telegraph > 0) {
        const chargeProgress = 1 - e.telegraph / 0.7;
        ctx.save();
        ctx.strokeStyle = '#00ccff';
        ctx.globalAlpha = 0.4 + Math.sin(t * 0.04) * 0.3;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.5 + chargeProgress * 24, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Flanker - engine glow surge while lining up its dash attack
    if (e.type === 'flanker' && e.dashTelegraph > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.3 + Math.sin(t * 0.05) * 0.25;
        ctx.shadowColor = '#ff9933';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Interceptor - forward speed streaks (reads as fast/aggressive even when stationary)
    if (e.type === 'interceptor') {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,51,85,0.4)';
        ctx.lineWidth = 1;
        [-6, 6].forEach(ox => {
            ctx.beginPath();
            ctx.moveTo(ox, -h * 0.1);
            ctx.lineTo(ox, -h * 0.5 - speedFrac * 14);
            ctx.stroke();
        });
        ctx.restore();
    }

    // Apply ship rotation
    ctx.save();
    ctx.rotate(shipAngle);

    // ══════════════════ HULL GEOMETRY — genuinely distinct per enemy class ══════════════════
    // Each class gets its own engine layout, wing (or non-wing) structure, and fuselage silhouette,
    // so classes are identifiable by shape alone, not just color. Shared finishing techniques
    // (gradients, panel seams, rivets, cockpit glass, energy core) are reused for visual consistency.

    function drawEngineCluster(positions, flameScale) {
        positions.forEach(({ ox, oy, boost, size }) => {
            const s = size || 1;
            const flameLen = (11 + engineFlicker * 8) * (w / 44) * (flameScale || 1.25) * thrustBoost * (boost || 1) * s;
            const turbulence = speedFrac > 0.4 ? (Math.random() - 0.5) * 2.5 : 0;
            ctx.save();
            ctx.translate(ox, oy);
            const flameGrad = ctx.createLinearGradient(0, 0, 0, flameLen);
            flameGrad.addColorStop(0, '#ffffff');
            flameGrad.addColorStop(0.3, c);
            flameGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = flameGrad;
            ctx.shadowColor = c;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.moveTo(-w * 0.07 * s, 0);
            ctx.lineTo(turbulence, flameLen);
            ctx.lineTo(w * 0.07 * s, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        });
        positions.forEach(({ ox, oy, size }) => {
            const s = size || 1;
            ctx.save();
            ctx.translate(ox, oy);
            const nacelleW = w * 0.13 * s, nacelleH = h * 0.22 * s;
            const nacelleGrad = ctx.createLinearGradient(-nacelleW, -nacelleH / 2, nacelleW, nacelleH / 2);
            nacelleGrad.addColorStop(0, '#3a3a52');
            nacelleGrad.addColorStop(1, '#15151f');
            ctx.fillStyle = nacelleGrad;
            ctx.strokeStyle = c;
            ctx.lineWidth = 1;
            ctx.shadowColor = c;
            ctx.shadowBlur = 4;
            ctx.beginPath();
            ctx.moveTo(-nacelleW, -nacelleH * 0.4);
            ctx.lineTo(nacelleW, -nacelleH * 0.4);
            ctx.lineTo(nacelleW * 1.15, nacelleH * 0.6);
            ctx.lineTo(-nacelleW * 1.15, nacelleH * 0.6);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#0a0a12';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, nacelleH * 0.55, nacelleW * 0.75, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(255,106,0,0.5)';
            ctx.lineWidth = 0.7;
            for (let i = 0; i < 2; i++) {
                ctx.beginPath();
                ctx.moveTo(-nacelleW * 0.7, -nacelleH * 0.1 + i * nacelleH * 0.22);
                ctx.lineTo(nacelleW * 0.7, -nacelleH * 0.1 + i * nacelleH * 0.22);
                ctx.stroke();
            }
            ctx.restore();
        });
        positions.forEach(({ ox, oy, boost, size }) => {
            const s = size || 1;
            const glowR = (w * 0.1 * s) * engineFlicker * (boost || 1);
            const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, glowR * 1.2);
            g.addColorStop(0, '#ffffff');
            g.addColorStop(0.4, c);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(ox, oy, glowR, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    function drawWingPair(spanMult, sweepFn, thicknessMult) {
        [-1, 1].forEach(side => {
            ctx.save();
            ctx.scale(side, 1);
            ctx.fillStyle = '#222233';
            ctx.beginPath();
            ctx.moveTo(w * 0.08, -h * 0.06);
            ctx.lineTo(w * 0.2, h * 0.02);
            ctx.lineTo(w * 0.14, h * 0.14);
            ctx.lineTo(w * 0.05, h * 0.08);
            ctx.closePath();
            ctx.fill();
            const span = w * 0.58 * spanMult;
            const wingGrad = ctx.createLinearGradient(0, 0, span, h * 0.32);
            wingGrad.addColorStop(0, '#38384f');
            wingGrad.addColorStop(0.5, '#242436');
            wingGrad.addColorStop(1, '#141420');
            ctx.fillStyle = wingGrad;
            ctx.strokeStyle = c;
            ctx.lineWidth = 1.2;
            ctx.shadowColor = c;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            const pts = sweepFn(span, thicknessMult || 1);
            ctx.moveTo(pts[0][0], pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(10,10,20,0.55)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(pts[0][0] * 1.3, pts[0][1] * 1.3 + h * 0.03);
            ctx.lineTo(span * 0.86, h * 0.26);
            ctx.stroke();
            ctx.fillStyle = c;
            ctx.shadowColor = c;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(span * 0.96, h * 0.28, Math.max(1.2, w * 0.04), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    function drawCockpit(cx, cy, rx, ry) {
        const cockGrad = ctx.createRadialGradient(cx, cy - ry * 0.1, 1, cx, cy, rx * 1.5);
        cockGrad.addColorStop(0, '#ffffff');
        cockGrad.addColorStop(0.5, c);
        cockGrad.addColorStop(1, '#0a1018');
        ctx.fillStyle = cockGrad;
        ctx.strokeStyle = 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 0.8;
        ctx.shadowColor = c;
        ctx.shadowBlur = 9;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    function drawEnergyCore(cx, cy, rMult) {
        const coreGlow = 0.5 + Math.sin(t * 0.006 + e.x) * 0.35;
        const coreR = Math.max(3, w * 0.14 * (rMult || 1));
        ctx.shadowBlur = 0;
        ctx.strokeStyle = c + '88';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR + 1, 0, Math.PI * 2);
        ctx.stroke();
        const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, c);
        coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fill();
    }
    function drawPanelDetail(hw, topY, botY) {
        ctx.strokeStyle = 'rgba(10,10,26,0.6)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-hw, topY); ctx.lineTo(hw, topY);
        ctx.moveTo(-hw * 0.9, botY); ctx.lineTo(hw * 0.9, botY);
        ctx.stroke();
        ctx.fillStyle = 'rgba(220,230,255,0.45)';
        [[-hw, topY], [hw, topY], [-hw * 0.9, botY], [hw * 0.9, botY]].forEach(([bx, by]) => {
            ctx.beginPath(); ctx.arc(bx, by, Math.max(0.6, w * 0.02), 0, Math.PI * 2); ctx.fill();
        });
    }
    function fuselageFill(points) {
        const hullGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
        hullGrad.addColorStop(0, '#e8e8f8');
        hullGrad.addColorStop(0.3, '#8888b0');
        hullGrad.addColorStop(0.65, '#35354e');
        hullGrad.addColorStop(1, '#151522');
        ctx.fillStyle = hullGrad;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    if (e.type === 'fast') {
        // Needle-thin airframe, sharply swept-back wings, twin close-set engines - built for speed, minimal armor
        drawEngineCluster([{ ox: -w * 0.14, oy: h * 0.42, boost: leftBoost }, { ox: w * 0.14, oy: h * 0.42, boost: rightBoost }], 2.1);
        drawWingPair(0.75, (span) => [[w * 0.05, -h * 0.1], [span, h * 0.36], [span * 0.7, h * 0.44], [w * 0.1, h * 0.1]]);
        fuselageFill([[0, -h * 0.56], [w * 0.08, -h * 0.1], [w * 0.06, h * 0.36], [0, h * 0.42], [-w * 0.06, h * 0.36], [-w * 0.08, -h * 0.1]]);
        drawPanelDetail(w * 0.05, -h * 0.05, h * 0.2);
        drawCockpit(0, -h * 0.2, w * 0.06, h * 0.13);
        drawEnergyCore(0, h * 0.1, 0.8);
        ctx.fillStyle = '#0d0d1a'; ctx.fillRect(-w * 0.02, -h * 0.58, w * 0.04, h * 0.1);

    } else if (e.type === 'tank') {
        // Wide slab hull, thick stubby wings, four engines - visibly the heaviest craft on screen
        drawEngineCluster([
            { ox: -w * 0.32, oy: h * 0.4, boost: leftBoost, size: 1.15 }, { ox: -w * 0.1, oy: h * 0.44, boost: leftBoost, size: 0.85 },
            { ox: w * 0.1, oy: h * 0.44, boost: rightBoost, size: 0.85 }, { ox: w * 0.32, oy: h * 0.4, boost: rightBoost, size: 1.15 }
        ], 1.0);
        drawWingPair(1.15, (span) => [[w * 0.1, -h * 0.02], [span, h * 0.2], [span * 0.9, h * 0.42], [w * 0.16, h * 0.3]], 1.3);
        fuselageFill([[0, -h * 0.48], [w * 0.24, -h * 0.2], [w * 0.22, h * 0.34], [0, h * 0.4], [-w * 0.22, h * 0.34], [-w * 0.24, -h * 0.2]]);
        drawPanelDetail(w * 0.16, -h * 0.05, h * 0.18);
        ctx.fillStyle = '#0f0f18'; ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.fillRect(w * 0.38, -h * 0.05, w * 0.1, h * 0.28); ctx.strokeRect(w * 0.38, -h * 0.05, w * 0.1, h * 0.28);
        ctx.fillRect(-w * 0.48, -h * 0.05, w * 0.1, h * 0.28); ctx.strokeRect(-w * 0.48, -h * 0.05, w * 0.1, h * 0.28);
        drawCockpit(0, -h * 0.14, w * 0.11, h * 0.14);
        drawEnergyCore(0, h * 0.14, 1.3);
        ctx.fillStyle = '#0d0d1a'; ctx.fillRect(-w * 0.04, -h * 0.5, w * 0.08, h * 0.1);

    } else if (e.type === 'shooter') {
        // Weapon-focused platform: stubby frame dominated by a thick under-slung gun pod
        drawEngineCluster([{ ox: -w * 0.24, oy: h * 0.4, boost: leftBoost }, { ox: w * 0.24, oy: h * 0.4, boost: rightBoost }], 1.1);
        drawWingPair(0.55, (span) => [[w * 0.09, 0], [span, h * 0.22], [span * 0.8, h * 0.3], [w * 0.14, h * 0.12]]);
        fuselageFill([[0, -h * 0.3], [w * 0.16, -h * 0.05], [w * 0.13, h * 0.34], [0, h * 0.42], [-w * 0.13, h * 0.34], [-w * 0.16, -h * 0.05]]);
        drawPanelDetail(w * 0.1, 0, h * 0.2);
        // Under-slung gun pod (the defining feature)
        ctx.fillStyle = '#141420'; ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.shadowColor = c; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(-w * 0.07, -h * 0.28); ctx.lineTo(w * 0.07, -h * 0.28); ctx.lineTo(w * 0.05, -h * 0.58); ctx.lineTo(-w * 0.05, -h * 0.58); ctx.closePath();
        ctx.fill(); ctx.stroke();
        drawCockpit(0, h * 0.02, w * 0.08, h * 0.1);
        drawEnergyCore(0, h * 0.2, 0.9);

    } else if (e.type === 'zigzag') {
        // Asymmetric agile fighter - one wing swept further back than the other, offset single engine
        drawEngineCluster([{ ox: w * 0.06, oy: h * 0.4, boost: rightBoost }], 1.4);
        ctx.save(); ctx.scale(1, 1);
        drawWingPair(1, (span, i) => i === 1 ? [[w * 0.06, -h * 0.04], [span, h * 0.5], [span * 0.6, h * 0.5], [w * 0.1, h * 0.16]] : [[w * 0.06, -h * 0.04], [span * 0.7, h * 0.22], [span * 0.5, h * 0.28], [w * 0.1, h * 0.1]]);
        ctx.restore();
        fuselageFill([[0, -h * 0.5], [w * 0.06, -h * 0.05], [w * 0.05, h * 0.32], [0, h * 0.4], [-w * 0.05, h * 0.32], [-w * 0.06, -h * 0.05]]);
        drawPanelDetail(w * 0.04, -h * 0.02, h * 0.16);
        drawCockpit(0, -h * 0.18, w * 0.055, h * 0.12);
        drawEnergyCore(0, h * 0.08, 0.75);

    } else if (e.type === 'shielded') {
        // Boxy defensive hull with physical shield-emitter pylons flanking the fuselage
        drawEngineCluster([{ ox: -w * 0.22, oy: h * 0.42, boost: leftBoost }, { ox: w * 0.22, oy: h * 0.42, boost: rightBoost }], 1.1);
        drawWingPair(0.5, (span) => [[w * 0.1, -h * 0.02], [span, h * 0.2], [span * 0.85, h * 0.3], [w * 0.15, h * 0.14]]);
        fuselageFill([[0, -h * 0.42], [w * 0.19, -h * 0.1], [w * 0.17, h * 0.34], [0, h * 0.42], [-w * 0.17, h * 0.34], [-w * 0.19, -h * 0.1]]);
        drawPanelDetail(w * 0.12, -h * 0.03, h * 0.18);
        // Shield emitter pylons - physical hardware, distinct from the projected shield arc effect
        [-1, 1].forEach(side => {
            ctx.save(); ctx.scale(side, 1);
            ctx.fillStyle = '#0d2a30'; ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(w * 0.2, -h * 0.06); ctx.lineTo(w * 0.34, -h * 0.02); ctx.lineTo(w * 0.3, h * 0.1); ctx.lineTo(w * 0.18, h * 0.06); ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#00d4ff'; ctx.shadowColor = '#00d4ff'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(w * 0.27, h * 0.02, 2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        });
        drawCockpit(0, -h * 0.12, w * 0.08, h * 0.12);
        drawEnergyCore(0, h * 0.12, 1.0);

    } else if (e.type === 'bomber') {
        // Large blocky heavy craft, short stub wings, twin heavy engines, wide flat belly for the ordnance bay
        drawEngineCluster([{ ox: -w * 0.3, oy: h * 0.44, boost: leftBoost, size: 1.3 }, { ox: w * 0.3, oy: h * 0.44, boost: rightBoost, size: 1.3 }], 1.0);
        drawWingPair(0.6, (span) => [[w * 0.14, h * 0.02], [span, h * 0.22], [span * 0.85, h * 0.36], [w * 0.2, h * 0.28]], 1.4);
        fuselageFill([[0, -h * 0.4], [w * 0.26, -h * 0.08], [w * 0.28, h * 0.34], [0, h * 0.44], [-w * 0.28, h * 0.34], [-w * 0.26, -h * 0.08]]);
        drawPanelDetail(w * 0.18, -h * 0.04, h * 0.16);
        drawCockpit(0, -h * 0.1, w * 0.09, h * 0.11);
        drawEnergyCore(0, h * 0.1, 1.1);

    } else if (e.type === 'minelayer') {
        // Wider, flatter heavy hull than the bomber - slow deployment vessel silhouette
        drawEngineCluster([{ ox: -w * 0.34, oy: h * 0.38, boost: leftBoost, size: 1.05 }, { ox: w * 0.34, oy: h * 0.38, boost: rightBoost, size: 1.05 }], 0.8);
        drawWingPair(0.68, (span) => [[w * 0.16, h * 0.08], [span, h * 0.16], [span * 0.9, h * 0.3], [w * 0.22, h * 0.26]], 1.6);
        fuselageFill([[0, -h * 0.3], [w * 0.32, -h * 0.06], [w * 0.34, h * 0.3], [0, h * 0.4], [-w * 0.34, h * 0.3], [-w * 0.32, -h * 0.06]]);
        drawPanelDetail(w * 0.2, -h * 0.02, h * 0.14);
        drawCockpit(0, -h * 0.06, w * 0.08, h * 0.09);
        drawEnergyCore(0, h * 0.14, 1.0);

    } else if (e.type === 'shieldsupport') {
        // Support vessel, not a fighter - no real wings, large flanking dish/panel structures instead
        drawEngineCluster([{ ox: -w * 0.16, oy: h * 0.4, boost: leftBoost, size: 0.8 }, { ox: w * 0.16, oy: h * 0.4, boost: rightBoost, size: 0.8 }], 0.7);
        fuselageFill([[0, -h * 0.36], [w * 0.14, -h * 0.14], [w * 0.16, h * 0.3], [0, h * 0.38], [-w * 0.16, h * 0.3], [-w * 0.14, -h * 0.14]]);
        drawPanelDetail(w * 0.1, -h * 0.02, h * 0.16);
        [-1, 1].forEach(side => {
            ctx.save(); ctx.scale(side, 1);
            const dishGrad = ctx.createRadialGradient(w * 0.34, 0, 2, w * 0.34, 0, w * 0.16);
            dishGrad.addColorStop(0, '#aaffee'); dishGrad.addColorStop(1, '#1a3a33');
            ctx.fillStyle = dishGrad; ctx.strokeStyle = '#66ffcc'; ctx.lineWidth = 1.2; ctx.shadowColor = '#66ffcc'; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(w * 0.34, 0, w * 0.15, h * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(10,20,20,0.5)'; ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.ellipse(w * 0.34, 0, w * 0.09, h * 0.1, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        });
        drawCockpit(0, -h * 0.08, w * 0.07, h * 0.1);
        drawEnergyCore(0, h * 0.12, 1.1);

    } else if (e.type === 'elite') {
        // Larger double-layered armor, bigger sweeping wings, quad weapon mounts - clearly superior tech
        drawEngineCluster([{ ox: -w * 0.26, oy: h * 0.44, boost: leftBoost, size: 1.1 }, { ox: w * 0.26, oy: h * 0.44, boost: rightBoost, size: 1.1 }], 1.4);
        drawWingPair(1.3, (span) => [[w * 0.09, -h * 0.05], [span, h * 0.3], [span * 0.82, h * 0.44], [w * 0.15, h * 0.24]], 1.15);
        fuselageFill([[0, -h * 0.56], [w * 0.19, -h * 0.16], [w * 0.16, h * 0.36], [0, h * 0.46], [-w * 0.16, h * 0.36], [-w * 0.19, -h * 0.16]]);
        // Secondary inner armor layer, visible seam
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, -h * 0.5); ctx.lineTo(w * 0.14, -h * 0.14); ctx.lineTo(w * 0.12, h * 0.3); ctx.stroke();
        drawPanelDetail(w * 0.13, -h * 0.06, h * 0.2);
        ctx.fillStyle = '#0d0d1a'; ctx.shadowBlur = 0; ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.shadowColor = c; ctx.shadowBlur = 6;
        ctx.fillRect(-w * 0.22, -h * 0.48, w * 0.06, h * 0.2); ctx.strokeRect(-w * 0.22, -h * 0.48, w * 0.06, h * 0.2);
        ctx.fillRect(w * 0.16, -h * 0.48, w * 0.06, h * 0.2); ctx.strokeRect(w * 0.16, -h * 0.48, w * 0.06, h * 0.2);
        drawCockpit(0, -h * 0.24, w * 0.1, h * 0.16);
        drawEnergyCore(0, h * 0.14, 1.25);

    } else if (e.type === 'interceptor') {
        // Tiny arrow-shaped fuselage, small sharply-swept wings, twin very close engines, spiked nose
        drawEngineCluster([{ ox: -w * 0.1, oy: h * 0.4, boost: leftBoost, size: 0.75 }, { ox: w * 0.1, oy: h * 0.4, boost: rightBoost, size: 0.75 }], 2.3);
        drawWingPair(0.62, (span) => [[w * 0.06, -h * 0.06], [span, h * 0.3], [span * 0.65, h * 0.36], [w * 0.1, h * 0.14]]);
        fuselageFill([[0, -h * 0.6], [w * 0.05, -h * 0.15], [w * 0.045, h * 0.3], [0, h * 0.38], [-w * 0.045, h * 0.3], [-w * 0.05, -h * 0.15]]);
        drawPanelDetail(w * 0.03, -h * 0.05, h * 0.15);
        ctx.fillStyle = '#0d0d1a'; ctx.beginPath(); ctx.moveTo(-w * 0.015, -h * 0.6); ctx.lineTo(w * 0.015, -h * 0.6); ctx.lineTo(0, -h * 0.7); ctx.closePath(); ctx.fill();
        drawCockpit(0, -h * 0.24, w * 0.045, h * 0.1);
        drawEnergyCore(0, h * 0.06, 0.6);

    } else if (e.type === 'sniper') {
        // Long precision fuselage with an extended rail-gun barrel, small rear wings, dorsal sensor dish
        drawEngineCluster([{ ox: -w * 0.15, oy: h * 0.48, boost: leftBoost, size: 0.85 }, { ox: w * 0.15, oy: h * 0.48, boost: rightBoost, size: 0.85 }], 0.8);
        drawWingPair(0.4, (span) => [[w * 0.08, h * 0.2], [span, h * 0.36], [span * 0.8, h * 0.44], [w * 0.12, h * 0.3]]);
        fuselageFill([[0, -h * 0.62], [w * 0.09, -h * 0.1], [w * 0.08, h * 0.36], [0, h * 0.46], [-w * 0.08, h * 0.36], [-w * 0.09, -h * 0.1]]);
        drawPanelDetail(w * 0.06, -h * 0.05, h * 0.22);
        // Extended rail-gun barrel
        ctx.fillStyle = '#111118'; ctx.strokeStyle = '#e600ff'; ctx.lineWidth = 1; ctx.shadowColor = '#e600ff'; ctx.shadowBlur = 5;
        ctx.fillRect(-w * 0.025, -h * 0.95, w * 0.05, h * 0.35); ctx.strokeRect(-w * 0.025, -h * 0.95, w * 0.05, h * 0.35);
        // Dorsal sensor dish
        ctx.fillStyle = '#3a1a42'; ctx.strokeStyle = '#e600ff'; ctx.lineWidth = 1; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.ellipse(0, h * 0.05, w * 0.1, h * 0.07, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        drawCockpit(0, -h * 0.3, w * 0.05, h * 0.11);
        drawEnergyCore(0, h * 0.22, 0.8);

    } else if (e.type === 'flanker') {
        // Wide lateral wing structure with engines mounted at the wingtips, small central fuselage
        drawWingPair(1.5, (span) => [[w * 0.06, -h * 0.02], [span, h * 0.04], [span * 0.94, h * 0.2], [w * 0.1, h * 0.14]], 0.9);
        drawEngineCluster([{ ox: -w * 0.75, oy: h * 0.1, boost: leftBoost, size: 0.75 }, { ox: w * 0.75, oy: h * 0.1, boost: rightBoost, size: 0.75 }], 1.3);
        fuselageFill([[0, -h * 0.34], [w * 0.09, -h * 0.06], [w * 0.08, h * 0.28], [0, h * 0.36], [-w * 0.08, h * 0.28], [-w * 0.09, -h * 0.06]]);
        drawPanelDetail(w * 0.06, -h * 0.02, h * 0.14);
        drawCockpit(0, -h * 0.1, w * 0.07, h * 0.1);
        drawEnergyCore(0, h * 0.12, 0.85);

    } else if (e.type === 'empship') {
        // Electronic-warfare craft: central segmented emitter ring instead of a fighter cockpit, visible conduits
        drawEngineCluster([{ ox: -w * 0.24, oy: h * 0.38, boost: leftBoost, size: 0.9 }, { ox: w * 0.24, oy: h * 0.38, boost: rightBoost, size: 0.9 }], 0.75);
        fuselageFill([[0, -h * 0.28], [w * 0.2, -h * 0.06], [w * 0.22, h * 0.3], [0, h * 0.38], [-w * 0.22, h * 0.3], [-w * 0.2, -h * 0.06]]);
        drawPanelDetail(w * 0.13, -h * 0.02, h * 0.16);
        // Segmented emitter ring (the defining feature)
        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;
            ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 2; ctx.shadowColor = '#00ccff'; ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * w * 0.16, -h * 0.06 + Math.sin(a) * w * 0.16 * 0.5);
            ctx.lineTo(Math.cos(a) * w * 0.24, -h * 0.06 + Math.sin(a) * w * 0.24 * 0.5);
            ctx.stroke();
        }
        ctx.fillStyle = '#1a4a55'; ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -h * 0.06, w * 0.16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        drawEnergyCore(0, h * 0.14, 1.05);

    } else if (e.type === 'orbiter') {
        // Central hub drone - no wings or fuselage, defined instead by the halo ring (drawn pre-rotation) and small hub
        drawEngineCluster([{ ox: 0, oy: h * 0.3, boost: 1, size: 0.7 }], 0.7);
        ctx.save();
        const hubGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, w * 0.32);
        hubGrad.addColorStop(0, '#4a5a10'); hubGrad.addColorStop(1, '#141a05');
        ctx.fillStyle = hubGrad; ctx.strokeStyle = c; ctx.lineWidth = 1.3; ctx.shadowColor = c; ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const px = Math.cos(a) * w * 0.3, py = Math.sin(a) * w * 0.3;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
        drawEnergyCore(0, 0, 0.9);

    } else if (e.type === 'splitter' || e.type === 'splitterMini') {
        // Segmented modular hull - visibly separable capsule modules joined by short struts, no wings
        drawEngineCluster([{ ox: -w * 0.14, oy: h * 0.4, boost: leftBoost, size: 0.7 }, { ox: w * 0.14, oy: h * 0.4, boost: rightBoost, size: 0.7 }], 0.7);
        const segCount = e.type === 'splitter' ? 3 : 2;
        for (let i = 0; i < segCount; i++) {
            const sy = -h * 0.34 + (h * 0.68 * i) / (segCount - 1 || 1);
            const segGrad = ctx.createLinearGradient(0, sy - h * 0.12, 0, sy + h * 0.12);
            segGrad.addColorStop(0, i % 2 === 0 ? '#4a3418' : '#301f0d'); segGrad.addColorStop(1, '#180f06');
            ctx.fillStyle = segGrad; ctx.strokeStyle = c; ctx.lineWidth = 1.2; ctx.shadowColor = c; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.ellipse(0, sy, w * 0.26, h * 0.14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
            if (i < segCount - 1) {
                ctx.strokeStyle = 'rgba(150,150,150,0.5)'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
                ctx.beginPath(); ctx.moveTo(-w * 0.05, sy + h * 0.1); ctx.lineTo(-w * 0.05, sy + h * 0.68 / (segCount - 1 || 1) - h * 0.1); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(w * 0.05, sy + h * 0.1); ctx.lineTo(w * 0.05, sy + h * 0.68 / (segCount - 1 || 1) - h * 0.1); ctx.stroke();
            }
        }
        drawEnergyCore(0, 0, 0.85);

    } else if (e.type === 'droneswarmer') {
        // Minimal mass-produced drone: tiny hexagonal shell, no real cockpit, three small thruster nubs
        drawEngineCluster([
            { ox: 0, oy: h * 0.32, boost: 1, size: 0.5 },
            { ox: -w * 0.22, oy: h * 0.2, boost: 1, size: 0.35 },
            { ox: w * 0.22, oy: h * 0.2, boost: 1, size: 0.35 }
        ], 0.6);
        ctx.fillStyle = '#0d1a16'; ctx.strokeStyle = c; ctx.lineWidth = 1; ctx.shadowColor = c; ctx.shadowBlur = 6;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
            const px = Math.cos(a) * w * 0.4, py = Math.sin(a) * w * 0.4 * 0.85;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(0, -w * 0.05, Math.max(1, w * 0.08), 0, Math.PI * 2); ctx.fill();

    } else {
        // basic (and any unlisted future type) - the reference mass-produced fighter silhouette
        drawEngineCluster([{ ox: -w * 0.26, oy: h * 0.44, boost: leftBoost }, { ox: w * 0.26, oy: h * 0.44, boost: rightBoost }], 1.25);
        drawWingPair(1, (span) => [[w * 0.07, -h * 0.03], [span, h * 0.28], [span * 0.76, h * 0.4], [w * 0.14, h * 0.22]]);
        fuselageFill([[0, -h * 0.5], [w * 0.17, -h * 0.15], [w * 0.14, h * 0.34], [0, h * 0.44], [-w * 0.14, h * 0.34], [-w * 0.17, -h * 0.15]]);
        drawPanelDetail(w * 0.11, -h * 0.02, h * 0.15);
        drawCockpit(0, -h * 0.15, w * 0.095, h * 0.17);
        drawEnergyCore(0, h * 0.08, 1.0);
        ctx.fillStyle = '#ffe600'; ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 5;
        ctx.beginPath(); ctx.arc(0, -h * 0.34, Math.max(1.2, w * 0.04), 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0d0d1a'; ctx.shadowBlur = 0;
        ctx.fillRect(-w * 0.035, -h * 0.52, w * 0.07, h * 0.12);
    }

    // Nose weapon mount default position for classes that don't define their own (muzzle flash / shooter charge glow reuse this)
    const noseY = -h * 0.52;


    if (e.type === 'bomber') {
        const bayOpen = e.telegraph > 0 ? (1 - e.telegraph / 0.5) : (e.diving ? 1 : 0);
        if (bayOpen > 0) {
            const bayGlow = ctx.createRadialGradient(0, h * 0.22, 0, 0, h * 0.22, w * 0.2 * bayOpen);
            bayGlow.addColorStop(0, '#ff6600');
            bayGlow.addColorStop(1, 'rgba(255,102,0,0)');
            ctx.fillStyle = bayGlow;
            ctx.beginPath();
            ctx.arc(0, h * 0.22, w * 0.18 * bayOpen, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Mine Layer - mine bay hatch, similar language to the bomber's ordnance bay
    if (e.type === 'minelayer') {
        const layOpen = 1 - Math.min(1, e.layTimer / 2.5);
        ctx.fillStyle = '#0a0805';
        ctx.shadowBlur = 0;
        ctx.fillRect(-w * 0.14, h * 0.16, w * 0.28, h * 0.12);
        ctx.fillStyle = `rgba(204,136,0,${0.3 + layOpen * 0.4})`;
        ctx.shadowColor = '#cc8800';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, h * 0.22, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }

    // Shooter charging telegraph at nose railgun emitter
    if (e.type === 'shooter' && e.telegraph > 0) {
        const chargeProgress = 1 - e.telegraph / 0.35;
        const cg = ctx.createRadialGradient(0, -h * 0.52, 0, 0, -h * 0.52, w * 0.25 * chargeProgress);
        cg.addColorStop(0, '#ffffff');
        cg.addColorStop(0.5, c);
        cg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = cg;
        ctx.shadowColor = c;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(0, -h * 0.52, w * 0.2 * chargeProgress, 0, Math.PI * 2);
        ctx.fill();
    }

    // Muzzle flash at nose emitter when firing
    if (e.muzzleFlash > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, e.muzzleFlash / 0.12);
        const mg = ctx.createRadialGradient(0, -h * 0.52, 0, 0, -h * 0.52, w * 0.22);
        mg.addColorStop(0, '#ffffff');
        mg.addColorStop(0.5, c);
        mg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = mg;
        ctx.shadowColor = c;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -h * 0.52, w * 0.18, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    ctx.restore(); // end spaceship body rotation

    // ══════════════════ EXTERNAL TARGETING / TELEGRAPHS (Screen Space relative to ship center) ══════════════════
    if (e.pendingMissile) {
        const lockProgress = 1 - Math.max(0, e.missileLock / 0.65);
        const pulse = 0.5 + Math.sin(t * 0.03) * 0.4;
        ctx.strokeStyle = '#ff3300';
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 14;
        const reticleR = w * 0.65 * (1 - lockProgress * 0.4);
        ctx.beginPath();
        ctx.arc(0, 0, reticleR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-reticleR - 4, 0); ctx.lineTo(-reticleR + 4, 0);
        ctx.moveTo(reticleR - 4, 0); ctx.lineTo(reticleR + 4, 0);
        ctx.moveTo(0, -reticleR - 4); ctx.lineTo(0, -reticleR + 4);
        ctx.moveTo(0, reticleR - 4); ctx.lineTo(0, reticleR + 4);
        ctx.stroke();
        ctx.globalAlpha = 0.45;
        ctx.setLineDash([5, 5]);
        const angleToPlayer = Math.atan2(player.y - e.y, player.x - e.x);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angleToPlayer) * 350, Math.sin(angleToPlayer) * 350);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    } else if (e.type === 'bomber' && e.telegraph > 0) {
        ctx.strokeStyle = '#ff0000';
        ctx.globalAlpha = 0.5 + Math.sin(e.time * 30) * 0.3;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 15;
        const angle = Math.atan2(player.y - e.y, player.x - e.x);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 200, Math.sin(angle) * 200);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // ══════════════════ HEALTH BAR & DAMAGE FX (Horizontal above ship) ══════════════════
    if (e.maxHp > 1) {
        const hpFrac = e.hp / e.maxHp;
        if (hpFrac <= 0.66) {
            ctx.save();
            ctx.globalAlpha = 0.35 + (1 - hpFrac) * 0.3;
            ctx.fillStyle = '#1a0a0a';
            ctx.beginPath();
            ctx.arc(w * 0.15, -h * 0.1, w * 0.22 * (1 - hpFrac * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (hpFrac <= 0.5 && Math.random() < 0.02) {
            particles.push(makeParticle(e.x + w * 0.15, e.y - h * 0.1, '#ffe600', 1.5, 0.2));
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-w / 2, -h / 2 - 8, w, 3);
        ctx.fillStyle = hpFrac <= 0.33 ? '#ff2d2d' : c;
        ctx.fillRect(-w / 2, -h / 2 - 8, w * hpFrac, 3);
    }

    ctx.restore();
}

function drawEnemies() {
    enemies.forEach(e => drawEnemyShip(e));
}

function getBossAttackInterval() {

    const base = Math.max(0.9, 2.6 - (wave - 2) * 0.12);
    const interval = base + Math.random() * 0.5;
    return (boss && boss.hpTier === 4) ? interval * 0.65 : interval;
}
function getBossConfig(w) {
    if (w < 2) return null;
    const t = w - 2; // 0 at wave 2, growing tier index thereafter

    const hp = 45 + t * 24;
    const speed = Math.min(1.55, 0.5 + t * 0.035);
    const size = Math.min(150, 78 + t * 4.2);

    let phases;
    if (w === 2) {

        phases = ['aimedShot', 'aimedShot', 'simpleSpread', 'missiles'];
    } else if (w === 3) {
        phases = ['aimedShot', 'simpleSpread', 'plasmaBarrage', 'missiles'];
    } else if (w === 4) {
        phases = ['simpleSpread', 'plasmaBarrage', 'missiles', 'spiral', 'laser'];
    } else {

        phases = ['spiral', 'missiles', 'plasmaBarrage', 'laser', 'charge', 'novaShockwave', 'empStorm', 'summon'];
        if (w >= 7) phases.push('clusterBombs');
        if (w >= 9) phases.push('minefield');
    }

    const names = ['SENTINEL DRONE', 'REAPER CARRIER', 'VOID SENTINEL', 'NOVA TYRANT', 'CHAOS JUGGERNAUT'];
    const tier = Math.min(4, Math.floor(t / 3));
    const mk = Math.floor(t / 15) + 1;
    const name = names[tier] + (mk > 1 ? ' MK' + mk : '');

    const colors = ['#39ffb0', '#ff2d95', '#b44dff', '#ffe600', '#39ff14'];

    return { name, hp, color: colors[tier], size, speed, phases };
}

function spawnBoss() {
    const cfg = getBossConfig(wave);
    if (!cfg) return;
    boss = {
        x: W / 2,
        y: -100,
        targetY: 110,
        ...cfg,
        maxHp: cfg.hp,
        w: cfg.size,
        h: cfg.size * 0.9,
        time: 0,
        attackTimer: 1.8,
        currentPhase: 0,
        entering: true,
        moveDir: 1,
        spiralAngle: 0,
        laserCharging: false,
        laserCharge: 0,
        laserFiring: false,
        laserTimer: 0,
        summonTimer: 5,
        charging: false,
        chargeTelegraph: 0,
        chargeVX: 0,
        chargeVY: 0,
        bank: 0,
        vx: 0,
        vy: 0,
        vxReal: 0,
        patrolTarget: W - 100,
        missilePending: false,
        missileLockTimer: 0,
        phaseTelegraph: 0,
        pendingPhaseName: null,
        hpTier: 1,
        orbitalTimer: 0,
        orbitals: null,
        shieldPhaseTimer: 0
    };
    bossNameEl.textContent = cfg.name;
    bossHud.classList.remove('hidden');
    triggerShake('heavy');
    trapZones = [];
}

function getBossHpTier(hpFrac) {

    if (hpFrac > 0.7) return 1;
    if (hpFrac > 0.4) return 2;
    if (hpFrac > 0.15) return 3;
    return 4;
}
function getPhasePoolForTier(tier, unlockedPhases) {
    const basic = ['aimedShot', 'simpleSpread'];
    const mid = ['spiral', 'missiles', 'plasmaBarrage'];
    const advanced = ['laser', 'charge', 'novaShockwave', 'empStorm', 'shieldPhase', 'orbitalBurst'];
    const late = ['clusterBombs', 'minefield', 'summon', 'trapZone'];
    let pool;
    if (tier === 1) pool = basic.concat(mid.slice(0, 1));
    else if (tier === 2) pool = mid.concat(advanced.slice(0, 3));
    else if (tier === 3) pool = mid.concat(advanced).concat(late.slice(0, 2));
    else pool = mid.concat(advanced).concat(late);
    const filtered = pool.filter(p => unlockedPhases.includes(p));
    return filtered.length ? filtered : unlockedPhases;
}
function bossAttackOrbitalBurst() {

    const count = 6;
    boss.orbitals = [];
    for (let i = 0; i < count; i++) {
        boss.orbitals.push({ angle: (Math.PI * 2 * i) / count, r: 0, targetR: 45 });
    }
    boss.orbitalTimer = 0.7;
}
function launchOrbitals() {
    if (!boss || !boss.orbitals) return;
    boss.orbitals.forEach(o => {
        const angle = Math.atan2(player.y - (boss.y + Math.sin(o.angle) * o.r), player.x - (boss.x + Math.cos(o.angle) * o.r));
        bullets.push({
            x: boss.x + Math.cos(o.angle) * o.r, y: boss.y + Math.sin(o.angle) * o.r,
            vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4, r: 4, color: boss.color,
            friendly: false, fromBoss: true, kind: 'heavy'
        });
    });
    boss.orbitals = null;
}
function bossAttackShieldPhase() {
    boss.shieldPhaseTimer = 3.5;
}
function bossAttackTrapZone() {
    if (trapZones.length >= 3) return;
    const zoneX = 100 + Math.random() * (W - 200);
    trapZones.push({ x: zoneX, y: 0, w: 90, h: H, warnTimer: 1.0, activeTimer: 1.2, active: false });
}
function updateTrapZones(dt) {
    for (let i = trapZones.length - 1; i >= 0; i--) {
        const z = trapZones[i];
        if (!z.active) {
            z.warnTimer -= dt;
            if (z.warnTimer <= 0) z.active = true;
        } else {
            z.activeTimer -= dt;
            if (player.invincible <= 0 && player.x > z.x - z.w / 2 && player.x < z.x + z.w / 2) {
                hitPlayer(Math.round(8 * dt * 60) || 1);
            }
            if (z.activeTimer <= 0) trapZones.splice(i, 1);
        }
    }
}
function drawTrapZones() {
    trapZones.forEach(z => {
        ctx.save();
        if (!z.active) {
            const pulse = 0.2 + Math.sin(performance.now() * 0.02) * 0.15;
            ctx.fillStyle = `rgba(255,60,30,${pulse})`;
            ctx.fillRect(z.x - z.w / 2, 0, z.w, H);
            ctx.strokeStyle = '#ff3300';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            ctx.strokeRect(z.x - z.w / 2, 0, z.w, H);
        } else {
            ctx.fillStyle = 'rgba(255,30,10,0.35)';
            ctx.fillRect(z.x - z.w / 2, 0, z.w, H);
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 20;
            ctx.strokeStyle = '#ff5500';
            ctx.lineWidth = 3;
            ctx.strokeRect(z.x - z.w / 2, 0, z.w, H);
        }
        ctx.restore();
    });
}
function updateBoss(dt) {
    if (!boss) return;
    boss.time += dt;
    const prevX = boss.x;
    const prevY = boss.y;

    if (boss.entering) {
        boss.y += 60 * dt;
        if (boss.y >= boss.targetY) {
            boss.y = boss.targetY;
            boss.entering = false;
        }
    } else if (boss.charging) {
        if (boss.chargeTelegraph > 0) {
            boss.chargeTelegraph -= dt;
        } else {
            boss.x += boss.chargeVX * dt * 60;
            boss.y += boss.chargeVY * dt * 60;
            if (boss.x < 70 || boss.x > W - 70) { boss.charging = false; boss.y = boss.targetY; triggerShake('medium'); }
            if (Math.abs(boss.y - boss.targetY) > 280) { boss.charging = false; boss.y = boss.targetY; }
            if (player.invincible <= 0 && collides(boss, player, boss.w * 0.45, player.hitboxR)) hitPlayer(20);
        }
    } else {

        const heaviness = Math.min(1, Math.max(0, (wave - 2) / 10));
        const maxPatrolSpeed = boss.speed * 1.8;
        const accel = maxPatrolSpeed / (7 + heaviness * 9);
        if (Math.abs(boss.x - boss.patrolTarget) < 30) {
            boss.patrolTarget = boss.patrolTarget > W / 2 ? 90 : W - 90;
        }
        const dir = Math.sign(boss.patrolTarget - boss.x);
        boss.vxReal = (boss.vxReal || 0) + dir * accel * dt * 60;
        boss.vxReal = Math.max(-maxPatrolSpeed, Math.min(maxPatrolSpeed, boss.vxReal));
        const distToTarget = Math.abs(boss.patrolTarget - boss.x);
        if (distToTarget < 150) {
            boss.vxReal *= Math.pow(0.9, dt * 60);
        }
        boss.x += boss.vxReal * dt * 60;
        boss.x = Math.max(60, Math.min(W - 60, boss.x));
    }

    // Capital ship physics & banking momentum
    boss.vx = (boss.x - prevX) / (dt * 60 || 1);
    boss.vy = (boss.y - prevY) / (dt * 60 || 1);
    const targetBank = Math.max(-0.55, Math.min(0.55, boss.vx / 1.8));
    boss.bank = (boss.bank || 0) + (targetBank - (boss.bank || 0)) * Math.min(1, dt * 4.5);

    // Capital Ship Massive Ion Thruster Particle Physics
    const thrusterCount = 4;
    const chargeActive = boss.charging && boss.chargeTelegraph <= 0;
    const emissionChance = chargeActive ? 0.95 : 0.6;

    if (Math.random() < emissionChance) {
        const span = boss.w * 0.7;
        for (let i = 0; i < thrusterCount; i++) {
            const ox = -span / 2 + (span / (thrusterCount - 1)) * i;
            const oy = -boss.h * 0.42; // rear exhaust
            const bAngle = boss.bank * 0.18;
            const cosB = Math.cos(bAngle), sinB = Math.sin(bAngle);
            const wx = boss.x + (ox * cosB - oy * sinB);
            const wy = boss.y + (ox * sinB + oy * cosB);
            const plumeSpeed = chargeActive ? 6 + Math.random() * 5 : 2.5 + Math.random() * 2.5;

            particles.push({
                x: wx,
                y: wy,
                vx: (Math.random() - 0.5) * 2 - Math.sin(bAngle) * plumeSpeed,
                vy: -plumeSpeed,
                size: (chargeActive ? 3.5 : 2.2) + Math.random() * 2.5,
                life: chargeActive ? 0.45 : 0.32,
                maxLife: chargeActive ? 0.45 : 0.32,
                color: Math.random() < 0.7 ? boss.color : '#ffffff'
            });
        }
    }

    if (!boss.entering) {
        if (!boss.charging && !boss.missilePending && boss.phaseTelegraph <= 0) boss.attackTimer -= dt;

        if (boss.missilePending) {

            boss.missileLockTimer -= dt;
            if (boss.missileLockTimer <= 0) {
                bossAttackMissiles();
                boss.missilePending = false;
                boss.attackTimer = getBossAttackInterval();
            }
        } else if (boss.phaseTelegraph > 0) {

            boss.phaseTelegraph -= dt;
            if (boss.phaseTelegraph <= 0) {
                const phase = boss.pendingPhaseName;
                if (phase === 'spiral') bossAttackSpiral();
                if (phase === 'summon') bossAttackSummon();
                if (phase === 'minefield') bossAttackMinefield();
                if (phase === 'plasmaBarrage') bossAttackPlasmaBarrage();
                if (phase === 'novaShockwave') bossAttackNovaShockwave();
                if (phase === 'empStorm') bossAttackEMPStorm();
                if (phase === 'clusterBombs') bossAttackClusterBombs();
                if (phase === 'aimedShot') bossAttackAimedShot();
                if (phase === 'simpleSpread') bossAttackSimpleSpread();
                if (phase === 'shieldPhase') bossAttackShieldPhase();
                if (phase === 'trapZone') bossAttackTrapZone();
                if (phase === 'orbitalBurst') bossAttackOrbitalBurst();
                boss.attackTimer = getBossAttackInterval();
            }
        } else if (boss.attackTimer <= 0 && !boss.charging) {
            const hpFrac = boss.hp / boss.maxHp;
            const tier = getBossHpTier(hpFrac);
            boss.hpTier = tier;
            const activePool = getPhasePoolForTier(tier, boss.phases);
            const phase = activePool[boss.currentPhase % activePool.length];
            boss.currentPhase++;
            if (phase === 'laser') {
                bossStartLaser();
                boss.attackTimer = getBossAttackInterval();
            } else if (phase === 'charge') {
                bossAttackCharge();
                boss.attackTimer = getBossAttackInterval();
            } else if (phase === 'missiles') {

                boss.missilePending = true;
                boss.missileLockTimer = 0.6;
            } else {

                boss.pendingPhaseName = phase;
                boss.phaseTelegraph = 0.4;
            }
        }

        if (boss.orbitalTimer > 0) {
            boss.orbitalTimer -= dt;
            if (boss.orbitals) boss.orbitals.forEach(o => { o.r += (o.targetR - o.r) * 0.15; o.angle += dt * 4; });
            if (boss.orbitalTimer <= 0) launchOrbitals();
        }
        if (boss.shieldPhaseTimer > 0) boss.shieldPhaseTimer -= dt;

        if (boss.laserCharging) {
            boss.laserCharge += dt;
            if (boss.laserCharge >= 1.0) {
                boss.laserCharging = false;
                boss.laserFiring = true;
                boss.laserTimer = 1.5;
            }
        }
        if (boss.laserFiring) {
            boss.laserTimer -= dt;
            if (player.invincible <= 0) {
                const laserX = boss.x;
                if (Math.abs(player.x - laserX) < 28 && player.y > boss.y) {
                    hitPlayer(15);
                }
            }
            if (boss.laserTimer <= 0) {
                boss.laserFiring = false;
            }
        }
    }

    bossHealthFill.style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
}

function bossAttackAimedShot() {

    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    bullets.push({ x: boss.x, y: boss.y + boss.h * 0.3, vx: Math.cos(angle) * 4.2, vy: Math.sin(angle) * 4.2, r: 4, color: boss.color, friendly: false, fromBoss: true, kind: 'heavy' });
    for (let i = 0; i < 4; i++) particles.push(makeParticle(boss.x, boss.y + boss.h * 0.3, boss.color, 2, 0.25));
}
function bossAttackSimpleSpread() {

    const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
    for (let i = -1; i <= 1; i++) {
        const angle = baseAngle + i * 0.24;
        bullets.push({ x: boss.x, y: boss.y + boss.h * 0.3, vx: Math.cos(angle) * 3.8, vy: Math.sin(angle) * 3.8, r: 3.5, color: boss.color, friendly: false, fromBoss: true, kind: 'bolt' });
    }
    for (let i = 0; i < 4; i++) particles.push(makeParticle(boss.x, boss.y + boss.h * 0.3, boss.color, 2, 0.25));
}
function bossAttackSpiral() {
    const count = 12 + Math.floor(wave / 2);
    for (let i = 0; i < count; i++) {
        const angle = boss.spiralAngle + (Math.PI * 2 * i) / count;
        bullets.push({
            x: boss.x, y: boss.y + boss.h * 0.35,
            vx: Math.cos(angle) * 3.8,
            vy: Math.sin(angle) * 3.8 + 1.2,
            r: 4, color: boss.color, friendly: false, fromBoss: true, kind: 'heavy'
        });
    }
    boss.spiralAngle += 0.55;
}

function bossAttackPlasmaBarrage() {
    if (!boss) return;
    for (let s = 0; s < 3; s++) {
        setTimeout(() => {
            if (gameState === 'playing' && boss) {
                const baseAngle = Math.atan2(player.y - boss.y, player.x - boss.x);
                [-0.35, -0.18, 0, 0.18, 0.35].forEach(offset => {
                    const ang = baseAngle + offset;
                    bullets.push({
                        x: boss.x + Math.sin(ang) * 20,
                        y: boss.y + boss.h * 0.3,
                        vx: Math.cos(ang) * 5.2,
                        vy: Math.sin(ang) * 5.2,
                        r: 4.5,
                        color: boss.color,
                        friendly: false, fromBoss: true,
                        kind: 'heavy'
                    });
                });
                explode(boss.x, boss.y + boss.h * 0.3, boss.color, 6);
            }
        }, s * 140);
    }
}

function bossAttackNovaShockwave() {
    if (!boss) return;
    explode(boss.x, boss.y + boss.h * 0.1, '#ffffff', 24);
    triggerShake('medium');
    const ringCount = 20;
    for (let i = 0; i < ringCount; i++) {
        const ang = (Math.PI * 2 * i) / ringCount;
        bullets.push({
            x: boss.x + Math.cos(ang) * 25,
            y: boss.y + boss.h * 0.1 + Math.sin(ang) * 25,
            vx: Math.cos(ang) * 4.0,
            vy: Math.sin(ang) * 4.0,
            r: 4.5,
            color: '#ffdd00',
            friendly: false, fromBoss: true,
            kind: 'heavy'
        });
    }
}

function bossAttackEMPStorm() {
    if (!boss) return;
    const targetCount = 5;
    for (let i = 0; i < targetCount; i++) {
        setTimeout(() => {
            if (gameState === 'playing' && boss) {
                const ox = (i - 2) * 50 + (Math.random() - 0.5) * 30;
                const tx = Math.max(40, Math.min(W - 40, player.x + ox));
                const angle = Math.atan2(player.y - boss.y, tx - boss.x);
                bullets.push({
                    x: boss.x + (i % 2 === 0 ? -boss.w * 0.3 : boss.w * 0.3),
                    y: boss.y + boss.h * 0.2,
                    vx: Math.cos(angle) * 6.0,
                    vy: Math.sin(angle) * 6.0,
                    r: 4,
                    color: '#00f0ff',
                    friendly: false, fromBoss: true,
                    kind: 'heavy'
                });
                explode(boss.x, boss.y + boss.h * 0.2, '#00f0ff', 6);
            }
        }, i * 90);
    }
}

function bossAttackClusterBombs() {
    if (!boss) return;
    [-boss.w * 0.3, 0, boss.w * 0.3].forEach((ox, idx) => {
        setTimeout(() => {
            if (gameState === 'playing' && boss) {
                const launchX = boss.x + ox;
                const launchY = boss.y + boss.h * 0.25;
                const vx = (Math.random() - 0.5) * 2.5;
                const vy = 3.5 + Math.random() * 1.5;
                const bomb = {
                    x: launchX,
                    y: launchY,
                    vx,
                    vy,
                    r: 6,
                    color: '#ff3300',
                    friendly: false, fromBoss: true,
                    kind: 'heavy'
                };
                bullets.push(bomb);

                // Cluster detonation after delay
                setTimeout(() => {
                    if (gameState === 'playing') {
                        explode(bomb.x, bomb.y, '#ff6a00', 14);
                        const shrapnelCount = 6;
                        for (let s = 0; s < shrapnelCount; s++) {
                            const sAngle = (Math.PI * 2 * s) / shrapnelCount + Math.random() * 0.2;
                            bullets.push({
                                x: bomb.x,
                                y: bomb.y,
                                vx: Math.cos(sAngle) * 4.5,
                                vy: Math.sin(sAngle) * 4.5,
                                r: 3,
                                color: '#ff6a00',
                                friendly: false, fromBoss: true,
                                kind: 'bolt'
                            });
                        }
                    }
                }, 750);
            }
        }, idx * 150);
    });
}

function bossAttackSummon() {
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (gameState === 'playing' && boss && enemies.length < 26) spawnEnemy();
        }, i * 300);
    }
}

function bossStartLaser() {
    boss.laserCharging = true;
    boss.laserCharge = 0;
}

function bossAttackCharge() {
    boss.charging = true;
    boss.chargeTelegraph = 0.6;
    const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
    boss.chargeVX = Math.cos(angle) * 9;
    boss.chargeVY = Math.sin(angle) * 9;
}

function bossAttackMissiles() {
    if (!boss) return;
    const offsets = [-boss.w * 0.34, 0, boss.w * 0.34];
    offsets.forEach((ox, i) => {
        setTimeout(() => {
            if (gameState === 'playing' && boss) {
                const launchX = boss.x + ox;
                const launchY = boss.y + boss.h * 0.2;
                const angle = Math.atan2(player.y - launchY, player.x - launchX) + (Math.random() - 0.5) * 0.25;
                missiles.push({
                    x: launchX,
                    y: launchY,
                    vx: Math.cos(angle) * 4.2,
                    vy: Math.sin(angle) * 4.2,
                    trackTime: 2.0, // tracks for 2.0 seconds, then stops chasing!
                    turnRate: 0.055,
                    r: 5,
                    friendly: false, fromBoss: true,
                    exploded: false,
                    life: 5.0
                });
                explode(launchX, launchY, boss.color, 8);
            }
        }, i * 180);
    });
}

function bossAttackMinefield() {
    const count = 5;
    for (let i = 0; i < count; i++) {
        mines.push({
            x: (W / (count + 1)) * (i + 1),
            y: -20,
            targetY: 100 + Math.random() * (H * 0.5),
            settled: false,
            r: 10,
            timer: 2.5,
            color: boss.color
        });
    }
}

function drawBoss() {
    if (!boss) return;
    const w = boss.w, h = boss.h;
    const c = boss.color;
    const t = performance.now();
    const engineFlicker = 0.75 + Math.sin(boss.time * 8) * 0.25;
    const isCharging = boss.charging && boss.chargeTelegraph <= 0;
    const chargeMult = isCharging ? 2.2 : 1.0;
    const bank = boss.bank || 0;

    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Ambient flagship distortion halo
    const glowSize = w * 0.9 + Math.sin(boss.time * 3) * 10;
    const grd = ctx.createRadialGradient(0, 0, w * 0.2, 0, 0, glowSize);
    grd.addColorStop(0, c + '44');
    grd.addColorStop(0.5, c + '15');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(-glowSize, -glowSize, glowSize * 2, glowSize * 2);

    // Apply flagship banking roll
    ctx.save();
    ctx.rotate(bank * 0.18);

    // ══════════════════ CAPITAL SHIP: Heavy Quad Ion Thruster Array ══════════════════
    const thrusters = [
        { ox: -w * 0.34, scale: 0.85 },
        { ox: -w * 0.14, scale: 1.15 },
        { ox: w * 0.14, scale: 1.15 },
        { ox: w * 0.34, scale: 0.85 }
    ];

    thrusters.forEach(({ ox, scale }) => {
        const flameLen = (20 + engineFlicker * 14) * scale * chargeMult;
        const turb = (Math.random() - 0.5) * 3;

        // Massive roaring ion flame plume
        ctx.save();
        ctx.translate(ox, -h * 0.44);
        const fGrad = ctx.createLinearGradient(0, 0, 0, -flameLen);
        fGrad.addColorStop(0, '#ffffff');
        fGrad.addColorStop(0.25, c);
        fGrad.addColorStop(0.7, c + '77');
        fGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fGrad;
        ctx.shadowColor = c;
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(-w * 0.06 * scale, 0);
        ctx.lineTo(turb, -flameLen);
        ctx.lineTo(w * 0.06 * scale, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Armored heavy engine cowling
        ctx.save();
        ctx.translate(ox, -h * 0.38);
        const cowW = w * 0.08 * scale;
        const cowH = h * 0.16 * scale;
        const cGrad = ctx.createLinearGradient(-cowW, 0, cowW, 0);
        cGrad.addColorStop(0, '#2d2d42');
        cGrad.addColorStop(0.5, '#12121d');
        cGrad.addColorStop(1, '#2d2d42');
        ctx.fillStyle = cGrad;
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.4;
        ctx.shadowColor = c;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(-cowW, -cowH / 2, cowW * 2, cowH, 3);
        ctx.fill();
        ctx.stroke();

        // Radiator heat vents
        ctx.strokeStyle = '#ff6a00';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        for (let v = -1; v <= 1; v++) {
            ctx.beginPath();
            ctx.moveTo(-cowW * 0.7, v * cowH * 0.25);
            ctx.lineTo(cowW * 0.7, v * cowH * 0.25);
            ctx.stroke();
        }
        ctx.restore();
    });

    // ══════════════════ CAPITAL SHIP: Heavy Layered Armor Superstructure ══════════════════
    // Tier 1: Outer Heavy Armor Wings / Broadside Bulwarks
    const wingGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    wingGrad.addColorStop(0, '#363650');
    wingGrad.addColorStop(0.4, '#202032');
    wingGrad.addColorStop(1, '#0e0e18');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = c;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);                     // Forward Heavy Prow
    ctx.lineTo(w * 0.28, h * 0.38);
    ctx.lineTo(w * 0.52, h * 0.12);             // Broadside Flank
    ctx.lineTo(w * 0.48, -h * 0.25);            // Aft Wing Tip
    ctx.lineTo(w * 0.38, -h * 0.42);            // Engine Mount
    ctx.lineTo(-w * 0.38, -h * 0.42);
    ctx.lineTo(-w * 0.48, -h * 0.25);
    ctx.lineTo(-w * 0.52, h * 0.12);
    ctx.lineTo(-w * 0.28, h * 0.38);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Tier 2: Raised Center Citadel & Forward Assault Mandibles
    const citadelGrad = ctx.createLinearGradient(0, -h * 0.4, 0, h * 0.4);
    citadelGrad.addColorStop(0, '#505072');
    citadelGrad.addColorStop(0.5, '#2c2c40');
    citadelGrad.addColorStop(1, '#161622');
    ctx.fillStyle = citadelGrad;
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1.4;
    ctx.shadowColor = c;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.44);
    ctx.lineTo(w * 0.18, h * 0.22);
    ctx.lineTo(w * 0.26, -h * 0.2);
    ctx.lineTo(w * 0.18, -h * 0.36);
    ctx.lineTo(-w * 0.18, -h * 0.36);
    ctx.lineTo(-w * 0.26, -h * 0.2);
    ctx.lineTo(-w * 0.18, h * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Armor Plating Seam Trenches & Structural Greebles
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(10,10,20,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, -h * 0.05); ctx.lineTo(-w * 0.18, -h * 0.05);
    ctx.moveTo(w * 0.18, -h * 0.05); ctx.lineTo(w * 0.4, -h * 0.05);
    ctx.moveTo(-w * 0.35, h * 0.18); ctx.lineTo(-w * 0.12, h * 0.18);
    ctx.moveTo(w * 0.12, h * 0.18); ctx.lineTo(w * 0.35, h * 0.18);
    ctx.stroke();

    // Energy Conduit Grid Lines (glowing power lines traversing the hull)
    ctx.strokeStyle = c + '77';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.32, -h * 0.25); ctx.lineTo(-w * 0.28, h * 0.1); ctx.lineTo(-w * 0.08, h * 0.32);
    ctx.moveTo(w * 0.32, -h * 0.25); ctx.lineTo(w * 0.28, h * 0.1); ctx.lineTo(w * 0.08, h * 0.32);
    ctx.stroke();

    // ══════════════════ CAPITAL SHIP: Heavy Tracking Broadside Turrets ══════════════════
    const angleToPlayer = Math.atan2(player.y - boss.y, player.x - boss.x) - (bank * 0.18);
    [-1, 1].forEach(side => {
        ctx.save();
        ctx.translate(side * w * 0.36, -h * 0.05);

        // Turret ring base
        ctx.fillStyle = '#181828';
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.08, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Dual heavy barrels tracking the player
        ctx.save();
        ctx.rotate(angleToPlayer);
        ctx.fillStyle = '#0a0a14';
        ctx.fillRect(-w * 0.045, -w * 0.02, w * 0.14, w * 0.018);
        ctx.fillRect(-w * 0.045, w * 0.005, w * 0.14, w * 0.018);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(w * 0.095, -w * 0.011, 2, 0, Math.PI * 2);
        ctx.arc(w * 0.095, w * 0.014, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    });

    // ══════════════════ CAPITAL SHIP: Command Bridge Tower ══════════════════
    ctx.save();
    ctx.translate(0, -h * 0.18);
    const bridgeGrad = ctx.createLinearGradient(0, -h * 0.08, 0, h * 0.08);
    bridgeGrad.addColorStop(0, '#686890');
    bridgeGrad.addColorStop(1, '#1a1a2c');
    ctx.fillStyle = bridgeGrad;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -h * 0.09);
    ctx.lineTo(w * 0.09, -h * 0.03);
    ctx.lineTo(w * 0.07, h * 0.08);
    ctx.lineTo(-w * 0.07, h * 0.08);
    ctx.lineTo(-w * 0.09, -h * 0.03);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Panoramic glowing bridge viewport windows
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.ellipse(0, -h * 0.04, w * 0.05, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ══════════════════ CAPITAL SHIP: Pulsating Super-Reactor Core ══════════════════
    const corePulse = 0.5 + Math.sin(boss.time * 6) * 0.35;
    const superCoreR = w * 0.16;

    // Outer rotating magnetic containment ring
    ctx.save();
    ctx.translate(0, h * 0.08);
    ctx.rotate(boss.time * 2);
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, superCoreR * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Super Core Flare
    const superCoreGrad = ctx.createRadialGradient(0, h * 0.08, 0, 0, h * 0.08, superCoreR * 1.3);
    superCoreGrad.addColorStop(0, '#ffffff');
    superCoreGrad.addColorStop(0.3, c);
    superCoreGrad.addColorStop(0.7, c + '66');
    superCoreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = superCoreGrad;
    ctx.shadowColor = c;
    ctx.shadowBlur = 30;
    ctx.beginPath();
    ctx.arc(0, h * 0.08, superCoreR * (0.85 + corePulse * 0.3), 0, Math.PI * 2);
    ctx.fill();

    // Crackling internal lightning arcs inside reactor
    for (let a = 0; a < 3; a++) {
        const arcAngle = (boss.time * 4 + (a * Math.PI * 2 / 3));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.08);
        ctx.lineTo(Math.cos(arcAngle) * superCoreR * 0.9, h * 0.08 + Math.sin(arcAngle) * superCoreR * 0.9);
        ctx.stroke();
    }

    // Heavy spinal spinal mega-cannon emitter at prow
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(-w * 0.04, h * 0.44, w * 0.08, h * 0.09);
    ctx.strokeStyle = c;
    ctx.strokeRect(-w * 0.04, h * 0.44, w * 0.08, h * 0.09);

    ctx.restore(); // end flagship banking rotation

    // ══════════════════ CAPITAL SHIP COMBAT TELEGRAPHS & ATTACKS ══════════════════
    if (boss.shieldPhaseTimer > 0) {

        const pulse = 0.5 + Math.sin(boss.time * 8) * 0.2;
        ctx.save();
        ctx.strokeStyle = `rgba(0,240,255,${pulse})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 25;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.65, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#00f0ff';
        ctx.fill();
        ctx.restore();
    }
    if (boss.orbitals) {

        boss.orbitals.forEach(o => {
            const ox = Math.cos(o.angle) * o.r, oy = Math.sin(o.angle) * o.r;
            ctx.save();
            ctx.fillStyle = boss.color;
            ctx.shadowColor = boss.color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(ox, oy, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }
    if (boss.missilePending) {

        const lockProgress = 1 - Math.max(0, boss.missileLockTimer / 0.6);
        const pulse = 0.5 + Math.sin(boss.time * 22) * 0.4;
        ctx.strokeStyle = '#ff3300';
        ctx.globalAlpha = 0.5 + pulse * 0.4;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 15;
        [-1, 1].forEach(side => {
            const bx = side * w * 0.3, by = h * 0.36;
            const r = w * 0.09 * (1 - lockProgress * 0.35);
            ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(bx - r - 3, by); ctx.lineTo(bx - r + 3, by);
            ctx.moveTo(bx + r - 3, by); ctx.lineTo(bx + r + 3, by);
            ctx.moveTo(bx, by - r - 3); ctx.lineTo(bx, by - r + 3);
            ctx.moveTo(bx, by + r - 3); ctx.lineTo(bx, by + r + 3);
            ctx.stroke();
        });
        ctx.globalAlpha = 1;
    }
    if (boss.phaseTelegraph > 0) {

        const pulse = 0.4 + Math.sin(boss.time * 20) * 0.35;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.3 + pulse * 0.3;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = c; ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, w * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
    if (boss.charging && boss.chargeTelegraph > 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.6 + Math.sin(boss.time * 25) * 0.4;
        ctx.lineWidth = 3.5;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18;
        ctx.setLineDash([12, 8]);
        const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * 450, Math.sin(angle) * 450);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
    }

    if (boss.laserCharging) {
        const progress = Math.min(1, boss.laserCharge);
        const lPulse = 0.6 + Math.sin(boss.time * 30) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = c;
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(0, h * 0.48, (w * 0.18) * progress * lPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = c;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 * progress;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.48);
        ctx.lineTo(0, H);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    if (boss.laserFiring) {
        const beamW = 28 + Math.sin(boss.time * 40) * 6;
        const lGrad = ctx.createLinearGradient(-beamW, 0, beamW, 0);
        lGrad.addColorStop(0, 'rgba(255,255,255,0)');
        lGrad.addColorStop(0.3, c);
        lGrad.addColorStop(0.5, '#ffffff');
        lGrad.addColorStop(0.7, c);
        lGrad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lGrad;
        ctx.shadowColor = c;
        ctx.shadowBlur = 35;
        ctx.fillRect(-beamW, h * 0.48, beamW * 2, H);
    }

    // ══════════════════ CAPITAL SHIP DAMAGE STATE ══════════════════
    const bossHpFrac = boss.hp / boss.maxHp;
    if (bossHpFrac <= 0.66) {

        if (Math.random() < 0.06) {
            const sx = (Math.random() - 0.5) * w * 0.6, sy = (Math.random() - 0.5) * h * 0.5;
            particles.push(makeParticle(boss.x + sx, boss.y + sy, '#ffe600', 1.8, 0.25));
        }
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#1a0a0a';
        ctx.beginPath();
        ctx.arc(w * 0.22, -h * 0.12, w * 0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    if (bossHpFrac <= 0.33) {

        if (Math.random() < 0.15) {
            const sx = (Math.random() - 0.5) * w * 0.7, sy = (Math.random() - 0.5) * h * 0.6;
            particles.push(makeParticle(boss.x + sx, boss.y + sy, Math.random() < 0.5 ? '#ffe600' : '#ff6a00', 2.2, 0.3));
        }
        if (Math.random() < 0.08) {
            particles.push({
                x: boss.x + (Math.random() - 0.5) * w * 0.5, y: boss.y + (Math.random() - 0.5) * h * 0.4,
                vx: (Math.random() - 0.5) * 1, vy: -0.5 - Math.random(), size: 3 + Math.random() * 2,
                life: 0.6, maxLife: 0.6, color: 'rgba(120,120,130,0.5)'
            });
        }
        // exposed weak point: a visible glowing crack in the armor
        ctx.save();
        ctx.strokeStyle = `rgba(255,60,30,${0.5 + Math.sin(boss.time * 12) * 0.3})`;
        ctx.lineWidth = 2; ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-w * 0.1, -h * 0.05); ctx.lineTo(-w * 0.02, h * 0.05); ctx.lineTo(-w * 0.14, h * 0.15);
        ctx.stroke();
        ctx.restore();
        // unstable reactor glow (erratic flashing instead of smooth pulse, layered on top of the reactor drawn above)
        if (Math.random() < 0.1) {
            ctx.save();
            ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5; ctx.shadowColor = '#fff'; ctx.shadowBlur = 25;
            ctx.beginPath(); ctx.arc(0, h * 0.08, w * 0.2, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // Health bar above boss flagship
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-w / 2, -h / 2 - 14, w, 4);
    ctx.fillStyle = c;
    ctx.fillRect(-w / 2, -h / 2 - 14, w * (boss.hp / boss.maxHp), 4);

    ctx.restore();
}
function damageBoss(dmg) {
    if (!boss) return;
    const applied = boss.shieldPhaseTimer > 0 ? dmg * 0.35 : dmg;
    boss.hp -= applied;
    triggerShake('light');
    if (boss.hp <= 0) {
        // Boss defeated! Capital-ship-scale destruction: fragments, core flash, staggered chain explosions, strongest shockwave tier
        const bossDeathX = boss.x, bossDeathY = boss.y;
        destroyShip(boss.x, boss.y, boss.color, boss.w * 1.6);
        explode(boss.x, boss.y, boss.color, 50);
        explode(boss.x, boss.y, '#fff', 30);
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (boss) {
                    const fx = boss.x + (Math.random() - 0.5) * 100;
                    const fy = boss.y + (Math.random() - 0.5) * 80;
                    explode(fx, fy, boss.color, 15);
                    for (let d = 0; d < 3; d++) {
                        const angle = Math.random() * Math.PI * 2;
                        particles.push({
                            x: fx, y: fy, vx: Math.cos(angle) * 3, vy: Math.sin(angle) * 3,
                            size: 4 + Math.random() * 3, life: 0.7 + Math.random() * 0.4, maxLife: 1.1,
                            color: '#555', shape: 'debris', rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.5
                        });
                    }
                }
            }, i * 80);
        }
        const bossScore = 1000 + wave * 200;
        score += bossScore * comboMultiplier;
        addScorePopup(boss.x, boss.y, '+' + (bossScore * comboMultiplier), '#ffe600');
        bossesDefeated++;
        triggerShake('heavy');
        boss = null;
        bossHud.classList.add('hidden');

        // Boss defeat: guaranteed multiple rewards, each a genuinely different type, respecting wave eligibility
        const bossDropPoolAll = Object.keys(POWERUP_TYPES).filter(k => wave >= (POWERUP_TYPES[k].minWave || 0));
        const firstType = bossDropPoolAll[Math.floor(Math.random() * bossDropPoolAll.length)];
        const remainingPool = bossDropPoolAll.filter(t => t !== firstType);
        const secondType = (remainingPool.length ? remainingPool : bossDropPoolAll)[Math.floor(Math.random() * (remainingPool.length ? remainingPool.length : bossDropPoolAll.length))];
        spawnPowerup(bossDeathX - 40, bossDeathY, firstType);
        spawnPowerup(bossDeathX + 40, bossDeathY, secondType);
    }
}
function tickMissile(m, dt, targetOverride) {
    if (m.exploded) return;
    if (m.life != null) m.life -= dt;

    // Homing guidance physics
    if (m.trackTime > 0) {
        m.trackTime -= dt;
        let target = targetOverride || null, minD = 700;
        if (!targetOverride && m.friendly) {
            const targets = boss ? [...enemies, boss] : enemies;
            targets.forEach(t => {
                const dist = Math.hypot(t.x - m.x, t.y - m.y);
                if (dist < minD) { minD = dist; target = t; }
            });
        }
        if (target) {
            const desired = Math.atan2(target.y - m.y, target.x - m.x);
            const current = Math.atan2(m.vy, m.vx);
            let diff = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
            const turn = m.turnRate || (m.friendly ? 0.09 : 0.06);
            diff = Math.max(-turn, Math.min(turn, diff));
            const newAngle = current + diff;
            const currentSpd = Math.hypot(m.vx, m.vy);
            const targetSpd = m.friendly ? 7.5 : 5.8;
            const spd = currentSpd + (targetSpd - currentSpd) * Math.min(1, dt * 2.5);
            m.vx = Math.cos(newAngle) * spd;
            m.vy = Math.sin(newAngle) * spd;
        }
    }
    m.x += m.vx * dt * 60;
    m.y += m.vy * dt * 60;

    // Fiery rocket exhaust plume and trailing smoke particles
    const mAngle = Math.atan2(m.vy, m.vx);
    const trailColor = m.friendly
        ? (Math.random() < 0.5 ? '#00f0ff' : '#ffffff')
        : (Math.random() < 0.6 ? '#ff3300' : '#ffcc00');

    if (Math.random() < 0.8) {
        particles.push({
            x: m.x - Math.cos(mAngle) * 8 + (Math.random() - 0.5) * 2,
            y: m.y - Math.sin(mAngle) * 8 + (Math.random() - 0.5) * 2,
            vx: -Math.cos(mAngle) * 2.5 + (Math.random() - 0.5) * 1.5,
            vy: -Math.sin(mAngle) * 2.5 + (Math.random() - 0.5) * 1.5,
            size: 1.8 + Math.random() * 1.8,
            life: 0.35,
            maxLife: 0.35,
            color: trailColor
        });
    }

    if (m.life != null && m.life <= 0) explodeMissile(m);
}

function updatePlayerMissiles(dt) {
    missiles.forEach(m => { if (m.friendly) tickMissile(m, dt); });
}

function updateEnemyMissiles(dt) {
    missiles.forEach(m => { if (!m.friendly) tickMissile(m, dt, player); });
    missiles = missiles.filter(m => m.y > -50 && m.y < H + 50 && m.x > -50 && m.x < W + 50 && !m.exploded);
    if (missiles.length > 30) missiles.splice(0, missiles.length - 30);
}

function drawMissile() {
    missiles.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        const angle = Math.atan2(m.vy, m.vx) + Math.PI / 2;
        ctx.rotate(angle);
        const bodyColor = m.friendly ? '#ff2d95' : '#ff3300';
        const engineColor = m.friendly ? '#00f0ff' : '#ff9900';
        const t = performance.now();
        const flick = 0.75 + Math.sin(t * 0.04) * 0.25;

        // Animated rocket booster flame
        const fLen = 9 + flick * 7;
        const fg = ctx.createLinearGradient(0, 5, 0, 5 + fLen);
        fg.addColorStop(0, '#ffffff');
        fg.addColorStop(0.35, engineColor);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg;
        ctx.shadowColor = engineColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-2.2, 5);
        ctx.lineTo(0, 5 + fLen);
        ctx.lineTo(2.2, 5);
        ctx.closePath();
        ctx.fill();

        // Missile casing
        const mGrad = ctx.createLinearGradient(-3, 0, 3, 0);
        mGrad.addColorStop(0, m.friendly ? '#ffffff' : '#4a1515');
        mGrad.addColorStop(0.5, m.friendly ? '#c8d0e0' : '#220808');
        mGrad.addColorStop(1, m.friendly ? '#9098a8' : '#140404');
        ctx.fillStyle = mGrad;
        ctx.strokeStyle = bodyColor;
        ctx.lineWidth = 1.2;
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(2.8, -2);
        ctx.lineTo(2.8, 5);
        ctx.lineTo(-2.8, 5);
        ctx.lineTo(-2.8, -2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Warhead tip glow
        ctx.fillStyle = bodyColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -7, 1.6, 0, Math.PI * 2);
        ctx.fill();

        // Guidance stabilizer fins
        ctx.shadowBlur = 0;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(-2.8, 2.5); ctx.lineTo(-6, 6.5); ctx.lineTo(-2.8, 5.5); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2.8, 2.5); ctx.lineTo(6, 6.5); ctx.lineTo(2.8, 5.5); ctx.closePath(); ctx.fill();

        ctx.restore();
    });
}
function explodeMissile(m) {
    explode(m.x, m.y, m.friendly ? '#ff6a00' : '#ff3300', 16);
    triggerShake('light');
    m.exploded = true;
}
function updateMines(dt) {
    mines.forEach(m => {
        if (!m.settled) {
            m.y += (m.targetY - m.y) * 0.08;
            if (Math.abs(m.y - m.targetY) < 2) { m.y = m.targetY; m.settled = true; }
        } else {
            m.timer -= dt;
        }
    });
    for (let i = mines.length - 1; i >= 0; i--) {
        const m = mines[i];
        const detonate = m.settled && m.timer <= 0;
        const touched = m.settled && player.invincible <= 0 && collides(m, player, m.r, player.hitboxR);
        if (detonate || touched) {
            explode(m.x, m.y, m.color, 20);
            if (touched || (m.settled && Math.abs(m.x - player.x) < 70 && Math.abs(m.y - player.y) < 70)) {
                if (player.invincible <= 0) hitPlayer(15);
            }
            triggerShake('light');
            mines.splice(i, 1);
        }
    }
}
function drawMines() {
    mines.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);
        const pulse = m.settled ? (0.6 + Math.sin(m.timer * 10) * 0.4) : 0.8;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = m.color;
        ctx.shadowColor = m.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, m.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = pulse * 0.6;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, m.r + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });
    ctx.globalAlpha = 1;
}
function pickRarity() {
    const total = RARITY_WEIGHTS.common + RARITY_WEIGHTS.rare + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.legendary;
    let r = Math.random() * total;
    if (r < RARITY_WEIGHTS.common) return 'common';
    r -= RARITY_WEIGHTS.common;
    if (r < RARITY_WEIGHTS.rare) return 'rare';
    r -= RARITY_WEIGHTS.rare;
    if (r < RARITY_WEIGHTS.epic) return 'epic';
    return 'legendary';
}
function spawnPowerup(x, y, forceType) {
    let type = forceType;
    if (!type) {
        const eligible = Object.keys(POWERUP_TYPES).filter(k => wave >= (POWERUP_TYPES[k].minWave || 0));
        const rarity = pickRarity();
        const pool = eligible.filter(k => POWERUP_TYPES[k].rarity === rarity);
        const fallback = eligible.filter(k => POWERUP_TYPES[k].rarity === 'common');
        const finalPool = pool.length ? pool : (fallback.length ? fallback : eligible);
        type = finalPool[Math.floor(Math.random() * finalPool.length)];
    }
    const def = POWERUP_TYPES[type];
    powerups.push({ x, y, type, color: def.color, rarity: def.rarity, size: 12, time: 0, spawnAt: performance.now() });
}
function maybeDropPowerup(enemyType, x, y) {

    if (wave < 2) return;
    killsSinceLastReward++;
    if (killsSinceLastReward >= rewardThreshold) {
        spawnPowerup(x, y);
        killsSinceLastReward = 0;
        rewardThreshold = pickRewardThreshold();
    }
}
function updatePowerups(dt) {

    const magnetActive = (playerUpgrades.magnet || 0) > 0 || magnetTimer > 0;
    const pullRange = 90 + (playerUpgrades.magnet || 0) * 40 + (magnetTimer > 0 ? 60 : 0);
    powerups.forEach(p => {
        if (magnetActive) {
            const dx = player.x - p.x, dy = player.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < pullRange) {
                const pullSpeed = 2 + (1 - dist / pullRange) * 8;
                p.x += (dx / dist) * pullSpeed; p.y += (dy / dist) * pullSpeed;
                if (Math.random() < 0.3) particles.push(makeParticle(p.x, p.y, p.color, 1.5, 0.2));
            } else p.y += 1.5;
        } else {
            p.y += 1.5;
        }
        p.time += dt;
    });
    powerups = powerups.filter(p => p.y < H + 30);
}
function collectPowerup(p) {
    applyPowerup(p.type);
}
function showPowerupNotification(text, color) {
    notifications.push({ x: player.x, y: player.y - 40, text, color, life: 1.2, maxLife: 1.2 });
}
function updateNotifications(dt) {
    notifications.forEach(n => { n.y -= 30 * dt; n.life -= dt; });
    notifications = notifications.filter(n => n.life > 0);
}
function drawNotifications() {
    notifications.forEach(n => {
        const alpha = Math.min(1, n.life / n.maxLife * 2);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 15px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = n.color;
        ctx.shadowColor = n.color;
        ctx.shadowBlur = 10;
        ctx.fillText(n.text, n.x, n.y);
        ctx.restore();
    });
}
function applyPowerup(type) {
    const def = POWERUP_TYPES[type];
    if (type === 'shield') { shieldTimer = 8; }
    if (type === 'rapid') { rapidFire = 5; }
    if (type === 'repair') {

        const mh = maxHealth + (playerUpgrades.maxHealth || 0) * 15;
        health = Math.min(mh, health + 30);
    }
    if (type === 'bomb') { novaBombs = Math.min(maxBombs, novaBombs + 1); }
    if (type === 'bulletSpeed') { playerUpgrades.bulletSpeed = Math.min(4, (playerUpgrades.bulletSpeed || 0) + 1); }
    if (type === 'doubleMissile') { playerUpgrades.doubleMissile = Math.min(2, (playerUpgrades.doubleMissile || 0) + 1); }
    if (type === 'bullet2' || type === 'bullet3' || type === 'bullet4') {

        const targetColumns = POWERUP_TYPES[type].columns;
        const targetLevel = targetColumns - 1; // columns = 1 + multiShot
        playerUpgrades.multiShot = Math.max(playerUpgrades.multiShot || 0, targetLevel);
    }
    if (type === 'damageBoost') { playerUpgrades.damageBoost = (playerUpgrades.damageBoost || 0) + 1; }
    if (type === 'homing') { homingTimer = 8; }
    if (type === 'magnet') { magnetTimer = 8; }
    if (type === 'healthBoost') {

        playerUpgrades.maxHealth = (playerUpgrades.maxHealth || 0) + 1;
        const mh = maxHealth + playerUpgrades.maxHealth * 15;
        health = mh;
    }

    for (let i = 0; i < 20; i++) particles.push(makeParticle(player.x, player.y, def.color, 3, 0.5));
    // expanding energy ring
    powerupRings.push({ x: player.x, y: player.y, r: 4, maxR: 60, color: def.color, life: 0.5, maxLife: 0.5 });
    showPowerupNotification(def.label, def.color);
    player.glowColor = def.color;
    player.glowTimer = 0.5;
    hitFreezeTimer = Math.max(hitFreezeTimer, 0.035);
    updateBombHUD();
}
function drawPowerup(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    const bob = Math.sin(p.time * 3) * 3;
    ctx.translate(0, bob);
    ctx.rotate(p.time * 1.8);

    const rarityMult = { common: 1, rare: 1.3, epic: 1.6, legendary: 2.1 }[p.rarity] || 1;
    const glowSize = 14 * rarityMult + Math.sin(p.time * 6) * 3;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(0, 0, glowSize, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // outer holographic ring (rarity indicator)
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = p.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, p.size + 4, 0, Math.PI * 2); ctx.stroke();
    if (p.rarity === 'epic' || p.rarity === 'legendary') {
        ctx.beginPath(); ctx.arc(0, 0, p.size + 8, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    const isHeart = p.type === 'repair' || p.type === 'healthBoost';
    const isMissile = p.type === 'doubleMissile';
    const isBulletCount = p.type === 'bullet2' || p.type === 'bullet3' || p.type === 'bullet4';

    if (isHeart) {
        // energy heart / medical core - unmistakably distinct from the generic diamond
        const s = p.size * 0.85;
        ctx.fillStyle = p.color; ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.15, -s, s * 0.3, 0, s);
        ctx.bezierCurveTo(s, s * 0.3, s * 0.5, -s * 0.15, 0, s * 0.35);
        ctx.closePath();
        ctx.fill();
        if (p.type === 'healthBoost') {
            // armored reinforcement frame around the heart (max-health variant)
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.shadowBlur = 6;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                const px = Math.cos(a) * s * 1.25, py = Math.sin(a) * s * 1.25;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.stroke();
        }
    } else if (isMissile) {
        // real missile silhouette: body, nose, fins, engine glow - not a generic capsule
        const s = p.size;
        const eg = ctx.createRadialGradient(0, s * 0.9, 0, 0, s * 0.9, s * 0.5);
        eg.addColorStop(0, '#fff'); eg.addColorStop(0.5, '#ff6a00'); eg.addColorStop(1, 'rgba(255,106,0,0)');
        ctx.fillStyle = eg; ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(0, s * 0.9, s * 0.45, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ddd'; ctx.strokeStyle = p.color; ctx.lineWidth = 1.2; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.35, -s * 0.2);
        ctx.lineTo(s * 0.35, s * 0.7);
        ctx.lineTo(-s * 0.35, s * 0.7);
        ctx.lineTo(-s * 0.35, -s * 0.2);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.moveTo(-s * 0.35, s * 0.35); ctx.lineTo(-s * 0.7, s * 0.7); ctx.lineTo(-s * 0.35, s * 0.7); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(s * 0.35, s * 0.35); ctx.lineTo(s * 0.7, s * 0.7); ctx.lineTo(s * 0.35, s * 0.7); ctx.closePath(); ctx.fill();
    } else if (isBulletCount) {
        // weapon module showing the exact column count as both bars and a number
        const cols = POWERUP_TYPES[p.type].columns;
        const s = p.size;
        ctx.fillStyle = '#1a1a2c'; ctx.strokeStyle = p.color; ctx.lineWidth = 1.3;
        ctx.shadowColor = p.color; ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-s * 0.15, -s); ctx.lineTo(s * 0.15, -s);
        ctx.lineTo(s * 0.7, s * 0.8); ctx.lineTo(-s * 0.7, s * 0.8);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.color; ctx.shadowBlur = 8;
        const barSpan = s * 0.9;
        for (let i = 0; i < cols; i++) {
            const bx = -barSpan / 2 + (barSpan / (cols - 1 || 1)) * i * (cols > 1 ? 1 : 0);
            ctx.fillRect(bx - 1, s * 0.05, 2, s * 0.55);
        }
    } else {
        // diamond capsule body (default shape for the remaining reward types)
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fill();
    }

    // icon glyph / number overlay (stays upright regardless of body rotation)
    ctx.rotate(-p.time * 1.8);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#fff';
    ctx.shadowBlur = 4;
    ctx.lineWidth = 1.4;
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (isBulletCount) {
        ctx.font = 'bold 13px Orbitron, sans-serif';
        ctx.fillText(String(POWERUP_TYPES[p.type].columns), 0, -1);
    } else if (isMissile) {
        ctx.font = 'bold 9px Orbitron, sans-serif';
        ctx.fillText('×2', 0, 2);
    } else if (p.type === 'healthBoost') {
        ctx.fillText('MAX', 0, 1);
    } else if (!isHeart) {
        const glyphs = {
            shield: '◈', rapid: '»', bomb: '☢',
            bulletSpeed: '↑', damageBoost: '✦',
            homing: '◎', magnet: '⊔'
        };
        ctx.fillText(glyphs[p.type] || '?', 0, 1);
    }

    ctx.restore();
}
function updatePowerupRings(dt) {
    powerupRings.forEach(r => { r.r += (r.maxR - r.r) * 0.15; r.life -= dt; });
    powerupRings = powerupRings.filter(r => r.life > 0);
}
function drawPowerupRings() {
    powerupRings.forEach(r => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, r.life / r.maxLife) * 0.6;
        ctx.strokeStyle = r.color;
        ctx.shadowColor = r.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    });
}
function deployNovaBomb() {
    if (novaBombs <= 0 || bombCooldown > 0) return;
    novaBombs--;
    const overclock = playerUpgrades.overclock || 0;
    bombCooldown = Math.max(0.15, 0.5 - overclock * 0.15);
    updateBombHUD();
    triggerShake('heavy');


    enemies.forEach(e => {
        explode(e.x, e.y, e.color, 15);
        score += e.score * comboMultiplier;
        addScorePopup(e.x, e.y, '+' + (e.score * comboMultiplier), e.color);
        kills++;
        registerKill();
    });
    enemies = [];
    mines.forEach(m => explode(m.x, m.y, m.color, 10));
    mines = [];


    bullets = bullets.filter(b => b.friendly);


    if (boss && !boss.entering) {
        damageBoss(getPlayerDamage() * (10 + overclock * 5));
    }


    for (let i = 0; i < 80; i++) {
        const angle = (Math.PI * 2 * i) / 80;
        const speed = 8 + Math.random() * 4;
        particles.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 3,
            life: 1.2, maxLife: 1.2,
            color: i % 3 === 0 ? '#ffe600' : i % 3 === 1 ? '#ff6a00' : '#ff2d95'
        });
    }

    for (let i = 0; i < 30; i++) {
        particles.push(makeParticle(player.x, player.y, '#fff', 5, 0.8));
    }
}
function updateBombHUD() {
    const pips = hudBombs.querySelectorAll('.bomb-pip');
    pips.forEach((pip, i) => {
        pip.classList.toggle('active', i < novaBombs);
    });
}
function registerKill() {
    combo++;
    comboTimer = 2.0;
    if (combo > maxCombo) maxCombo = combo;
    comboMultiplier = Math.min(8, 1 + Math.floor(combo / 3));

    hudCombo.classList.remove('combo-pop');
    void hudCombo.offsetHeight;
    hudCombo.classList.add('combo-pop');
    setTimeout(() => hudCombo.classList.remove('combo-pop'), 150);
}
function updateCombo(dt) {
    if (combo > 0) {
        const decayFactor = Math.max(0.4, 1 - (playerUpgrades.comboDecay || 0) * 0.2);
        comboTimer -= dt * decayFactor;
        if (comboTimer <= 0) {
            combo = 0;
            comboMultiplier = 1;
        }
    }

    hudCombo.textContent = '×' + comboMultiplier;

    hudCombo.className = 'hud-value combo-display';
    if (comboMultiplier >= 6) hudCombo.classList.add('combo-x8');
    else if (comboMultiplier >= 5) hudCombo.classList.add('combo-x5');
    else if (comboMultiplier >= 4) hudCombo.classList.add('combo-x4');
    else if (comboMultiplier >= 3) hudCombo.classList.add('combo-x3');
    else if (comboMultiplier >= 2) hudCombo.classList.add('combo-x2');
}
function triggerShake(level) {
    if (level === 'light') {
        gameScreen.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
        void gameScreen.offsetHeight;
        gameScreen.classList.add('shake-light');
        setTimeout(() => gameScreen.classList.remove('shake-light'), 150);
    } else if (level === 'medium') {
        gameScreen.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
        void gameScreen.offsetHeight;
        gameScreen.classList.add('shake-medium');
        setTimeout(() => gameScreen.classList.remove('shake-medium'), 250);
    } else {
        gameScreen.classList.remove('shake-light', 'shake-medium', 'shake-heavy');
        void gameScreen.offsetHeight;
        gameScreen.classList.add('shake-heavy');
        setTimeout(() => gameScreen.classList.remove('shake-heavy'), 350);
    }
}
function triggerHitFreeze() {
    hitFreezeTimer = 0.04;
}
function getTimeScale() {
    if (hitFreezeTimer > 0) return 0.05;
    const effectiveMaxHP = maxHealth + (playerUpgrades.maxHealth || 0) * 15;
    if (health < effectiveMaxHP * 0.15) {
        bulletTimeActive = true;
        return 0.55;
    }
    bulletTimeActive = false;
    return 1.0;
}


function collides(a, b, ra, rb) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy) < ra + rb;
}
function checkCollisions() {
    const dmg = getPlayerDamage();


    bullets = bullets.filter(b => {
        if (!b.friendly) return true;

        // Intercept incoming enemy missiles with player gunfire
        for (let i = 0; i < missiles.length; i++) {
            const m = missiles[i];
            if (!m.friendly && !m.exploded && collides(b, m, b.r, m.r + 3)) {
                explodeMissile(m);
                explode(b.x, b.y, '#ffe600', 8);
                score += 50;
                addScorePopup(m.x, m.y, '+50', '#ff6600');
                if ((b.pierce || 0) > 0) { b.pierce--; continue; }
                return false;
            }
        }

        for (let i = enemies.length - 1; i >= 0; i--) {
            const en = enemies[i];
            if (collides(b, en, b.r, en.w / 2)) {
                if (en.hasShield) {
                    const hitAngle = Math.atan2(b.y - en.y, b.x - en.x);
                    let diff = Math.atan2(Math.sin(hitAngle - en.shieldAngle), Math.cos(hitAngle - en.shieldAngle));
                    if (Math.abs(diff) < 0.8) {
                        explode(b.x, b.y, '#ffffff', 5);
                        en.shieldFlash = 0.35;
                        return false;
                    }
                }
                en.hp -= dmg;
                shotsHit++;
                explode(b.x, b.y, en.color, 6);
                if (en.hp <= 0) {
                    destroyShip(en.x, en.y, en.color, en.w, en.splits);
                    const pts = en.score * comboMultiplier;
                    score += pts;
                    kills++;
                    registerKill();
                    triggerHitFreeze();
                    addScorePopup(en.x, en.y - 15, '+' + pts, en.color);
                    maybeDropPowerup(en.type, en.x, en.y);
                    if (en.splits) splitEnemy(en);
                    if ((playerUpgrades.vampiric || 0) > 0 && Math.random() < 0.12) {
                        const mh = maxHealth + (playerUpgrades.maxHealth || 0) * 15;
                        health = Math.min(mh, health + 4);
                    }
                    enemies.splice(i, 1);
                }
                if ((b.pierce || 0) > 0) { b.pierce--; continue; }
                return false;
            }
        }

        if (boss && !boss.entering && collides(b, boss, b.r, boss.w / 2)) {
            shotsHit++;
            damageBoss(dmg);
            explode(b.x, b.y, boss ? boss.color : '#ff2d95', 4);
            if ((b.pierce || 0) > 0) { b.pierce--; return true; }
            return false;
        }
        return true;
    });


    missiles.forEach(m => {
        if (m.exploded || !m.friendly) return;
        for (let i = enemies.length - 1; i >= 0; i--) {
            const en = enemies[i];
            if (collides(m, en, m.r, en.w / 2)) {
                en.hp -= dmg * 3;
                explodeMissile(m);
                if (en.hp <= 0) {
                    destroyShip(en.x, en.y, en.color, en.w, en.splits);
                    const pts = en.score * comboMultiplier;
                    score += pts; kills++; registerKill(); triggerHitFreeze();
                    addScorePopup(en.x, en.y - 15, '+' + pts, en.color);
                    maybeDropPowerup(en.type, en.x, en.y);
                    if (en.splits) splitEnemy(en);
                    enemies.splice(i, 1);
                }
                return;
            }
        }
        if (boss && !boss.entering && collides(m, boss, m.r, boss.w / 2)) {
            damageBoss(dmg * 3);
            explodeMissile(m);
        }
    });
    missiles = missiles.filter(m => !m.exploded);


    if (player.invincible <= 0) {
        bullets = bullets.filter(b => {
            if (b.friendly) return true;
            if (collides(b, player, b.r, player.hitboxR)) {
                const base = b.kind === 'heavy' ? 16 : 10;
                hitPlayer(b.fromBoss ? base : Math.round(base * getEnemyDamageMult()));
                return false;
            }
            return true;
        });

        missiles.forEach(m => {
            if (m.friendly || m.exploded) return;
            if (collides(m, player, m.r, player.hitboxR)) {
                hitPlayer(m.fromBoss ? 22 : Math.round(22 * getEnemyDamageMult()));
                explodeMissile(m);
            }
        });
        missiles = missiles.filter(m => !m.exploded);



        enemies = enemies.filter(e => {
            if (collides(e, player, e.w / 2, player.hitboxR)) {
                hitPlayer(Math.round(20 * getEnemyDamageMult()));
                explode(e.x, e.y, e.color, 15);
                return false;
            }
            return true;
        });


        if (boss && !boss.entering && collides(boss, player, boss.w / 2, player.hitboxR)) {
            hitPlayer(25);
        }
    }


    powerups = powerups.filter(p => {
        if (collides(p, player, p.size, player.hitboxR + 10)) {
            collectPowerup(p);
            return false;
        }
        return true;
    });
}
function getEnemyDamageMult() {

    return Math.min(1.35, 1 + Math.max(0, wave - 2) * 0.025);
}
function hitPlayer(dmg) {
    if (shieldTimer > 0) { shieldTimer = 0; player.invincible = 0.5; explode(player.x, player.y, '#00f0ff', 15); triggerShake('light'); return; }
    health -= dmg;
    player.invincible = 1;
    player.damageFlash = 1;
    explode(player.x, player.y, '#ff2d95', 10);
    triggerShake('medium');
    if (health <= 0) { health = 0; gameOver(); }
}
function updateDangerZone() {
    let leftDanger = false, rightDanger = false;
    enemies.forEach(e => {
        if (e.x < 80 && e.y > 0 && e.y < H) leftDanger = true;
        if (e.x > W - 80 && e.y > 0 && e.y < H) rightDanger = true;
    });
    dangerLeftEl.classList.toggle('visible', leftDanger);
    dangerLeftEl.classList.toggle('hidden', !leftDanger);
    dangerRightEl.classList.toggle('visible', rightDanger);
    dangerRightEl.classList.toggle('hidden', !rightDanger);
}
function updateHUD() {
    hudScore.textContent = score;
    hudWave.textContent = wave;
    const effectiveMaxHP = maxHealth + (playerUpgrades.maxHealth || 0) * 15;
    const pct = (health / effectiveMaxHP) * 100;
    healthFill.style.width = pct + '%';
    healthFill.className = 'health-fill' + (pct < 20 ? ' critical' : pct < 50 ? ' low' : '');
    shieldInd.style.display = shieldTimer > 0 ? 'inline' : 'none';

    const missileCount = getMissileCount();
    if (missileCount > 0) {
        missileIndicator.classList.remove('hidden');
        hudMissiles.textContent = missileCount;
    } else {
        missileIndicator.classList.add('hidden');
    }

    const bulletCount = getBulletCount();
    if (bulletCount > 1) {
        bulletColumnsIndicator.classList.remove('hidden');
        hudBulletColumns.textContent = bulletCount;
    } else {
        bulletColumnsIndicator.classList.add('hidden');
    }

    const bulletSpeedMult = getBulletSpeed() / 10;
    if (bulletSpeedMult > 1.01) {
        bulletSpeedIndicator.classList.remove('hidden');
        hudBulletSpeed.textContent = bulletSpeedMult.toFixed(1) + '×';
    } else {
        bulletSpeedIndicator.classList.add('hidden');
    }

    const dmgBonus = getPlayerDamage() - 1;
    if (dmgBonus > 0) {
        damageIndicator.classList.remove('hidden');
        hudDamage.textContent = '+' + dmgBonus;
    } else {
        damageIndicator.classList.add('hidden');
    }

    const fireRateMult = (0.18 / getFireRate());
    if (fireRateMult > 1.01) {
        fireRateIndicator.classList.remove('hidden');
        hudFireRate.textContent = fireRateMult.toFixed(1) + '×';
    } else {
        fireRateIndicator.classList.add('hidden');
    }

    updateActivePowerupBars();
}
function updateActivePowerupBars() {
    const rows = [];
    if (rapidFire > 0) rows.push({ label: 'RAPID FIRE', secs: rapidFire, pct: Math.min(100, (rapidFire / 5) * 100), color: '#ff6a00' });
    if (shieldTimer > 0) rows.push({ label: 'SHIELD', secs: shieldTimer, pct: Math.min(100, (shieldTimer / 8) * 100), color: '#00f0ff' });
    if (homingTimer > 0) rows.push({ label: 'HOMING', secs: homingTimer, pct: Math.min(100, (homingTimer / 8) * 100), color: '#39ffb0' });
    if (magnetTimer > 0) rows.push({ label: 'MAGNET', secs: magnetTimer, pct: Math.min(100, (magnetTimer / 8) * 100), color: '#ffcc00' });
    if (empDebuffTimer > 0) rows.push({ label: 'EMP DISRUPTED', secs: empDebuffTimer, pct: Math.min(100, (empDebuffTimer / 3) * 100), color: '#ff2222' });
    activePowerupsEl.innerHTML = rows.map(r =>
        `<div class="active-powerup-row"><span class="active-powerup-label">${r.label}: ${r.secs.toFixed(1)}s</span><div class="active-powerup-bar"><div class="active-powerup-fill" style="width:${r.pct}%;background:${r.color};box-shadow:0 0 6px ${r.color}"></div></div></div>`
    ).join('');
}
function announceWave() {
    waveNum.textContent = wave;
    waveAnnounce.classList.remove('hidden', 'boss-wave');
    if (wave >= 2) waveAnnounce.classList.add('boss-wave');
    waveAnnounce.style.animation = 'none';
    void waveAnnounce.offsetHeight;
    waveAnnounce.style.animation = 'waveIn 2s ease-out forwards';
    setTimeout(() => waveAnnounce.classList.add('hidden'), 2200);
}
let pendingBossWave = false;
function nextWave() {
    wave++;
    const thisWave = wave;

    if (wave === 3) {
        showPowerupNotification("MISSILE & MULTI-SHOT REWARDS AVAILABLE!", "#00f0ff");
    }

    announceWave();
    pendingBossWave = wave >= 2 && wave % 2 === 0;

    if (pendingBossWave) {

        setTimeout(() => {
            if (gameState === 'playing' && wave === thisWave) { spawnBoss(); pendingBossWave = false; }
        }, 1500);
    }

    enemyTimer = 0;
    waveTimer = 0;
    waveClearChecked = false;
}
function drawBackground() {
    // Fixed blue/cyan deep-space palette - no hue drift over time or across waves,
    // so the background always reads as one consistent color theme.
    const baseHue = 205;

    // 1. Deep Space Cosmic Void Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020208');
    grad.addColorStop(0.35, `hsl(${baseHue}, 35%, 3%)`);
    grad.addColorStop(0.75, `hsl(${baseHue + 10}, 28%, 4%)`);
    grad.addColorStop(1, '#010106');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2. Volumetric Deep Nebula Clouds
    const t = performance.now() * 0.00008;

    ctx.save();
    ctx.globalAlpha = 0.055;

    // Primary Nebula Filament
    const nebX1 = W * 0.35 + Math.sin(t) * 120;
    const nebY1 = H * 0.4 + Math.cos(t * 0.8) * 90;
    const nebulaGrad = ctx.createRadialGradient(
        nebX1, nebY1, 40,
        nebX1, nebY1, Math.max(W, H) * 0.55
    );
    nebulaGrad.addColorStop(0, `hsl(${baseHue - 15}, 70%, 45%)`);
    nebulaGrad.addColorStop(0.5, `hsl(${baseHue}, 65%, 30%)`);
    nebulaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, W, H);

    // Secondary Nebula Dust - same blue/cyan family as the primary filament,
    // just a different soft shape/position, so it reads as one uniform tint
    const nebX2 = W * 0.75 + Math.cos(t * 1.2) * 140;
    const nebY2 = H * 0.65 + Math.sin(t * 0.6) * 110;
    const nebulaGrad2 = ctx.createRadialGradient(
        nebX2, nebY2, 30,
        nebX2, nebY2, Math.max(W, H) * 0.45
    );
    nebulaGrad2.addColorStop(0, `hsl(${baseHue}, 70%, 40%)`);
    nebulaGrad2.addColorStop(0.6, `hsl(${baseHue + 15}, 60%, 22%)`);
    nebulaGrad2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebulaGrad2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let rawDt = Math.min((timestamp - lastTime) / 1000, 0.05);
    if (isNaN(rawDt) || rawDt <= 0) rawDt = 0.016;
    lastTime = timestamp;

    // Always update celestial environment (stars, planets, meteors)
    updateStars(rawDt);

    if (gameState !== 'playing') {
        // Render deep space background when paused, in menu, upgrading, or game over
        ctx.clearRect(0, 0, W, H);
        drawBackground();
        drawStars();
        animFrame = requestAnimationFrame(gameLoop);
        return;
    }

    if (hitFreezeTimer > 0) hitFreezeTimer -= rawDt;
    const timeScale = getTimeScale();
    const dt = rawDt * timeScale;

    timeSurvived += rawDt;

    if (rapidFire > 0) rapidFire -= dt;
    if (shieldTimer > 0) shieldTimer -= dt;
    if (empDebuffTimer > 0) empDebuffTimer -= dt;
    if (homingTimer > 0) homingTimer -= dt;
    if (magnetTimer > 0) magnetTimer -= dt;
    if (bombCooldown > 0) bombCooldown -= dt;
    fireTimer -= dt;
    waveTimer += dt;

    updateCombo(dt);

    if (keys['Space'] || keys['KeyZ']) {
        if (fireTimer <= 0) { shoot(); fireTimer = getFireRate(); }
        if (getMissileCount() > 0) spawnPlayerMissile();
    }
    if (missileCooldown > 0) missileCooldown -= dt;

    const MAX_ACTIVE_ENEMIES = 26;
    if (!boss) {
        enemyTimer -= dt;
        const spawnRate = Math.max(0.3, 1.5 - wave * 0.1);
        if (enemyTimer <= 0 && enemies.length < MAX_ACTIVE_ENEMIES) {
            if (wave >= 3 && Math.random() < 0.12) spawnDroneSwarm();
            else spawnEnemy();
            enemyTimer = spawnRate;
        } else if (enemyTimer <= 0) {
            enemyTimer = spawnRate;
        }
    } else {
        enemyTimer -= dt;
        if (enemyTimer <= 0) {
            if (Math.random() < 0.3 && enemies.length < MAX_ACTIVE_ENEMIES) spawnEnemy();
            enemyTimer = 2;
        }
    }

    if (!boss && waveTimer > 20) nextWave();

    updatePlayer(dt);
    updateEnemies(dt);
    updateBoss(dt);

    bullets.forEach(b => {
        if (b.homing && b.friendly) {
            let nearest = null, nd = 250;
            const targets = boss ? [...enemies, boss] : enemies;
            targets.forEach(t => {
                const dist = Math.hypot(t.x - b.x, t.y - b.y);
                if (dist < nd) { nd = dist; nearest = t; }
            });
            if (nearest) {
                const angle = Math.atan2(nearest.y - b.y, nearest.x - b.x);
                b.vx += Math.cos(angle) * 0.4;
                b.vy += Math.sin(angle) * 0.4;
                const spd = Math.hypot(b.vx, b.vy);
                if (spd > 10) { b.vx = (b.vx / spd) * 10; b.vy = (b.vy / spd) * 10; }
            }
        }
        b.x += b.vx * dt * 60; b.y += b.vy * dt * 60;
    });
    bullets = bullets.filter(b => b.y > -20 && b.y < H + 20 && b.x > -20 && b.x < W + 20);
    if (bullets.length > 220) bullets.splice(0, bullets.length - 220);

    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= dt; p.vx *= 0.96; p.vy *= 0.96; if (p.rotSpeed) p.rot = (p.rot || 0) + p.rotSpeed; });
    particles = particles.filter(p => p.life > 0);
    if (particles.length > 400) particles.splice(0, particles.length - 400);

    updatePowerups(dt);

    updatePlayerMissiles(dt);
    updateEnemyMissiles(dt);
    updateMines(dt);
    updateTrapZones(dt);
    updateScorePopups(dt);
    updateNotifications(dt);
    updatePowerupRings(dt);

    checkCollisions();
    updateHUD();
    updateDangerZone();

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawStars();
    drawTrapZones();

    if (comboMultiplier >= 3) {
        const intensity = Math.min(1, (comboMultiplier - 2) / 6);
        ctx.save();
        ctx.globalAlpha = intensity * 0.06;
        const edgeGrad = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
        edgeGrad.addColorStop(0, 'transparent');
        edgeGrad.addColorStop(1, comboMultiplier >= 6 ? '#ff2d95' : comboMultiplier >= 4 ? '#ffe600' : '#00f0ff');
        ctx.fillStyle = edgeGrad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    if (bulletTimeActive) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.7);
        vig.addColorStop(0, 'transparent');
        vig.addColorStop(1, '#ff2d95');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
    }

    bullets.forEach(b => {
        const isHeavy = b.kind === 'heavy';
        ctx.fillStyle = b.color;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = b.friendly ? 10 : 14;
        ctx.beginPath();
        if (!b.friendly) {
            ctx.save();
            ctx.translate(b.x, b.y);
            const ang = Math.atan2(b.vy, b.vx);
            ctx.rotate(ang);
            const len = isHeavy ? 10 : 7;
            ctx.beginPath();
            ctx.ellipse(0, 0, len / 2, b.r * (isHeavy ? 1.4 : 0.9), 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.globalAlpha = 0.5;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-len / 2, 0); ctx.lineTo(-len / 2 - 6, 0);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.restore();
        } else {
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(b.x - b.vx * 0.5, b.y - b.vy * 0.5, b.r * 0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
        }
    });
    ctx.shadowBlur = 0;

    drawEnemies();
    drawBoss();
    drawMines();
    drawMissile();

    powerups.forEach(p => drawPowerup(p));
    drawPowerupRings();

    particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        if (p.shape === 'debris') {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rot || 0));
            const s = p.size * alpha;
            ctx.fillRect(-s, -s * 0.5, s * 2, s);
            ctx.restore();
        } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
            ctx.fill();
        }
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    drawPlayer();
    drawScorePopups();
    drawNotifications();

    animFrame = requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0; wave = 1; kills = 0; health = 200; maxHealth = 200;
    shieldTimer = 0; rapidFire = 0; homingTimer = 0; magnetTimer = 0; empDebuffTimer = 0;
    combo = 0; maxCombo = 0; comboTimer = 0; comboMultiplier = 1;
    novaBombs = 2; maxBombs = 3; bombCooldown = 0;
    hitFreezeTimer = 0; bulletTimeActive = false;
    shotsFired = 0; shotsHit = 0; timeSurvived = 0; bossesDefeated = 0;
    scorePopups = []; nebulaHue = 0;
    playerUpgrades = { speed: 0, fireRate: 0, damage: 0, maxHealth: 0, pierce: 0, magnet: 0, vampiric: 0, comboDecay: 0, homing: 0, overclock: 0, bulletSpeed: 0, doubleMissile: 0, multiShot: 0, damageBoost: 0 };
    waveClearChecked = false;
    boss = null;
    pendingBossWave = false;
    player = createPlayer();
    bullets = []; enemies = []; particles = []; powerups = []; mines = []; trapZones = [];
    missiles = []; missileCooldown = 0; notifications = []; powerupRings = [];
    killsSinceLastReward = 0; rewardThreshold = pickRewardThreshold();
    enemyTimer = 1; waveTimer = 0; fireTimer = 0;
    updateBombHUD();
    bossHud.classList.add('hidden');

    gameState = 'playing';
    showScreen('game');
    pauseOverlay.classList.add('hidden');
    lastTime = performance.now();
    announceWave();
    if (!animFrame) {
        animFrame = requestAnimationFrame(gameLoop);
    }
}

function gameOver() {
    gameState = 'over';
    document.getElementById('final-score').textContent = score;
    document.getElementById('final-wave').textContent = wave;
    document.getElementById('final-kills').textContent = kills;
    // Accuracy
    const acc = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
    document.getElementById('final-accuracy').textContent = acc + '%';
    // Best combo
    document.getElementById('final-combo').textContent = '×' + maxCombo;
    // Time survived
    const mins = Math.floor(timeSurvived / 60);
    const secs = Math.floor(timeSurvived % 60);
    document.getElementById('final-time').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
    // Bosses
    document.getElementById('final-bosses').textContent = bossesDefeated;

    const isNew = score > highScore;
    if (isNew) { highScore = score; localStorage.setItem('novaHS', highScore); document.getElementById('hs-value').textContent = highScore; }
    document.getElementById('new-high').classList.toggle('hidden', !isNew);
    showScreen('over');
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        pauseOverlay.classList.remove('hidden');
    } else if (gameState === 'paused') {
        gameState = 'playing';
        pauseOverlay.classList.add('hidden');
        lastTime = performance.now();
    }
}

window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyP' && (gameState === 'playing' || gameState === 'paused')) togglePause();
    if (e.code === 'KeyX' && gameState === 'playing') deployNovaBomb();
    if (e.code === 'Space') e.preventDefault();
});

window.addEventListener('keyup', e => { keys[e.code] = false; });
document.getElementById('play-btn').addEventListener('click', startGame);
document.getElementById('how-to-btn').addEventListener('click', () => showScreen('howto'));
document.getElementById('back-btn').addEventListener('click', () => showScreen('start'));
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('quit-btn').addEventListener('click', () => {
    gameState = 'menu';
    boss = null;
    bossHud.classList.add('hidden');
    showScreen('start');
});
document.getElementById('retry-btn').addEventListener('click', startGame);
document.getElementById('menu-btn').addEventListener('click', () => showScreen('start'));

// Initialize deep space and kick off continuous background animation
initStars();
showScreen('start');
animFrame = requestAnimationFrame(gameLoop);
