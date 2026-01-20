import { database, sessionRef, SESSION_ID } from './firebase-config.js';

// Spell base cooldowns (seconds)
const SPELL_COOLDOWNS = {
    SummonerFlash: 300,
    SummonerTeleport: 360,
    SummonerDot: 180,         // Ignite
    SummonerExhaust: 210,
    SummonerHaste: 240,       // Ghost
    SummonerHeal: 240,
    SummonerBarrier: 180,
    SummonerBoost: 210,       // Cleanse
    SummonerSmite: 15
};

// App state
let audioContext = null;
let wakeLock = null;
let isAudioUnlocked = false;
let spellStates = {};
let timers = {};
let longPressTimers = {};
let hasteModifiers = {
    top: { ionian: false, cosmic: false },
    jg: { ionian: false, cosmic: false },
    mid: { ionian: false, cosmic: false },
    ad: { ionian: false, cosmic: false },
    sup: { ionian: false, cosmic: false }
};

// DOM Elements
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const appContainer = document.getElementById('app-container');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const applySettingsBtn = document.getElementById('apply-settings-btn');
const resetAllBtn = document.getElementById('reset-all-btn');
const spellRoleSelect = document.getElementById('spell-role-select');
const spellOptions = document.querySelectorAll('.spell-option');
const ionianBootsCheckbox = document.getElementById('ionian-boots');
const cosmicInsightCheckbox = document.getElementById('cosmic-insight');
const warningSound = document.getElementById('warning-sound');
const readySound = document.getElementById('ready-sound');
const ionianDot = document.getElementById('ionian-dot');
const cosmicDot = document.getElementById('cosmic-dot');

// Initialize app
function init() {
    // Initialize default state
    initializeDefaultState();

    // Event listeners
    startBtn.addEventListener('click', handleStartMatch);
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    applySettingsBtn.addEventListener('click', handleApplySettings);
    resetAllBtn.addEventListener('click', handleResetAll);

    // Spell buttons
    document.querySelectorAll('.spell-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleSpellClick(e.currentTarget));

        // Long press to reset
        btn.addEventListener('touchstart', (e) => handleLongPressStart(e.currentTarget));
        btn.addEventListener('touchend', (e) => handleLongPressEnd(e.currentTarget));
        btn.addEventListener('mousedown', (e) => handleLongPressStart(e.currentTarget));
        btn.addEventListener('mouseup', (e) => handleLongPressEnd(e.currentTarget));
    });

    // Spell options in settings
    spellOptions.forEach(option => {
        option.addEventListener('click', () => handleSpellChange(option.dataset.spell));
    });

    // Haste modifiers - Update to toggle check based on selected role
    ionianBootsCheckbox.addEventListener('change', (e) => {
        const role = spellRoleSelect.value;
        console.log(`Updated ionian for ${role}: ${e.target.checked}`);
        hasteModifiers[role].ionian = e.target.checked;
        updateHasteIndicators();
        sessionRef.child('hasteModifiers').set(hasteModifiers);
    });
    cosmicInsightCheckbox.addEventListener('change', (e) => {
        const role = spellRoleSelect.value;
        console.log(`Updated cosmic for ${role}: ${e.target.checked}`);
        hasteModifiers[role].cosmic = e.target.checked;
        updateHasteIndicators();
        sessionRef.child('hasteModifiers').set(hasteModifiers);
    });

    // Update checkboxes when role changes
    spellRoleSelect.addEventListener('change', (e) => {
        const role = e.target.value;
        ionianBootsCheckbox.checked = hasteModifiers[role].ionian;
        cosmicInsightCheckbox.checked = hasteModifiers[role].cosmic;
        renderSpellOptions(role); // Also re-render spell options if needed
    });

    // Firebase sync
    syncWithFirebase();

    // Initialize haste indicators
    updateHasteIndicators();
}

// Open settings and initialize UI
function openSettings() {
    settingsModal.classList.remove('hidden');

    // Trigger update based on current selection
    const role = spellRoleSelect.value;
    ionianBootsCheckbox.checked = hasteModifiers[role].ionian;
    cosmicInsightCheckbox.checked = hasteModifiers[role].cosmic;

    // Highlight current spells
    renderSpellOptions(role);
}

// Initialize default spell state
function initializeDefaultState() {
    const roles = ['top', 'jg', 'mid', 'ad', 'sup'];
    const defaultSpells = {
        top: 'SummonerTeleport',
        jg: 'SummonerSmite',
        mid: 'SummonerDot',
        ad: 'SummonerBarrier',
        sup: 'SummonerExhaust'
    };

    roles.forEach(role => {
        spellStates[`${role}-1`] = {
            spell: defaultSpells[role],
            cooldown: 0,
            isOnCooldown: false,
            lastResetTime: 0
        };
        spellStates[`${role}-2`] = {
            spell: 'SummonerFlash',
            cooldown: 0,
            isOnCooldown: false,
            lastResetTime: 0
        };
    });
}

// Format time as M:SS or MM:SS
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update haste indicator dots
function updateHasteIndicators() {
    ['top', 'jg', 'mid', 'ad', 'sup'].forEach(role => {
        const ionianDots = document.querySelectorAll(`.haste-dot[data-role="${role}"][data-haste="ionian"]`);
        const cosmicDots = document.querySelectorAll(`.haste-dot[data-role="${role}"][data-haste="cosmic"]`);

        ionianDots.forEach(dot => {
            if (hasteModifiers[role].ionian) {
                dot.classList.remove('inactive');
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
                dot.classList.add('inactive');
            }
        });

        cosmicDots.forEach(dot => {
            if (hasteModifiers[role].cosmic) {
                dot.classList.remove('inactive');
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
                dot.classList.add('inactive');
            }
        });
    });
}

// Handle Start Match (Audio Unlock)
async function handleStartMatch() {
    // Unlock audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    await audioContext.resume();
    isAudioUnlocked = true;

    // Test play sounds to ensure they're loaded
    warningSound.volume = 0.01;
    warningSound.play().then(() => warningSound.pause()).catch(() => { });
    readySound.volume = 0.01;
    readySound.play().then(() => readySound.pause()).catch(() => { });

    // Reset volumes
    setTimeout(() => {
        warningSound.volume = 1;
        readySound.volume = 1;
    }, 100);

    // Request wake lock
    await requestWakeLock();

    // Show app
    startOverlay.classList.add('hidden');
    appContainer.classList.remove('hidden');
}

// Request Wake Lock API
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('Wake Lock activated');

            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock released');
            });
        } catch (err) {
            console.error('Wake Lock error:', err);
        }
    }
}

// Handle spell click (start cooldown)
function handleSpellClick(btn) {
    const role = btn.dataset.role;
    const spellSlot = btn.dataset.spell;
    const key = `${role}-${spellSlot}`;
    const state = spellStates[key];

    // Don't start if already on cooldown
    if (state.isOnCooldown) return;

    // Prevent misclick after reset (500ms cooldown)
    const now = Date.now();
    if (state.lastResetTime && (now - state.lastResetTime) < 500) {
        console.log('Ignoring click - too soon after reset');
        return;
    }

    // Calculate cooldown with haste
    const baseCooldown = SPELL_COOLDOWNS[state.spell];
    const roleHaste = hasteModifiers[role];
    const totalHaste = (roleHaste.ionian ? 10 : 0) + (roleHaste.cosmic ? 18 : 0);
    const actualCooldown = Math.round(baseCooldown * (100 / (100 + totalHaste)));

    // Update state
    state.isOnCooldown = true;
    state.cooldown = actualCooldown;

    // Sync to Firebase
    sessionRef.child(key).set(state);

    // Start timer
    startCooldownTimer(btn, key, actualCooldown);
}

// Start cooldown timer
function startCooldownTimer(btn, key, duration) {
    let remaining = duration;
    const state = spellStates[key];

    // Clear existing timer
    if (timers[key]) {
        clearInterval(timers[key]);
    }

    // Darken spell icon
    const spellIcon = btn.querySelector('.spell-icon');
    if (spellIcon) {
        spellIcon.classList.add('on-cooldown');
    }

    // Create overlay
    let overlay = btn.querySelector('.cooldown-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'cooldown-overlay';

        // Waterfall background
        const waterfallBg = document.createElement('div');
        waterfallBg.className = 'waterfall-bg';
        overlay.appendChild(waterfallBg);

        // Timer text
        const timerText = document.createElement('div');
        timerText.className = 'cooldown-timer';
        overlay.appendChild(timerText);

        btn.appendChild(overlay);
    }

    const timerText = overlay.querySelector('.cooldown-timer');
    const waterfallBg = overlay.querySelector('.waterfall-bg');

    // Update display immediately
    timerText.textContent = formatTime(remaining);
    if (waterfallBg) {
        waterfallBg.style.height = '100%';
    }

    timers[key] = setInterval(() => {
        remaining--;
        state.cooldown = remaining;

        // Update display
        timerText.textContent = formatTime(remaining);

        // Waterfall effect: reduce height from 100% to 0%
        if (waterfallBg) {
            const progress = remaining / duration;
            const heightPercentage = progress * 100;
            waterfallBg.style.height = `${heightPercentage}%`;
        }

        // 30s warning - subtle fade effect
        if (remaining === 30) {
            overlay.classList.add('fade-warning');
            playSound(warningSound);
        }

        // Ready
        if (remaining <= 0) {
            clearInterval(timers[key]);
            delete timers[key];

            state.isOnCooldown = false;
            state.cooldown = 0;

            // Remove overlay and restore icon
            overlay.remove();
            if (spellIcon) {
                spellIcon.classList.remove('on-cooldown');
            }

            // Play ready sound
            playSound(readySound);

            // Sync to Firebase
            sessionRef.child(key).set(state);
        } else {
            // Sync every 5 seconds
            if (remaining % 5 === 0) {
                sessionRef.child(key).set(state);
            }
        }
    }, 1000);
}

// Play sound
function playSound(audioElement) {
    if (!isAudioUnlocked) return;

    audioElement.currentTime = 0;
    audioElement.play().catch(err => {
        console.error('Audio play error:', err);
    });
}

// Handle long press start
function handleLongPressStart(btn) {
    const role = btn.dataset.role;
    const spellSlot = btn.dataset.spell;
    const key = `${role}-${spellSlot}`;

    longPressTimers[key] = setTimeout(() => {
        handleSpellReset(btn, key);
    }, 1000);
}

// Handle long press end
function handleLongPressEnd(btn) {
    const role = btn.dataset.role;
    const spellSlot = btn.dataset.spell;
    const key = `${role}-${spellSlot}`;

    if (longPressTimers[key]) {
        clearTimeout(longPressTimers[key]);
        delete longPressTimers[key];
    }
}

// Reset spell
function handleSpellReset(btn, key) {
    const state = spellStates[key];

    // Clear timer
    if (timers[key]) {
        clearInterval(timers[key]);
        delete timers[key];
    }

    // Reset state
    state.isOnCooldown = false;
    state.cooldown = 0;
    state.lastResetTime = Date.now(); // Record reset time to prevent misclick

    // Remove overlay
    const overlay = btn.querySelector('.cooldown-overlay');
    if (overlay) {
        overlay.remove();
    }

    // Restore icon brightness
    const spellIcon = btn.querySelector('.spell-icon');
    if (spellIcon) {
        spellIcon.classList.remove('on-cooldown');
    }

    // Sync to Firebase
    sessionRef.child(key).set(state);

    // Visual feedback
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 200);
}

// Handle spell change in settings
function handleSpellChange(spellName) {
    const role = spellRoleSelect.value;
    const key = `${role}-1`;

    spellStates[key].spell = spellName;

    // Update UI
    const btn = document.querySelector(`.spell-btn[data-role="${role}"][data-spell="1"]`);
    const img = btn.querySelector('.spell-icon');
    img.src = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/spell/${spellName}.png`;
    img.alt = spellName;

    // Sync to Firebase
    sessionRef.child(key).set(spellStates[key]);

    // Visual feedback
    spellOptions.forEach(opt => opt.classList.remove('ring-2', 'ring-cyan-400'));
    event.target.closest('.spell-option').classList.add('ring-2', 'ring-cyan-400');
}

// Apply settings
function handleApplySettings() {
    // Sync haste modifiers to Firebase
    sessionRef.child('hasteModifiers').set(hasteModifiers);

    settingsModal.classList.add('hidden');
}

// Reset All (Spells, Runes, Cooldowns)
function handleResetAll() {
    if (!confirm('確定要重置所有狀態嗎？\n\n這將會：\n1. 還原所有技能為預設值\n2. 清除所有冷卻時間\n3. 重置所有符文設定')) {
        return;
    }

    // Reset local state to defaults
    initializeDefaultState();

    // Reset haste modifiers
    hasteModifiers = {
        top: { ionian: false, cosmic: false },
        jg: { ionian: false, cosmic: false },
        mid: { ionian: false, cosmic: false },
        ad: { ionian: false, cosmic: false },
        sup: { ionian: false, cosmic: false }
    };

    // Push to Firebase (this will trigger the UI update via syncWithFirebase)
    sessionRef.set({
        ...spellStates,
        hasteModifiers
    });

    // Close settings
    settingsModal.classList.add('hidden');
}

// Sync with Firebase
function syncWithFirebase() {
    // Monitor connection state
    const connectedRef = database.ref(".info/connected");
    connectedRef.on("value", (snap) => {
        if (snap.val() === true) {
            console.log("Firebase Connected!");
        } else {
            console.log("Firebase Disconnected!");
        }
    });

    sessionRef.on('value', (snapshot) => {
        const data = snapshot.val();
        console.log("Received Firebase data:", data);

        if (!data) {
            // Initialize Firebase with default state
            sessionRef.set({
                ...spellStates,
                hasteModifiers
            });
            return;
        }

        // Update haste modifiers if present
        if (data.hasteModifiers) {
            hasteModifiers = data.hasteModifiers;
            updateHasteIndicators();

            // Update checkboxes for currently selected role
            const currentRole = spellRoleSelect.value;
            if (currentRole && hasteModifiers[currentRole]) {
                ionianBootsCheckbox.checked = hasteModifiers[currentRole].ionian;
                cosmicInsightCheckbox.checked = hasteModifiers[currentRole].cosmic;
            }
        }

        // Update local state
        Object.keys(spellStates).forEach(key => {
            if (data[key]) {
                const remoteState = data[key];
                const localState = spellStates[key];

                // Update spell if changed
                if (remoteState.spell !== localState.spell) {
                    localState.spell = remoteState.spell;

                    const [role, slot] = key.split('-');
                    const btn = document.querySelector(`.spell-btn[data-role="${role}"][data-spell="${slot}"]`);
                    const img = btn.querySelector('.spell-icon');
                    img.src = `https://ddragon.leagueoflegends.com/cdn/14.1.1/img/spell/${remoteState.spell}.png`;
                }

                // Sync cooldown state
                if (remoteState.isOnCooldown && !localState.isOnCooldown) {
                    // Remote started cooldown
                    localState.isOnCooldown = true;
                    localState.cooldown = remoteState.cooldown;

                    const [role, slot] = key.split('-');
                    const btn = document.querySelector(`.spell-btn[data-role="${role}"][data-spell="${slot}"]`);
                    startCooldownTimer(btn, key, remoteState.cooldown);
                } else if (!remoteState.isOnCooldown && localState.isOnCooldown) {
                    // Remote reset
                    handleSpellReset(
                        document.querySelector(`.spell-btn[data-role="${key.split('-')[0]}"][data-spell="${key.split('-')[1]}"]`),
                        key
                    );
                }
            }
        });
    });
}

// Re-acquire wake lock on visibility change
document.addEventListener('visibilitychange', async () => {
    if (wakeLock !== null && document.visibilityState === 'visible') {
        await requestWakeLock();
    }
});

// Initialize on load
init();
