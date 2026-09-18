/**
 * Nitro Typer 🏎️⌨️💨 | سباق الطباعة الخارقة
 * Dual Language (Arabic & English) Speed Typing Racing Engine
 * Standardized Game Modes (Local 4-6 Hotseat, P2P Rooms, Pro Matchmaking)
 */

(function () {
    'use strict';

    // Helper shortcuts
    const $ = id => document.getElementById(id);
    const $$ = sel => document.querySelectorAll(sel);

    // ==========================================
    // 1. TEXT DATA POOLS (ARABIC & ENGLISH)
    // ==========================================
    const TEXT_DATA = {
        ar: {
            quotes: [
                "العلم في الصغر كالنقش على الحجر، ومن طلب العلا سهر الليالي وجد واجتهد في طلب المعالي.",
                "الوقت كالسيف إن لم تقطعه قطعك، فبادر بالإنجاز في كل حين واستثمر ساعات يومك بحكمة.",
                "خير الكلام ما قل ودل، وجمال المرء يكمن في فصاحة لسانه وحسن خلقه مع سائر الناس.",
                "النجاح الحقيقي يبدأ بخطوة واثقة، والإصرار المستمر على بلوغ الهدف يصنع المستحيل دائماً.",
                "لا تؤجل عمل اليوم إلى الغد، فالفرص الثمينة لا تنتظر المترددين بل تبحث عن المبادرين.",
                "القراءة تفتح آفاق العقل، وتمنح الإنسان حيوات أخرى وتجارب عميقة مع كل كتاب يتأمله.",
                "العقل السليم في الجسم السليم، وممارسة الرياضة والنشاط اليومي تبعث الطاقة الإيجابية.",
                "الصبر مفتاح الفرج، وبالعمل الجاد والدؤوب تتحقق أعظم الطموحات والأهداف في الحياة.",
                "كن جميلاً تر الوجود جميلاً، والتفاؤل بالخير يضيء الدروب ويبدد ظلمات اليأس والقلق.",
                "الصداقة الحقيقية كنز لا يفنى، والأصدقاء المخلصون سند وعون في أوقات الشدة والرخاء."
            ],
            common: [
                "شمس وقمر ونهر وبحر وسماء وجبل وأرض طيبة تجود بالخير والبركة في كل مكان.",
                "ذهب الطالب إلى المدرسة مبكراً وهو يحمل حقيبته المليئة بالكتب والدفاتر والأقلام الملونة.",
                "العمل عبادة وشرف، والإتقان في أداء الواجبات يعود بالنفع الكبير على الفرد والمجتمع.",
                "الصدق منجاة والكذب مهواة، والأمانة خلق رفيع يتحلى به أصحاب القلوب الطيبة والنبيلة.",
                "الماء سر الحياة ونعمة عظيمة يجب الحفاظ عليها وترشيد استهلاكها للأجيال القادمة."
            ],
            tech: [
                "تطوير البرمجيات والذكاء الاصطناعي وهندسة الحوسبة السحابية تمثل المحرك الأساسي للثورة الرقمية المعاصرة.",
                "الخوارزميات الفعالة وهياكل البيانات المنظمة تساهم في حل المشكلات التقنية المعقدة بأقل استهلاك للموارد.",
                "الأمن السيبراني وحماية البيانات الشخصية وتشفير الشبكات ضرورة ملحة في عصر الاتصالات والمعلومات.",
                "تصميم واجهات المستخدم الحديثة يعتمد على السلاسة والسرعة وسهولة التصفح لتقديم أفضل تجربة للمستخدم.",
                "قواعد البيانات السريعة والتطبيقات اللامركزية تفتح آفاقاً رحبة للابتكار وتطوير المنتجات الرقمية."
            ],
            sprint: [
                "سرعة الكتابة مهارة تكتسب بالممارسة اليومية والتركيز الذهني وحفظ مواقع الحروف على لوحة المفاتيح."
            ]
        },
        en: {
            quotes: [
                "The quick brown fox jumps over the lazy dog near the riverbank on a sunny afternoon.",
                "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                "Technology is best when it brings people together and empowers human creativity to solve real problems.",
                "In the middle of every difficulty lies opportunity waiting to be discovered by determined minds.",
                "Continuous learning and focused practice are the true secret keys to mastery and excellence in life.",
                "Keep your face always toward the sunshine, and the shadows will fall behind you naturally.",
                "The future belongs to those who believe in the beauty of their dreams and work hard every day.",
                "Clean code always reads like well-written prose, crafted with care by thoughtful engineers.",
                "Do not wait for extraordinary circumstances to do good action; try to use ordinary situations.",
                "Perseverance is not a long race; it is many short races one after the other with steady hope."
            ],
            common: [
                "The sun rises in the east and sets in the west providing warm light and positive energy.",
                "Every morning is a brand new chance to improve your skills and learn something inspiring.",
                "Reading books and exploring new ideas expands your mind and enriches your perspective on life.",
                "Teamwork makes the dream work when passionate individuals unite to achieve a common purpose.",
                "Water is the essence of life and keeping the environment clean is our shared global duty."
            ],
            tech: [
                "Software engineering and artificial intelligence are transforming modern computing and digital communication.",
                "Efficient algorithms and scalable architecture ensure reliable performance across distributed cloud systems.",
                "Cybersecurity and encrypted network protocols safeguard critical infrastructure and private user records.",
                "Modern frontend applications require responsive design, accessible components, and rapid interactive speeds.",
                "Cloud native microservices allow development teams to deploy resilient features with confidence."
            ],
            sprint: [
                "Typing speed increases with muscle memory, consistent rhythm, and steady visual focus on upcoming words."
            ]
        }
    };

    // ==========================================
    // 2. WEB AUDIO API SYNTHESIZER
    // ==========================================
    let audioCtx = null;
    let isSoundMuted = false;

    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playSound(type) {
        if (isSoundMuted) return;
        try {
            const ctx = getAudioContext();
            const now = ctx.currentTime;

            if (type === 'click') {
                // Mechanical switch click
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
                osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.04);
            } else if (type === 'error') {
                // Typo thud
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.linearRampToValueAtTime(90, now + 0.12);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.12);
            } else if (type === 'turbo') {
                // Turbo whoosh
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(350, now);
                osc.frequency.exponentialRampToValueAtTime(1100, now + 0.22);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.25);
            } else if (type === 'finish') {
                // Victory chords
                const notes = [523.25, 659.25, 783.99, 1046.50];
                notes.forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0.2, now + idx * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.1 + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + idx * 0.1);
                    osc.stop(now + idx * 0.1 + 0.35);
                });
            }
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    // ==========================================
    // 3. GAME STATE MANAGEMENT
    // ==========================================
    const State = {
        lang: 'ar',            // 'ar' | 'en'
        category: 'quotes',    // 'quotes' | 'common' | 'tech' | 'sprint'
        mode: 'solo',          // 'solo' | 'local' | 'room' | 'pro'
        targetText: '',
        charIndex: 0,
        correctChars: 0,
        totalErrors: 0,
        currentStreak: 0,
        startTime: null,
        timerInterval: null,
        isFinished: false,
        isActive: false,

        // Local Tournament State (4 to 6 players)
        local: {
            playerCount: 4,
            players: [],
            currentTurnIndex: 0,
            results: []
        },

        // P2P State
        p2p: {
            peer: null,
            conn: null,
            roomCode: '',
            isHost: false
        },

        // AI Rival
        ai: {
            interval: null,
            progress: 0,
            wpm: 45
        }
    };

    // ==========================================
    // 4. LOCALSTORAGE DATABASE PERSISTENCE
    // ==========================================
    const Storage = {
        KEY_STATS: 'nitro_typer_stats_v1',

        loadStats() {
            try {
                const raw = localStorage.getItem(this.KEY_STATS);
                if (raw) return JSON.parse(raw);
            } catch (e) {}
            return {
                bestWpmAr: 0,
                bestWpmEn: 0,
                avgAccuracy: 100,
                totalRaces: 0,
                totalChars: 0,
                totalErrors: 0
            };
        },

        saveRaceResult(wpm, accuracy, chars, errors, lang) {
            const stats = this.loadStats();
            stats.totalRaces += 1;
            stats.totalChars += chars;
            stats.totalErrors += errors;

            if (lang === 'ar') {
                if (wpm > stats.bestWpmAr) stats.bestWpmAr = wpm;
            } else {
                if (wpm > stats.bestWpmEn) stats.bestWpmEn = wpm;
            }

            // Overall accuracy
            const overallChars = stats.totalChars;
            const overallErrors = stats.totalErrors;
            stats.avgAccuracy = overallChars > 0 ? Math.round((overallChars / (overallChars + overallErrors)) * 100) : 100;

            try {
                localStorage.setItem(this.KEY_STATS, JSON.stringify(stats));
            } catch (e) {}

            this.updateStatsDisplay(stats);
            this.syncScoreWithPlatform(wpm, accuracy, lang);
        },

        updateStatsDisplay(stats) {
            if (!stats) stats = this.loadStats();
            if ($('stat-best-ar')) $('stat-best-ar').innerHTML = `${stats.bestWpmAr} <small style="font-size:0.8rem; font-weight:normal;">WPM</small>`;
            if ($('stat-best-en')) $('stat-best-en').innerHTML = `${stats.bestWpmEn} <small style="font-size:0.8rem; font-weight:normal;">WPM</small>`;
            if ($('stat-avg-acc')) $('stat-avg-acc').textContent = `${stats.avgAccuracy}%`;
            if ($('stat-total-races')) $('stat-total-races').textContent = stats.totalRaces;
        },

        syncScoreWithPlatform(wpm, accuracy, lang) {
            // Send to Angular Parent Arena
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    type: 'SUPER_ARCADE_SCORE_SUBMIT',
                    gameId: 'speed-typer',
                    score: wpm,
                    customData: {
                        wpm: wpm,
                        accuracy: accuracy,
                        lang: lang
                    }
                }, '*');

                window.parent.postMessage({
                    type: 'ARCADE_GAME_OVER',
                    winner: `Speed: ${wpm} WPM`,
                    gameId: 'speed-typer'
                }, '*');
            }
        }
    };

    // ==========================================
    // 5. TOAST & SCREEN NAVIGATION
    // ==========================================
    function showToast(msg) {
        const toast = $('toast-notice');
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function showScreen(screenId) {
        $$('.screen').forEach(s => s.classList.remove('active'));
        const target = $(screenId);
        if (target) target.classList.add('active');
    }

    function openModal(modalId) {
        const m = $(modalId);
        if (m) m.classList.add('active');
    }

    function closeModal(modalId) {
        const m = $(modalId);
        if (m) m.classList.remove('active');
    }

    // ==========================================
    // 6. LANGUAGE SWITCHER
    // ==========================================
    function setLanguage(lang) {
        State.lang = lang;
        if (lang === 'en') {
            document.documentElement.lang = 'en';
            document.documentElement.dir = 'ltr';
            document.body.classList.add('lang-en');
            $('btn-lang-en').classList.add('active');
            $('btn-lang-ar').classList.remove('active');
            $('brand-title').textContent = 'Nitro Typer 🏎️';
            $('brand-subtitle').textContent = 'Speed Typing Super-Championship';
            $('menu-headline').textContent = 'Boost Your Typing Speed & Race The Best! ⚡';
            $('menu-subheadline').textContent = 'Race neon cars on high-speed cyber tracks in English or Arabic, and master your WPM with precision!';
            $('typing-prompt-hint').textContent = '💡 Start typing the text above to accelerate your car! (Click here to focus)';
        } else {
            document.documentElement.lang = 'ar';
            document.documentElement.dir = 'rtl';
            document.body.classList.remove('lang-en');
            $('btn-lang-ar').classList.add('active');
            $('btn-lang-en').classList.remove('active');
            $('brand-title').textContent = 'Nitro Typer ⌨️';
            $('brand-subtitle').textContent = 'سباق الطباعة الخارقة';
            $('menu-headline').textContent = 'زوّد سرعة كتابتك وتحدّى أسرع الطابعين! ⚡';
            $('menu-subheadline').textContent = 'سواء بالعربية أو بالإنجليزية، نافس سيارات النيون على المضمار السريع، وحسّن معدل كتابتك (WPM) بدقة عالية!';
            $('typing-prompt-hint').textContent = '💡 ابدأ في كتابة النص أعلاه مباشرة على لوحة المفاتيح لدفع سيارتك للأمام! (اضغط في أي مكان هنا للتركيز)';
        }
    }

    // ==========================================
    // 7. TYPING ENGINE & TEXT RENDERING
    // ==========================================
    function pickRandomText() {
        const pool = TEXT_DATA[State.lang][State.category] || TEXT_DATA[State.lang].quotes;
        const rand = pool[Math.floor(Math.random() * pool.length)];
        return rand.trim();
    }

    function renderTextDisplay(text) {
        const display = $('words-display');
        display.innerHTML = '';

        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.className = 'char' + (i === 0 ? ' current' : '');
            span.textContent = text[i];
            span.dataset.idx = i;
            display.appendChild(span);
        }

        // Insert initial caret
        insertCaret(0);
    }

    function insertCaret(targetIndex) {
        const oldCaret = document.querySelector('.caret');
        if (oldCaret) oldCaret.remove();

        const chars = $$('.char');
        if (targetIndex < chars.length) {
            const caret = document.createElement('span');
            caret.className = 'caret';
            chars[targetIndex].parentNode.insertBefore(caret, chars[targetIndex]);
        }
    }

    function resetLiveMetrics() {
        $('hud-wpm').textContent = '0';
        $('hud-cpm').textContent = '0';
        $('hud-accuracy').textContent = '100%';
        $('hud-errors').textContent = '0';
        $('hud-time').textContent = '00:00';
        $('race-progress-text').textContent = 'التقدم: 0%';
    }

    // ==========================================
    // 8. RACE INITIALIZATION & GAME LOOP
    // ==========================================
    function startRace(mode, presetText) {
        State.mode = mode || 'solo';
        State.targetText = presetText || pickRandomText();
        State.charIndex = 0;
        State.correctChars = 0;
        State.totalErrors = 0;
        State.currentStreak = 0;
        State.startTime = null;
        State.isFinished = false;
        State.isActive = true;

        clearInterval(State.timerInterval);
        clearInterval(State.ai.interval);

        // Reset car positions
        updateCarPosition('car-p1', 0);
        updateCarPosition('car-p2', 0);

        // Setup HUD names
        if (State.mode === 'local') {
            const currPlayer = State.local.players[State.local.currentTurnIndex];
            $('track-mode-badge').textContent = `جولة ${currPlayer.name} (${State.local.currentTurnIndex + 1}/${State.local.playerCount})`;
            $('lane-p1-name').textContent = currPlayer.name;
            $('lane-p2').style.display = 'none'; // hide robot in local hotseat
        } else if (State.mode === 'room') {
            $('track-mode-badge').textContent = 'غرفة P2P مباشرة 🌐';
            $('lane-p1-name').textContent = 'أنت 🏎️';
            $('lane-p2-name').textContent = 'المنافس 🚗';
            $('lane-p2').style.display = 'flex';
        } else {
            $('track-mode-badge').textContent = 'تدريب فردي ضد الروبوت 🤖';
            $('lane-p1-name').textContent = 'أنت';
            $('lane-p2-name').textContent = 'الروبوت النيون';
            $('lane-p2').style.display = 'flex';
            startAiRival();
        }

        renderTextDisplay(State.targetText);
        resetLiveMetrics();
        showScreen('game-screen');

        const input = $('hidden-type-input');
        input.value = '';
        input.focus();

        // Notify parent
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: 'ARCADE_GAME_START', gameId: 'speed-typer' }, '*');
        }
    }

    function startAiRival() {
        State.ai.progress = 0;
        // AI targets ~48 WPM with slight randomness
        const totalChars = State.targetText.length;
        const charPerSec = (48 * 5) / 60; // ~4 chars per second

        State.ai.interval = setInterval(() => {
            if (!State.isActive || State.isFinished) return;
            if (State.startTime) {
                State.ai.progress += (charPerSec * 0.25) / totalChars;
                const pct = Math.min(100, Math.round(State.ai.progress * 100));
                updateCarPosition('car-p2', pct);
                $('lane-p2-wpm').textContent = `${Math.round(45 + Math.sin(Date.now() / 1000) * 4)} WPM`;
                if (pct >= 100) {
                    clearInterval(State.ai.interval);
                }
            }
        }, 250);
    }

    function updateCarPosition(carId, pct) {
        const car = $(carId);
        if (!car) return;
        const isRtl = document.documentElement.dir === 'rtl';
        const positionProperty = isRtl ? 'right' : 'left';
        // scale to 85% of track strip so car finishes right before finish line
        const trackPct = pct * 0.88;
        car.style[positionProperty] = `${trackPct}%`;
    }

    // ==========================================
    // 9. REAL-TIME INPUT LISTENER & SCORING
    // ==========================================
    function handleTypingInput(e) {
        if (!State.isActive || State.isFinished) return;

        const input = $('hidden-type-input');
        const typedVal = input.value;
        if (!typedVal) return;

        // First keystroke starts the timer
        if (!State.startTime) {
            State.startTime = Date.now();
            startTimerLoop();
        }

        const chars = $$('.char');
        const expectedChar = State.targetText[State.charIndex];
        const typedChar = typedVal[typedVal.length - 1];

        if (typedChar === expectedChar) {
            // CORRECT CHARACTER
            playSound('click');
            chars[State.charIndex].classList.remove('current', 'incorrect');
            chars[State.charIndex].classList.add('correct');
            State.correctChars++;
            State.charIndex++;
            State.currentStreak++;

            // Turbo trigger
            if (State.currentStreak >= 15 && State.currentStreak % 15 === 0) {
                playSound('turbo');
                const car = $('car-p1');
                car.classList.add('turbo');
                setTimeout(() => car.classList.remove('turbo'), 1000);
            }
        } else {
            // INCORRECT CHARACTER
            playSound('error');
            chars[State.charIndex].classList.remove('current');
            chars[State.charIndex].classList.add('incorrect');
            State.totalErrors++;
            State.currentStreak = 0;
        }

        // Reset hidden input so user never hits max length
        input.value = '';

        // Check if finished
        if (State.charIndex >= State.targetText.length) {
            finishRace();
            return;
        }

        // Update active char highlight & Caret
        chars.forEach((c, idx) => {
            if (idx === State.charIndex) {
                c.classList.add('current');
            } else if (idx > State.charIndex) {
                c.classList.remove('current', 'correct', 'incorrect');
            }
        });
        insertCaret(State.charIndex);

        // Update progress & car
        const progressPct = Math.round((State.charIndex / State.targetText.length) * 100);
        updateCarPosition('car-p1', progressPct);
        $('race-progress-text').textContent = `التقدم: ${progressPct}%`;

        // Broadcast progress in P2P room
        if (State.mode === 'room' && State.p2p.conn) {
            try {
                State.p2p.conn.send({
                    type: 'RACE_PROGRESS',
                    progress: progressPct,
                    wpm: calculateLiveWpm()
                });
            } catch (err) {}
        }
    }

    function calculateLiveWpm() {
        if (!State.startTime) return 0;
        const elapsedSec = (Date.now() - State.startTime) / 1000;
        if (elapsedSec < 1) return 0;
        return Math.max(0, Math.round(((State.correctChars / 5) / (elapsedSec / 60))));
    }

    function startTimerLoop() {
        State.timerInterval = setInterval(() => {
            if (!State.isActive || State.isFinished) return;
            const elapsedSec = Math.floor((Date.now() - State.startTime) / 1000);
            const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
            const s = String(elapsedSec % 60).padStart(2, '0');
            $('hud-time').textContent = `${m}:${s}`;

            const wpm = calculateLiveWpm();
            const cpm = Math.max(0, Math.round(State.correctChars / (elapsedSec / 60)));
            const totalTyped = State.correctChars + State.totalErrors;
            const acc = totalTyped === 0 ? 100 : Math.max(0, Math.round((State.correctChars / totalTyped) * 100));

            $('hud-wpm').textContent = wpm;
            $('hud-cpm').textContent = cpm;
            $('hud-accuracy').textContent = `${acc}%`;
            $('hud-errors').textContent = State.totalErrors;
            $('lane-p1-wpm').textContent = `${wpm} WPM`;
        }, 300);
    }

    // ==========================================
    // 10. FINISH RACE & RESULTS
    // ==========================================
    function finishRace() {
        State.isFinished = true;
        State.isActive = false;
        clearInterval(State.timerInterval);
        clearInterval(State.ai.interval);
        playSound('finish');

        const elapsedSec = Math.max(1, (Date.now() - State.startTime) / 1000);
        const finalWpm = Math.max(1, Math.round(((State.correctChars / 5) / (elapsedSec / 60))));
        const finalCpm = Math.max(1, Math.round(State.correctChars / (elapsedSec / 60)));
        const totalTyped = State.correctChars + State.totalErrors;
        const finalAcc = totalTyped === 0 ? 100 : Math.max(0, Math.round((State.correctChars / totalTyped) * 100));
        const m = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const s = String(Math.floor(elapsedSec % 60)).padStart(2, '0');
        const finalTimeStr = `${m}:${s}`;

        // Save into DB
        Storage.saveRaceResult(finalWpm, finalAcc, State.correctChars, State.totalErrors, State.lang);

        // Handle Local Tournament Progression (4 to 6 players)
        if (State.mode === 'local') {
            const currentP = State.local.players[State.local.currentTurnIndex];
            State.local.results.push({
                name: currentP.name,
                emoji: currentP.emoji,
                wpm: finalWpm,
                accuracy: finalAcc,
                time: finalTimeStr
            });

            // If more players remain, offer next turn
            if (State.local.currentTurnIndex + 1 < State.local.playerCount) {
                State.local.currentTurnIndex++;
                const nextP = State.local.players[State.local.currentTurnIndex];
                showToast(`اكتملت جولة ${currentP.name}! دور اللاعب التالي: ${nextP.name} 🚀`);
                setTimeout(() => {
                    startRace('local', State.targetText); // exact same text for fairness!
                }, 1500);
                return;
            } else {
                // All players finished! Show Grand Tournament Podium
                showLocalTournamentResults();
                return;
            }
        }

        // Display Solo Results
        $('res-final-wpm').textContent = `${finalWpm} WPM`;
        $('res-final-acc').textContent = `${finalAcc}%`;
        $('res-final-cpm').textContent = `${finalCpm} CPM`;
        $('res-final-time').textContent = finalTimeStr;
        $('results-title').textContent = finalWpm > 60 ? 'صاروخ نيون أسطوري! 🚀' : 'سباق رائع أحسنت! 🏁';
        $('results-subtitle').textContent = `حققت سرعة ${finalWpm} كلمة بالدقيقة بدقة ${finalAcc}%`;

        // Podium for solo mode
        $('podium-p1-name').textContent = 'أنت 👑';
        $('podium-p1-wpm').textContent = `${finalWpm} WPM`;
        $('podium-p2-name').textContent = 'الروبوت 🚗';
        $('podium-p2-wpm').textContent = '45 WPM';
        $('podium-p3-name').textContent = 'المتوسط 🏁';
        $('podium-p3-wpm').textContent = '35 WPM';

        showScreen('results-screen');
    }

    function showLocalTournamentResults() {
        // Sort players by WPM descending
        const sorted = [...State.local.results].sort((a, b) => b.wpm - a.wpm);
        const winner = sorted[0];

        $('results-title').textContent = `🏆 بطل السباق: ${winner.name}!`;
        $('results-subtitle').textContent = `حسم اللقب بسرعة ${winner.wpm} WPM ودقة ${winner.accuracy}%!`;

        $('res-final-wpm').textContent = `${winner.wpm} WPM`;
        $('res-final-acc').textContent = `${winner.accuracy}%`;
        $('res-final-cpm').textContent = `${Math.round(winner.wpm * 5)} CPM`;
        $('res-final-time').textContent = winner.time;

        // Fill Podium
        $('podium-p1-name').textContent = `${winner.emoji} ${winner.name}`;
        $('podium-p1-wpm').textContent = `${winner.wpm} WPM`;

        if (sorted[1]) {
            $('podium-p2-name').textContent = `${sorted[1].emoji} ${sorted[1].name}`;
            $('podium-p2-wpm').textContent = `${sorted[1].wpm} WPM`;
        }
        if (sorted[2]) {
            $('podium-p3-name').textContent = `${sorted[2].emoji} ${sorted[2].name}`;
            $('podium-p3-wpm').textContent = `${sorted[2].wpm} WPM`;
        }

        showScreen('results-screen');
    }

    // ==========================================
    // 11. LOCAL PLAY SETUP (4 to 6 PLAYERS)
    // ==========================================
    const CAR_EMOJIS = ['🏎️', '🚗', '🚙', '🏎️', '⚡', '🚀'];
    function renderLocalPlayerInputs(count) {
        const container = $('local-player-inputs-container');
        container.innerHTML = '';
        for (let i = 1; i <= count; i++) {
            const row = document.createElement('div');
            row.className = 'player-row';
            row.innerHTML = `
                <span class="player-avatar">${CAR_EMOJIS[i - 1] || '🏎️'}</span>
                <input type="text" class="player-name-input" id="input-p${i}" value="المتسابق ${i}" maxlength="15">
            `;
            container.appendChild(row);
        }
    }

    function initLocalTournament() {
        const count = parseInt($('select-local-count').value, 10);
        State.local.playerCount = count;
        State.local.currentTurnIndex = 0;
        State.local.results = [];
        State.local.players = [];

        for (let i = 1; i <= count; i++) {
            const val = $(`input-p${i}`)?.value?.trim() || `المتسابق ${i}`;
            State.local.players.push({
                id: i,
                name: val,
                emoji: CAR_EMOJIS[i - 1] || '🏎️'
            });
        }

        closeModal('modal-local');
        startRace('local');
    }

    // ==========================================
    // 12. P2P ROOMS ENGINE (PEERJS)
    // ==========================================
    function initP2PHost() {
        const roomCode = 'TYPE' + Math.floor(1000 + Math.random() * 9000);
        State.p2p.roomCode = roomCode;
        State.p2p.isHost = true;

        $('display-room-code').textContent = roomCode;
        $('host-room-info').style.display = 'block';
        $('host-p2p-status').textContent = 'في انتظار انضمام المتسابق المنافس... ⏳';

        try {
            if (typeof Peer !== 'undefined') {
                State.p2p.peer = new Peer('super_typer_' + roomCode);
                State.p2p.peer.on('connection', conn => {
                    State.p2p.conn = conn;
                    setupPeerConnection();
                    $('host-p2p-status').textContent = 'متصل! يبدأ السباق الآن... 🚀';
                    setTimeout(() => {
                        closeModal('modal-room');
                        startRace('room');
                    }, 1000);
                });
            } else {
                $('host-p2p-status').textContent = 'كود الغرفة جاهز للمشاركة 🔑';
            }
        } catch (err) {
            console.warn('Peer host init note:', err);
        }
    }

    function joinP2PRoom() {
        const code = $('input-room-code').value.trim().toUpperCase();
        if (!code) {
            showToast('الرجاء إدخال كود الغرفة');
            return;
        }

        State.p2p.roomCode = code;
        State.p2p.isHost = false;

        try {
            if (typeof Peer !== 'undefined') {
                State.p2p.peer = new Peer();
                State.p2p.peer.on('open', () => {
                    const conn = State.p2p.peer.connect('super_typer_' + code);
                    State.p2p.conn = conn;
                    setupPeerConnection();
                    showToast('تم الاتصال بالغرفة بنجاح! 🏁');
                    closeModal('modal-room');
                    startRace('room');
                });
            } else {
                closeModal('modal-room');
                startRace('room');
            }
        } catch (err) {
            closeModal('modal-room');
            startRace('room');
        }
    }

    function setupPeerConnection() {
        if (!State.p2p.conn) return;
        State.p2p.conn.on('data', data => {
            if (data && data.type === 'RACE_PROGRESS') {
                updateCarPosition('car-p2', data.progress);
                $('lane-p2-wpm').textContent = `${data.wpm} WPM`;
            }
        });
    }

    // ==========================================
    // 13. DOM EVENTS BINDING
    // ==========================================
    function setupEventListeners() {
        // Typing input events
        const input = $('hidden-type-input');
        input.addEventListener('input', handleTypingInput);
        $('typing-container').addEventListener('click', () => input.focus());

        // Language Buttons
        $('btn-lang-ar').onclick = () => setLanguage('ar');
        $('btn-lang-en').onclick = () => setLanguage('en');

        // Sound Toggle
        $('btn-sound-toggle').onclick = () => {
            isSoundMuted = !isSoundMuted;
            $('btn-sound-toggle').textContent = isSoundMuted ? '🔇' : '🔊';
            showToast(isSoundMuted ? 'تم كتم الصوت' : 'تم تشغيل الصوت');
        };

        // Help Button
        $('btn-help-toggle').onclick = () => {
            showToast('اكتب الحروف بدقة وبأعلى سرعة ممكنة لتنطلق سيارتك أولاً وتصل لخط النهاية!');
        };

        // Category Tags
        const cats = [
            { id: 'cat-quotes', key: 'quotes' },
            { id: 'cat-common', key: 'common' },
            { id: 'cat-tech', key: 'tech' },
            { id: 'cat-sprint', key: 'sprint' }
        ];
        cats.forEach(c => {
            const btn = $(c.id);
            if (btn) {
                btn.onclick = () => {
                    cats.forEach(x => {
                        const b = $(x.id);
                        if (b) {
                            b.style.background = 'rgba(255, 255, 255, 0.05)';
                            b.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            b.style.color = '#94a3b8';
                        }
                    });
                    btn.style.background = 'rgba(6, 182, 212, 0.2)';
                    btn.style.borderColor = '#06b6d4';
                    btn.style.color = '#fff';
                    State.category = c.key;
                    showToast(`تم اختيار نمط: ${btn.textContent}`);
                };
            }
        });

        // 3 Standardized Play Modes
        // Mode 1: Local Play (4 to 6 players)
        $('btn-mode-local').onclick = () => {
            renderLocalPlayerInputs(parseInt($('select-local-count').value, 10));
            openModal('modal-local');
        };
        $('select-local-count').onchange = e => {
            renderLocalPlayerInputs(parseInt(e.target.value, 10));
        };
        $('btn-start-local-tournament').onclick = initLocalTournament;
        $('btn-close-local-modal').onclick = () => closeModal('modal-local');

        // Mode 2: Private Room (P2P)
        $('btn-mode-room').onclick = () => openModal('modal-room');
        $('btn-create-p2p-room').onclick = initP2PHost;
        $('btn-join-p2p-room').onclick = joinP2PRoom;
        $('btn-copy-p2p-code').onclick = () => {
            const code = $('display-room-code').textContent;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(code);
            }
            showToast('تم نسخ كود الغرفة بنجاح! 📋');
        };
        $('btn-close-room-modal').onclick = () => closeModal('modal-room');

        // Mode 3: Online Matchmaking (PRO MODE)
        $('btn-mode-pro').onclick = () => openModal('modal-pro');
        $('btn-close-pro-modal').onclick = () => closeModal('modal-pro');
        $('btn-pro-upgrade-action').onclick = () => {
            showToast('جاري التحويل لصفحة ترقية الاشتراك Pro... 👑');
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ type: 'NAVIGATE_TO_SUBSCRIPTIONS' }, '*');
            }
        };

        // Quick Solo Practice Button
        $('btn-quick-solo').onclick = () => startRace('solo');

        // Gameplay Buttons
        $('btn-restart-race').onclick = () => startRace(State.mode, State.targetText);
        $('btn-back-to-menu').onclick = () => {
            State.isActive = false;
            clearInterval(State.timerInterval);
            clearInterval(State.ai.interval);
            showScreen('menu-screen');
        };

        // Results Screen Buttons
        $('btn-race-again').onclick = () => startRace(State.mode);
        $('btn-res-menu').onclick = () => showScreen('menu-screen');

        // Forwarded message handler from Angular parent
        window.addEventListener('message', ev => {
            const data = ev.data;
            if (!data) return;
            if (data.type === 'P2P_DATA' && data.payload) {
                if (data.payload.progress !== undefined) {
                    updateCarPosition('car-p2', data.payload.progress);
                    $('lane-p2-wpm').textContent = `${data.payload.wpm} WPM`;
                }
            }
        });
    }

    // ==========================================
    // 14. APPLICATION ENTRY POINT
    // ==========================================
    window.addEventListener('DOMContentLoaded', () => {
        Storage.updateStatsDisplay();
        renderLocalPlayerInputs(6);
        setupEventListeners();
    });

})();
