const heroesData = {
    warrior: { name: 'محارب الحديد', hp: 140, maxHp: 140, mp: 30, maxMp: 30, attack: 25, skillDmg: 50, icon: '🛡️' },
    mage: { name: 'ساحر العناصر', hp: 90, maxHp: 90, mp: 80, maxMp: 80, attack: 15, skillDmg: 75, icon: '🔮' },
    rogue: { name: 'سارق الظلال', hp: 110, maxHp: 110, mp: 40, maxMp: 40, attack: 30, skillDmg: 60, icon: '🗡️' }
};

const monstersData = [
    { level: 1, name: 'عفريت الكهف الغاضب', hp: 80, maxHp: 80, attack: 15, icon: '👺', gold: 20 },
    { level: 2, name: 'ذئب الظلال المتوحش', hp: 120, maxHp: 120, attack: 22, icon: '🐺', gold: 35 },
    { level: 3, name: 'هيكل عظمي محارب', hp: 160, maxHp: 160, attack: 30, icon: '💀', gold: 50 },
    { level: 4, name: 'ساحر الظلام الشرير', hp: 200, maxHp: 200, attack: 40, icon: '🧙‍♂️', gold: 80 },
    { level: 5, name: 'تنين الكهف الأسطوري الكبير', hp: 350, maxHp: 350, attack: 55, icon: '🐉', gold: 200 }
];

let currentHero = null;
let currentLevel = 1;
let currentMonster = null;
let gold = 0;

const menuScreen = document.getElementById('menu-screen');
const battleScreen = document.getElementById('battle-screen');
const modalScreen = document.getElementById('modal-screen');

document.querySelectorAll('.hero-card').forEach(card => {
    card.addEventListener('click', () => {
        const type = card.dataset.hero;
        currentHero = JSON.parse(JSON.stringify(heroesData[type]));
        currentLevel = 1;
        gold = 0;
        menuScreen.classList.add('hidden');
        battleScreen.classList.remove('hidden');
        initBattle();
    });
});

function initBattle() {
    currentMonster = JSON.parse(JSON.stringify(monstersData[currentLevel - 1]));
    document.getElementById('level-display').textContent = currentLevel;
    document.getElementById('hero-name-display').textContent = currentHero.name;
    updateStats();
    logMessage(`⚔️ دخلت الزنزانة ${currentLevel} وظهر أمامك ${currentMonster.name} (${currentMonster.icon})!`);
}

function updateStats() {
    document.getElementById('hero-hp-display').textContent = Math.max(0, currentHero.hp);
    document.getElementById('hero-maxhp-display').textContent = currentHero.maxHp;
    document.getElementById('hero-mp-display').textContent = Math.max(0, currentHero.mp);
    document.getElementById('hero-maxmp-display').textContent = currentHero.maxMp;
    document.getElementById('gold-display').textContent = gold;

    document.getElementById('monster-name').textContent = currentMonster.name;
    document.getElementById('monster-avatar').textContent = currentMonster.icon;
    document.getElementById('monster-hp-display').textContent = Math.max(0, currentMonster.hp);
    document.getElementById('monster-monster-maxhp').textContent = currentMonster.maxHp;
    
    const pct = Math.max(0, (currentMonster.hp / currentMonster.maxHp) * 100);
    document.getElementById('monster-hp-bar').style.width = pct + '%';
}

function logMessage(msg) {
    const log = document.getElementById('battle-log');
    const p = document.createElement('p');
    p.textContent = msg;
    log.prepend(p);
}

document.getElementById('attack-btn').addEventListener('click', () => {
    if (currentHero.hp <= 0 || currentMonster.hp <= 0) return;
    
    const dmg = currentHero.attack + Math.floor(Math.random() * 10);
    currentMonster.hp -= dmg;
    logMessage(`⚔️ هاجمت بـ ${currentHero.name} وألحقت ${dmg} ضرر بـ ${currentMonster.name}!`);
    
    checkBattleState();
    if (currentMonster.hp > 0) {
        setTimeout(monsterTurn, 600);
    }
    updateStats();
});

document.getElementById('skill-btn').addEventListener('click', () => {
    if (currentHero.hp <= 0 || currentMonster.hp <= 0) return;
    if (currentHero.mp < 20) {
        logMessage(`⚠️ طاقة المانا (MP) غير كافية!`);
        return;
    }
    currentHero.mp -= 20;
    const dmg = currentHero.skillDmg + Math.floor(Math.random() * 15);
    currentMonster.hp -= dmg;
    logMessage(`✨ أطلقت تعويذة مدمرة ألحقت ${dmg} ضرر سحري بـ ${currentMonster.name}!`);

    checkBattleState();
    if (currentMonster.hp > 0) {
        setTimeout(monsterTurn, 600);
    }
    updateStats();
});

document.getElementById('potion-btn').addEventListener('click', () => {
    if (currentHero.hp <= 0 || currentMonster.hp <= 0) return;
    const heal = 50;
    currentHero.hp = Math.min(currentHero.maxHp, currentHero.hp + heal);
    logMessage(`🧪 شربت جرعة علاج واستعدت ${heal} نقاط صحة (HP)!`);
    setTimeout(monsterTurn, 600);
    updateStats();
});

document.getElementById('flee-btn').addEventListener('click', () => {
    logMessage(`🏃 فررت من المعركة بسلام ولكن خسرت تقدمك!`);
    setTimeout(() => {
        battleScreen.classList.add('hidden');
        menuScreen.classList.remove('hidden');
    }, 1000);
});

function monsterTurn() {
    if (currentMonster.hp <= 0) return;
    const dmg = currentMonster.attack + Math.floor(Math.random() * 8);
    currentHero.hp -= dmg;
    logMessage(`💥 هجم ${currentMonster.name} عليك وألحق ${dmg} ضرر!`);
    updateStats();

    if (currentHero.hp <= 0) {
        showModal('❌ انتهت المغامرة', `هزمك ${currentMonster.name} في الزنزانة ${currentLevel}. حظاً أوفر في المرة القادمة!`, () => {
            modalScreen.classList.add('hidden');
            battleScreen.classList.add('hidden');
            menuScreen.classList.remove('hidden');
        });
    }
}

function checkBattleState() {
    if (currentMonster.hp <= 0) {
        gold += currentMonster.gold;
        if (currentLevel < 5) {
            showModal('🎉 انتصار عظيم!', `هزمت ${currentMonster.name}! حصلت على ${currentMonster.gold} قطعة ذهبية. استعد للزنزانة التالية!`, () => {
                modalScreen.classList.add('hidden');
                currentLevel++;
                initBattle();
            });
        } else {
            showModal('🏆 مبروك الفوز العظيم!', `هزمت تنين الكهف الأسطوري وأكملت كافة الزنازين بنجاح! جمعت ${gold} قطعة ذهبية!`, () => {
                modalScreen.classList.add('hidden');
                battleScreen.classList.add('hidden');
                menuScreen.classList.remove('hidden');
            });
        }
    }
}

function showModal(title, desc, callback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-desc').textContent = desc;
    const btn = document.getElementById('modal-btn');
    btn.onclick = callback;
    modalScreen.classList.remove('hidden');
}
