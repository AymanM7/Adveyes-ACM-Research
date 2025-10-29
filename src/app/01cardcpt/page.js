"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Image from "next/image";

/** Card CPT (game-only) with distractors outside the letter zone */
const CFG = {
  BLOCKS: 3,
  TRIALS_PER_BLOCK: 10,      // balanced block size for reliable metrics
  TARGET_RATE: 0.15,
  ISI_MS: 800,
  STIM_MS_START: 1300,
  STIM_MS_MIN: 600,
  STIM_MS_MAX: 2500,
  ADAPT_UP_MISS: 120,
  ADAPT_DOWN_AFTER_HITS: 3,
  ADAPT_DOWN_STEP: 60,
  // overall distractor show rate governed by 'none': show ≈ 1 - none
  // Probabilities sum to 1.0 (rounded), preserving previous relative proportions
  DISTRACTOR_PROBS: { none: 0.08, notification: 0.17, banner: 0.12, ripple: 0.17, screen: 0.12, shape: 0.17, falsecard: 0.17 },
  DISTRACTOR_ONSET_MS: [150, 400],
  DISTRACTOR_DUR_MS: [1500, 2800], // realistic but not overwhelming
  FALSECARD_DUR_MS: [900, 1600],   // shorter screen time for false-card distractor
  // Extra concurrent spawn attempts per trial (uses same per-attempt probabilities). Increase for more presence.
  EXTRA_SPAWN_ATTEMPTS: 1,
  // Notification content for realistic distractions
  NOTIFICATION_CONTENT: [
    { title: "New Message", body: "Sarah: Hey, are you free to chat?" },
    { title: "Calendar", body: "Meeting 'Weekly Sync' starts in 15 minutes" },
    { title: "Updates Available", body: "System updates are ready to install" },
    { title: "Weather", body: "Light rain expected in your area" },
    { title: "Battery Low", body: "20% battery remaining" }
  ],
  //Letters and letters array are both indexed with i
  LETTERS: ['7 of diamonds', 'queen of spades', 'jack of spades', '8 of diamonds', '6 of clubs', '9 of hearts', 'ace of hearts', '8 of spades', 'king of clubs', '7 of clubs', '10 of diamonds', '10 of spades', 'black joker', 'jack of clubs', '6 of spades', '4 of hearts', '2 of spades', 'queen of clubs', '3 of hearts', '5 of spades', '6 of diamonds', 'queen of diamonds', '7 of hearts', 'king of hearts', 'ace of clubs', '9 of diamonds', '6 of hearts', '9 of clubs', 'king of diamonds', '4 of spades', '2 of hearts', '3 of diamonds', '10 of hearts', 'king of spades', '8 of clubs', '4 of diamonds', 'jack of diamonds', '3 of spades', '5 of hearts', '7 of spades', 'ace of spades', '5 of diamonds', '9 of spades', 'queen of hearts', 'ace of diamonds', '5 of clubs', '2 of clubs', 'jack of hearts', '10 of clubs', '2 of diamonds', '8 of hearts', 'red joker', '3 of clubs', '4 of clubs'],
  LETTERSARRAY: ['/cards/7_of_diamonds.png', '/cards/queen_of_spades.png', '/cards/jack_of_spades.png', '/cards/8_of_diamonds.png', '/cards/6_of_clubs.png', '/cards/9_of_hearts.png', '/cards/ace_of_hearts.png', '/cards/8_of_spades.png', '/cards/king_of_clubs.png', '/cards/7_of_clubs.png', '/cards/10_of_diamonds.png', '/cards/10_of_spades.png', '/cards/black_joker.png', '/cards/jack_of_clubs.png', '/cards/6_of_spades.png', '/cards/4_of_hearts.png', '/cards/2_of_spades.png', '/cards/queen_of_clubs.png', '/cards/3_of_hearts.png', '/cards/5_of_spades.png', '/cards/6_of_diamonds.png', '/cards/queen_of_diamonds.png', '/cards/7_of_hearts.png', '/cards/king_of_hearts.png', '/cards/ace_of_clubs.png', '/cards/9_of_diamonds.png', '/cards/6_of_hearts.png', '/cards/9_of_clubs.png', '/cards/king_of_diamonds.png', '/cards/4_of_spades.png', '/cards/2_of_hearts.png', '/cards/3_of_diamonds.png', '/cards/10_of_hearts.png', '/cards/king_of_spades.png', '/cards/8_of_clubs.png', '/cards/4_of_diamonds.png', '/cards/jack_of_diamonds.png', '/cards/3_of_spades.png', '/cards/5_of_hearts.png', '/cards/7_of_spades.png', '/cards/ace_of_spades.png', '/cards/5_of_diamonds.png', '/cards/9_of_spades.png', '/cards/queen_of_hearts.png', '/cards/ace_of_diamonds.png', '/cards/5_of_clubs.png', '/cards/2_of_clubs.png', '/cards/jack_of_hearts.png', '/cards/10_of_clubs.png', '/cards/2_of_diamonds.png', '/cards/8_of_hearts.png', '/cards/red_joker.png', '/cards/3_of_clubs.png', '/cards/4_of_clubs.png'],
  TARGET: '7 of diamonds',
  RESPONSE_KEYS: ["Space", "Spacebar", " "],
};


const css = `
:root { --bg:#0e0e10; --fg:#f7f8fb; --muted:#9aa0a6; }

html,body {
  margin:0; height:100%;
  background:var(--bg); color:var(--fg);
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;
}

.wrap {
  min-height:100vh;
  display:flex; align-items:center; justify-content:center;
  padding:24px;
}

.card {
  width:min(840px,92vw);
  padding:12px 14px;
  border-radius:16px;
  background:#16171a;
  box-shadow:0 10px 30px rgba(0,0,0,.35);
  box-sizing:border-box;
  display:flex; flex-direction:column; align-items:stretch;
}

h1,h2 { margin:0 0 12px; }
p { margin:0 0 10px; color:var(--muted); }

button {
  background:#22252b; color:#fff;
  border:1px solid #2f333a; border-radius:10px;
  padding:10px 16px; cursor:pointer;
}
button:hover{ background:#2a2e35; }

.row{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }

.hud{
  display:flex; justify-content:space-between; gap:6px;
  margin-bottom:4px; color:#cfd2d6; font-size:11px; flex-wrap:wrap;
}

.progress{ height:6px; background:#24262b; border-radius:999px; overflow:hidden; }
.bar{ height:100%; width:0%; background:#4b8cf5; transition:width .2s ease; }

.stage{ display:none; }
.stage.active{ display:block; }

/* ===== Centered Letter Box (Arena) ===== */
.arena{
  position:relative !important; z-index:2;   /* positioning context for edges */
  width:100%;
  aspect-ratio:16 / 10;
  margin:12px 0;
  background:#0b0c0f;
  border:1px solid #1e2126;
  border-radius:14px;
  display:flex; align-items:center; justify-content:center;
  overflow:hidden;
}
.arena:focus,
.arena:focus-visible { outline: none !important; }

/* Border flash animation (non-sticky) */
@keyframes borderFlash {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
.arena.flash::after{
  content:"";
  position:absolute;
  inset:0;
  border:3px solid #fff;
  border-radius:14px;
  pointer-events:none;
  opacity:0;
  animation:borderFlash 160ms ease-out forwards;
}

.letter{
  position:relative; z-index:6; /* above mask & edges */
  font-weight:800;
  font-size:clamp(56px,12.5vw,120px);
  letter-spacing:2px;
  user-select:none;
}

.outer,.inner{
  position:absolute; left:50%; top:50%;
  transform:translate(-50%,-50%);
}
.outer{ z-index:1; width:70%; height:70%; }

/* Structural inner box (32% x 32%) + visual mask to hide any stray edge */
.inner{
  z-index:5;               /* above .edge (2), below .letter (6) */
  width:32%; height:32%;
  pointer-events:none;
}
.inner::after {
  content:"";
  position:absolute;
  left:-16px; top:-16px; right:-16px; bottom:-16px;  /* moat */
  background:#0b0c0f;           /* same as .arena background */
  border-radius:8px;
  pointer-events:none;
  z-index:1; /* within .inner stacking context, still above .edge overall */
}

/* Flashes live *inside* the arena only */
.distractor{
  position:absolute !important;
  pointer-events:none;
  z-index:2;
  opacity:0;
  transition:opacity 0.3s ease;
}

/* Notification style distractor */
.distractor.notification {
  background:#fff;
  border-radius:8px;
  padding:12px 16px;
  box-shadow:0 4px 12px rgba(0,0,0,0.15);
  width:280px;
  color:#000;
  font-size:14px;
  line-height:1.4;
}

/* Pseudo-target style distractor */
.distractor.pseudo-target {
  font-weight:800;
  font-size:clamp(28px,5vw,48px);
  color:rgba(247,248,251,0.4);
  padding:8px 16px;
  border-radius:8px;
  background:rgba(0,0,0,0.08);
  max-width:180px;
  text-align:center;
}

/* Shape distractor style */
.distractor.shape-distractor {
  display:flex;
  align-items:center;
  justify-content:center;
  position:absolute;
  z-index:2;
  pointer-events:none;
}

/* Animated movement for shape distractors */
.distractor.shape-distractor.moving {
  transition: left 800ms cubic-bezier(0.4, 0, 0.2, 1), top 800ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Screen effect style distractor */
.distractor.screen-effect {
  position:fixed;
  inset:0;
  background:rgba(255,255,255,0.03);
  mix-blend-mode:difference;
  z-index:1;
}

/* False-card distractor (mini card image) */
.distractor.false-card{
  border-radius:12px;
  box-shadow:0 10px 28px rgba(0,0,0,0.40), 0 2px 8px rgba(0,0,0,0.25);
  overflow:hidden;
}

/* Banner (sliding info) */
.distractor.banner{
  background:#1f2328;
  color:#e8eaed;
  border:1px solid #2b3036;
  border-radius:10px;
  padding:8px 12px;
  box-shadow:0 6px 18px rgba(0,0,0,.25);
  font-size:14px;
  line-height:1.3;
  opacity:0;
}
.distractor.banner.slide-in{ transition: transform 420ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease; }
.distractor.banner.top{ transform: translateY(-10px); }
.distractor.banner.bottom{ transform: translateY(10px); }
.distractor.banner.show{ transform: translateY(0); opacity:1; }

/* Ripple from edge */
@keyframes rippleExpand {
  from { transform: scale(0.6); opacity: .35; }
  to   { transform: scale(1.8); opacity: 0; }
}
.distractor.ripple{
  border-radius:50%;
  background:#4b8cf5;
  opacity:.25;
  will-change: transform, opacity;
}

.distractor-layer{
  position:absolute; inset:0; pointer-events:none;
  z-index:5; /* above card/arena so distractors are visible; placement still avoids card/HUD */
}

.summary{
  display:grid; grid-template-columns:1fr 1fr;
  gap:12px; margin-top:12px;
  font-family:ui-monospace,Menlo,Consolas,monospace;
  color:#e8eaed;
}

.keylamp{
  display:inline-block; width:12px; height:12px; border-radius:50%;
  background:#3a3f45; box-shadow:0 0 0 1px #2f333a inset; vertical-align:middle;
}
.keylamp.on{ background:#4b8cf5; box-shadow:0 0 8px rgba(75,140,245,.9); }
`;

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function r(min, max){ return Math.random() * (max - min) + min; }
function ri(min, max){ return Math.floor(r(min, max + 1)); }
function pick(a){ return a[Math.floor(Math.random()*a.length)]; }

// Helper: weighted picker over CFG.DISTRACTOR_PROBS that sum to 1.0 (includes 'none').
function pickDistractorType() {
  const probs = CFG.DISTRACTOR_PROBS || {};
  const entries = Object.entries(probs).filter(([k,v]) => typeof v === 'number' && v > 0);
  if (!entries.length) return 'none';
  const total = entries.reduce((s, [,v]) => s + v, 0);
  let x = Math.random() * total;
  for (const [k, v] of entries) {
    if ((x -= v) <= 0) return k;
  }
  return entries[entries.length - 1][0];
}

export default function Page({ embedded=false, onDone, onCollect }){
  const [stage, setStage] = useState("intro"); // intro | game | break | done
  const [block, setBlock] = useState(1);
  const [trialInBlock, setTrialInBlock] = useState(0);
  const [globalTrial, setGlobalTrial] = useState(0);
  const [letter, setLetter] = useState("");
  const [targetsLeft, setTargetsLeft] = useState("—");
  const [stimMs, setStimMs] = useState(CFG.STIM_MS_START);
  const [spaceFlash, setSpaceFlash] = useState(false);

  const consecHitsRef = useRef(0);
  const planRef = useRef([]);          // current block plan (immutable array)
  const idxRef = useRef(0);            // authoritative trial index
  const allowRespRef = useRef(false);
  const pressTsRef = useRef(null);
  const stimStartRef = useRef(0);
  // Separate timers so we can keep distractors alive across trials
  const trialTimers = useRef([]);
  const distractorTimers = useRef([]);
  const rafRef = useRef(null);

  const arenaRef = useRef(null);
  const outerRef = useRef(null);
  const innerRef = useRef(null);
  const letterRef = useRef(null);
  const wrapRef = useRef(null);
  const bgRef = useRef(null);
  const cardRef = useRef(null);

  const dataRef = useRef([]);

const makePlan = useCallback(() => {
  // 1) Safe, integer N
  const n = Math.max(1, Number(CFG.TRIALS_PER_BLOCK) | 0);

  // 2) Safe target count
  const tCount = Math.min(n, Math.max(0, Math.round(n * Number(CFG.TARGET_RATE))));

  // 3) Build [1,1,...,0,0,...] then shuffle
  const arr = new Array(n).fill(0);
  for (let i = 0; i < tCount; i++) arr[i] = 1;

  // Fisher–Yates with classic swap (no destructuring)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  // 4) No 3-in-a-row constraint
  function ok(seq) {
    let run = 0;
    for (let k = 0; k < seq.length; k++) {
      run = seq[k] ? run + 1 : 0;
      if (run > 2) return false;
    }
    return true;
  }

  // 5) Regenerate if needed (bounded)
  let seq = arr.slice();
  let tries = 0;
  while (!ok(seq) && tries++ < 500) {
    // reshuffle seq in place
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = seq[i];
      seq[i] = seq[j];
      seq[j] = tmp;
    }
  }

  // 6) Random distractor picker (reused helper)

  // 7) Build the block plan
  const plan = [];
  for (let i = 0; i < n; i++) {
    const isT = seq[i] ? 1 : 0;
    let L = CFG.TARGET;
    if (!isT) {
      // pick any non-target card
      do { L = CFG.LETTERS[Math.floor(Math.random() * CFG.LETTERS.length)]; }
      while (L === CFG.TARGET);
    }
    plan.push({ letter: L, isTarget: isT, distractorLevel: pickDistractorType() });
  }
  return plan;
}, []);


  // GLOBAL KEY HANDLER (Space + border flash)
  useEffect(() => {
    const onKeyDown = (e) => {
      const isSpace =
        e.code === "Space" ||
        e.key === " " ||
        e.key === "Spacebar" ||
        e.keyCode === 32 ||
        e.which === 32;

      if (!isSpace) return;

      e.preventDefault();
      e.stopPropagation();

      if (!allowRespRef.current) return;

      if (pressTsRef.current == null) {
        pressTsRef.current = performance.now();
        setSpaceFlash(true);
        setTimeout(() => setSpaceFlash(false), 120);
      }

      const a = arenaRef.current;
      if (a) {
        a.classList.remove("flash");
        void a.offsetWidth;          // reflow to restart CSS animation
        a.classList.add("flash");
      }
    };

    document.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keydown", onKeyDown, { capture: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  // remove .flash after animation
  useEffect(() => {
    const a = arenaRef.current;
    if (!a) return;
    const onEnd = (ev) => { if (ev.animationName === "borderFlash") a.classList.remove("flash"); };
    a.addEventListener("animationend", onEnd);
    return () => a.removeEventListener("animationend", onEnd);
  }, []);

  // focus arena so keyboard works even after clicks
  useEffect(()=>{
    if(stage==="game") { setTimeout(()=> arenaRef.current?.focus?.(), 0); }
  },[stage, trialInBlock]);

  // cleanup timers
  useEffect(()=>()=>{
    // On unmount, clear everything
    try { trialTimers.current.forEach(id => { try { clearTimeout(id); } catch {} try { clearInterval(id); } catch {} }); } catch {}
    try { distractorTimers.current.forEach(id => { try { clearTimeout(id); } catch {} try { clearInterval(id); } catch {} }); } catch {}
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
  },[]);

  // Full reset (between blocks or unmount): clear everything and remove distractors
  const clearTimers = useCallback(()=>{
    // Clear both timeouts and intervals
    try { trialTimers.current.forEach(id => { try { clearTimeout(id); } catch {} try { clearInterval(id); } catch {} }); } catch {}
    try { distractorTimers.current.forEach(id => { try { clearTimeout(id); } catch {} try { clearInterval(id); } catch {} }); } catch {}
    trialTimers.current = [];
    distractorTimers.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
    // Remove all distractors from both layers
    arenaRef.current?.querySelectorAll(".distractor").forEach(n => n.remove());
    bgRef.current?.querySelectorAll(".distractor").forEach(n => n.remove());
  },[]);

  // Trial-only reset: stop pending trial timeouts/animations but keep existing distractors alive
  const clearTrialTimers = useCallback(()=>{
    try { trialTimers.current.forEach(id => { try { clearTimeout(id); } catch {} try { clearInterval(id); } catch {} }); } catch {}
    trialTimers.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current); rafRef.current = null;
  },[]);

  const startTask = async ()=>{

  const startEyeTracking = async () => {
    const res = await fetch("/api/eye-tracking/start", { method: "POST" });
    const data = await res.json();
    console.log(data);
  };
  await startEyeTracking();
    dataRef.current = [];
    setStage("game");
    setBlock(1);
    setTrialInBlock(0);
    setGlobalTrial(0);
    setStimMs(CFG.STIM_MS_START);
    consecHitsRef.current = 0;
    planRef.current = makePlan();
    idxRef.current = 0;
    setTargetsLeft(Math.round(CFG.TRIALS_PER_BLOCK * CFG.TARGET_RATE));
    trialTimers.current.push(window.setTimeout(nextTrial, 400));
  };

  const nextBlock = ()=>{
    clearTimers();
    planRef.current = makePlan();
    idxRef.current = 0;
    setTrialInBlock(0);
    setTargetsLeft(Math.round(CFG.TRIALS_PER_BLOCK * CFG.TARGET_RATE));
    setStage("game");
    trialTimers.current.push(window.setTimeout(nextTrial, 400));
  };

  const endBlock = ()=>{
    const nb = block + 1;
    if (nb > CFG.BLOCKS) { 
      setStage("done"); 
      // Pass data to parent when test is complete
      onCollect?.(dataRef.current);
      return; 
    }
    setBlock(nb);
    setStage("break");
  };

  const nextTrial = ()=>{
    // Only clear trial timers so existing distractors can persist across trials
    clearTrialTimers();
    setLetter(null);
    allowRespRef.current = false;
    pressTsRef.current = null;
    trialTimers.current.push(window.setTimeout(runStimulus, CFG.ISI_MS));
  };

  const runStimulus = ()=>{
    const i = idxRef.current;
    const plan = planRef.current[i];
    if (!plan) { endBlock(); return; }

    setLetter(plan.letter);
    setTrialInBlock(i+1);
    setGlobalTrial(g=>g+1);
    if (plan.isTarget) setTargetsLeft(v => (typeof v==="number" ? Math.max(v-1,0) : v));

    allowRespRef.current = true;
    pressTsRef.current = null;
    stimStartRef.current = performance.now();

    let dParams = null;
    if (plan.distractorLevel !== "none") {
      const onset = Math.round(r(...CFG.DISTRACTOR_ONSET_MS));
      const dur = Math.round(r(...CFG.DISTRACTOR_DUR_MS));
      dParams = spawnDistractor(plan.distractorLevel, onset, dur);
    }
    // Extra concurrent spawn attempts (do not change per-attempt probabilities)
    const extra = Math.max(0, Number(CFG.EXTRA_SPAWN_ATTEMPTS) | 0);
    for (let k = 0; k < extra; k++) {
      const t = pickDistractorType();
      if (t === 'none') continue;
      const onset = Math.round(r(...CFG.DISTRACTOR_ONSET_MS));
      const dur = Math.round(r(...CFG.DISTRACTOR_DUR_MS));
      spawnDistractor(t, onset, dur);
    }

    const endT = window.setTimeout(()=> finishTrial(plan, dParams), stimMs);
    trialTimers.current.push(endT);
  };

  const finishTrial = (plan, dParams)=>{
    allowRespRef.current = false;

    const pressed = pressTsRef.current !== null;
    const rt = pressed ? Math.round(pressTsRef.current - stimStartRef.current) : null;

    let isHit=0,isOmit=0,isCom=0;
    if (plan.isTarget) {
      if (pressed) { isHit=1; consecHitsRef.current++; }
      else { isOmit=1; consecHitsRef.current=0; }
    } else {
      if (pressed) isCom=1;
    }

    setStimMs(cur=>{
      if (isOmit) return clamp(cur + CFG.ADAPT_UP_MISS, CFG.STIM_MS_MIN, CFG.STIM_MS_MAX);
      if (plan.isTarget && isHit && consecHitsRef.current >= CFG.ADAPT_DOWN_AFTER_HITS) {
        consecHitsRef.current = 0;
        return clamp(cur - CFG.ADAPT_DOWN_STEP, CFG.STIM_MS_MIN, CFG.STIM_MS_MAX);
      }
      return cur;
    });

    dataRef.current.push({
      participant_id: "anon",
      block_index: block,
      trial_index_global: globalTrial + 1,
      trial_index_block: idxRef.current + 1,
      letter: plan.letter,
      is_target: plan.isTarget,
      has_distractor: plan.distractorLevel !== "none" ? 1 : 0,
      distractor_level: plan.distractorLevel,
      distractor_type: dParams ? dParams.type : "none",
      distractor_onset_ms: dParams ? dParams.onset : null,
      distractor_duration_ms: dParams ? dParams.duration : null,
      distractor_pos_px_x: dParams ? Math.round(dParams.x) : null,
      distractor_pos_px_y: dParams ? Math.round(dParams.y) : null,
      distractor_quadrant: dParams ? dParams.quadrant : null,
      stim_duration_ms: stimMs,
      isi_ms: CFG.ISI_MS,
      response_key: pressed ? "space" : "none",
      response_time_ms: rt,
      is_hit: isHit,
      is_omission: isOmit,
      is_commission: isCom,
      timestamp_ms: Date.now(),
    });

    idxRef.current += 1;

    if (idxRef.current >= CFG.TRIALS_PER_BLOCK) endBlock();
    else nextTrial();
  };

  // Realistic distractors: notification popups, pseudo targets, screen color changes
  // Distractor placement with overlap avoidance
  const spawnDistractor = (type, onsetMs, durMs) => {
    const arenaEl = arenaRef.current;
    const bgEl = bgRef.current || wrapRef.current;
    const cardEl = cardRef.current;
    if (!arenaEl || !bgEl || !cardEl) return null;

  const wrapRect = bgEl.getBoundingClientRect();
    const cardRect = cardEl.getBoundingClientRect();
    const W = wrapRect.width;
    const H = wrapRect.height;

    // HUD area (top of card)
    // Find .hud inside .card, not bgEl
    let hudRect = {left:0,top:0,right:0,bottom:0};
    const cardHudEl = cardEl.querySelector('.hud');
    if (cardHudEl) {
      const r = cardHudEl.getBoundingClientRect();
      hudRect = {
        left: r.left - wrapRect.left,
        top: r.top - wrapRect.top,
        right: r.right - wrapRect.left,
        bottom: r.bottom - wrapRect.top
      };
    }

    // Forbidden zones
    const PAD = 20;
    // Card area with padding is always forbidden
    const cardForbiddenRect = {
      left: clamp(cardRect.left - wrapRect.left - PAD, 0, W),
      top: clamp(cardRect.top - wrapRect.top - PAD, 0, H),
      right: clamp(cardRect.right - wrapRect.left + PAD, 0, W),
      bottom: clamp(cardRect.bottom - wrapRect.top + PAD, 0, H)
    };
    // Default forbidden: card + HUD; for falsecard we will ignore the HUD
    const forbiddenRects = [cardForbiddenRect, hudRect];

    // Track active distractors to avoid overlap
    const activeRects = Array.from(bgEl.querySelectorAll('.distractor')).map(d => {
      const r = d.getBoundingClientRect();
      return {
        left: r.left - wrapRect.left,
        top: r.top - wrapRect.top,
        right: r.right - wrapRect.left,
        bottom: r.bottom - wrapRect.top
      };
    });

    // Helper: check overlap
    function overlaps(r1, r2) {
      return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
    }

  const el = document.createElement("div");
    el.className = "distractor";

  // Configure distractor based on type
  let candidatePositions = [];
    switch(type) {
      case "notification": {
        el.className += " notification";
        const notif = pick(CFG.NOTIFICATION_CONTENT);
        el.innerHTML = `<div style='font-weight:600;margin-bottom:4px'>${notif.title}</div>${notif.body}`;
        // Notification size
        const width = 280, height = 80;
        // Build safe lobes (top, bottom, left, right) excluding card+HUD
        const forbid = {
          left: clamp(cardRect.left - wrapRect.left, 0, W),
          top: clamp(cardRect.top - wrapRect.top, 0, H),
          right: clamp(cardRect.right - wrapRect.left, 0, W),
          bottom: clamp(cardRect.bottom - wrapRect.top, 0, H),
        };
        const margin = 20;
        const lobes = [];
        // top lobe
        if (forbid.top - height - margin > margin)
          lobes.push({ xMin: margin, xMax: W - width - margin, yMin: margin, yMax: forbid.top - height - margin });
        // bottom lobe
        if (H - forbid.bottom - height - margin > margin)
          lobes.push({ xMin: margin, xMax: W - width - margin, yMin: forbid.bottom + margin, yMax: H - height - margin });
        // left lobe
        if (forbid.left - width - margin > margin) {
          const yMin = Math.min(Math.max(margin, hudRect.bottom + margin), H - height - margin);
          lobes.push({ xMin: margin, xMax: forbid.left - width - margin, yMin, yMax: H - height - margin });
        }
        // right lobe
        if (W - forbid.right - width - margin > margin) {
          const yMin = Math.min(Math.max(margin, hudRect.bottom + margin), H - height - margin);
          lobes.push({ xMin: forbid.right + margin, xMax: W - width - margin, yMin, yMax: H - height - margin });
        }
        // sample random positions across lobes
        candidatePositions = [];
        for (let i = 0; i < 8; i++) {
          const R = pick(lobes);
          if (!R) break;
          const x = ri(R.xMin, Math.max(R.xMin, R.xMax));
          const y = ri(R.yMin, Math.max(R.yMin, R.yMax));
          candidatePositions.push({ x, y });
        }
        break;
      }
      // ...other distractor cases remain unchanged...
      case "falsecard": {
        // A mini playing card that can overlap HUD but never the central card
        el.className += " false-card";
        const width = 190; // reduced again by 50x50 from previous 240x320
        const height = 270;
        el._w = width; el._h = height;
        // choose a random card image from public/cards
        const imgSrc = pick(CFG.LETTERSARRAY);
        el.innerHTML = `<img src="${imgSrc}" alt="false card" width="${width}" height="${height}" style="display:block;" />`;

        // Build safe lobes around the card (top/bottom/left/right). HUD is allowed.
        const margin = 12;
        const forbid = {
          left: clamp(cardRect.left - wrapRect.left, 0, W),
          top: clamp(cardRect.top - wrapRect.top, 0, H),
          right: clamp(cardRect.right - wrapRect.left, 0, W),
          bottom: clamp(cardRect.bottom - wrapRect.top, 0, H),
        };
        const lobes = [];
        // top lobe (above card)
        if (forbid.top - height - margin > margin)
          lobes.push({ xMin: margin, xMax: W - width - margin, yMin: margin, yMax: forbid.top - height - margin });
        // bottom lobe (below card)
        if (H - forbid.bottom - height - margin > margin)
          lobes.push({ xMin: margin, xMax: W - width - margin, yMin: forbid.bottom + margin, yMax: H - height - margin });
        // left lobe (left of card)
        if (forbid.left - width - margin > margin)
          lobes.push({ xMin: margin, xMax: forbid.left - width - margin, yMin: margin, yMax: H - height - margin });
        // right lobe (right of card)
        if (W - forbid.right - width - margin > margin)
          lobes.push({ xMin: forbid.right + margin, xMax: W - width - margin, yMin: margin, yMax: H - height - margin });

        candidatePositions = [];
        for (let i = 0; i < 10; i++) {
          const R = pick(lobes);
          if (!R) break;
          const x = ri(R.xMin, Math.max(R.xMin, R.xMax));
          const y = ri(R.yMin, Math.max(R.yMin, R.yMax));
          candidatePositions.push({ x, y });
        }
        break;
      }
      case "screen": {
        el.className += " screen-effect";
        el.style.opacity = "0.15";
        candidatePositions = [{x:0,y:0}]; // Only one position, covers whole screen
        break;
      }
      case "banner": {
        el.className += " banner";
        el.textContent = pick([
          "Sync paused. Click to resume...",
          "Settings saved.",
          "Background task completed.",
          "Network restored",
        ]);
        // Size assumptions
        const width = 320, height = 42;
        el._w = width; el._h = height;
        // Safe lobes for banner (top below HUD, or bottom above bottom edge), across width avoiding card
        const margin = 16;
        const topBand = { xMin: margin, xMax: W - width - margin, y: Math.max(hudRect.bottom + margin, margin) };
        const bottomBand = { xMin: margin, xMax: W - width - margin, y: H - height - margin };
        const bands = [];
        if (topBand.xMax > topBand.xMin) bands.push({ ...topBand, pos: 'top' });
        if (bottomBand.xMax > bottomBand.xMin) bands.push({ ...bottomBand, pos: 'bottom' });
        const b = bands.length ? pick(bands) : bottomBand;
        el.classList.add('slide-in');
        el.classList.add(b.pos);
        candidatePositions = [];
        for (let i = 0; i < 6; i++) {
          const x = ri(b.xMin, b.xMax);
          candidatePositions.push({ x, y: b.y });
        }
        break;
      }
      case "ripple": {
        el.className += " ripple";
        const size = ri(32, 56);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el._w = size; el._h = size;
        // Place near an edge lobe and animate via CSS keyframes
        const margin = 16;
        const forbid = {
          left: clamp(cardRect.left - wrapRect.left, 0, W),
          top: clamp(cardRect.top - wrapRect.top, 0, H),
          right: clamp(cardRect.right - wrapRect.left, 0, W),
          bottom: clamp(cardRect.bottom - wrapRect.top, 0, H),
        };
        const lobes = [];
        // top
        if (forbid.top - size - margin > margin)
          lobes.push({ xMin: margin, xMax: W - size - margin, yMin: margin, yMax: forbid.top - size - margin });
        // bottom
        if (H - forbid.bottom - size - margin > margin)
          lobes.push({ xMin: margin, xMax: W - size - margin, yMin: forbid.bottom + margin, yMax: H - size - margin });
        // left
        if (forbid.left - size - margin > margin) {
          const yMin = Math.min(Math.max(margin, hudRect.bottom + margin), H - size - margin);
          lobes.push({ xMin: margin, xMax: forbid.left - size - margin, yMin, yMax: H - size - margin });
        }
        // right
        if (W - forbid.right - size - margin > margin) {
          const yMin = Math.min(Math.max(margin, hudRect.bottom + margin), H - size - margin);
          lobes.push({ xMin: forbid.right + margin, xMax: W - size - margin, yMin, yMax: H - size - margin });
        }
        candidatePositions = [];
        for (let i = 0; i < 6; i++) {
          const R = pick(lobes); if (!R) break;
          const x = ri(R.xMin, Math.max(R.xMin, R.xMax));
          const y = ri(R.yMin, Math.max(R.yMin, R.yMax));
          candidatePositions.push({ x, y });
        }
        break;
      }
      case "shape": {
        el.className += " shape-distractor";
        // Random shape and color
        const shapes = ["circle", "square", "triangle"];
        const colors = ["#e57373", "#64b5f6", "#81c784", "#ffd54f", "#ba68c8", "#ff8a65"];
        const shape = pick(shapes);
        const color = pick(colors);
        const size = ri(40, 80);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.position = "absolute";
        el.style.background = "none";
        el.style.opacity = "0.85";
        el.style.pointerEvents = "none";
        // record intrinsic size for placement checks
        el._w = size; el._h = size;
        // SVG for shape
        let svg = "";
        if (shape === "circle") {
          svg = `<svg width='${size}' height='${size}'><circle cx='${size/2}' cy='${size/2}' r='${size/2-4}' fill='${color}' /></svg>`;
        } else if (shape === "square") {
          svg = `<svg width='${size}' height='${size}'><rect x='4' y='4' width='${size-8}' height='${size-8}' rx='12' fill='${color}' /></svg>`;
        } else if (shape === "triangle") {
          svg = `<svg width='${size}' height='${size}'><polygon points='${size/2},6 6,${size-6} ${size-6},${size-6}' fill='${color}' /></svg>`;
        }
        el.innerHTML = svg;
  // Define safe bands (left, right, top, bottom of card)
  const bands = [];
  const leftBand = { xMin: 20, xMax: Math.max(20, (cardRect.left - wrapRect.left) - 20 - size), yMin: hudRect.bottom + 12, yMax: H - size - 20 };
  const rightBand = { xMin: Math.min(W - size - 20, (cardRect.right - wrapRect.left) + 20), xMax: W - size - 20, yMin: hudRect.bottom + 12, yMax: H - size - 20 };
  const topBand = { xMin: 20, xMax: W - size - 20, yMin: 20, yMax: Math.max(20, (cardRect.top - wrapRect.top) - size - 20) };
  const bottomBand = { xMin: 20, xMax: W - size - 20, yMin: (cardRect.bottom - wrapRect.top) + 20, yMax: H - size - 20 };
        if (leftBand.xMax - leftBand.xMin > 20 && leftBand.yMax - leftBand.yMin > 20) bands.push(leftBand);
        if (rightBand.xMax - rightBand.xMin > 20 && rightBand.yMax - rightBand.yMin > 20) bands.push(rightBand);
  if (topBand.yMax - topBand.yMin > 20) bands.push(topBand);
  if (bottomBand.yMax - bottomBand.yMin > 20) bands.push(bottomBand);
        // pick a band
        el._band = bands.length ? pick(bands) : { xMin: 20, xMax: W - size - 20, yMin: hudRect.bottom + 12, yMax: H - size - 20 };
        // Seed candidate positions within the chosen band
        candidatePositions = [];
        for (let i = 0; i < 6; i++) {
          let x = ri(el._band.xMin, el._band.xMax);
          let y = ri(el._band.yMin, el._band.yMax);
          candidatePositions.push({x, y});
        }
        // After placement, animate movement within the same band avoiding overlaps
        el.classList.add('moving');
        el._moveShape = () => {
          let tries = 0;
          const curX = parseFloat(el.style.left || '0');
          const curY = parseFloat(el.style.top || '0');
          while (tries++ < 24) {
            const newX = ri(el._band.xMin, el._band.xMax);
            const newY = ri(el._band.yMin, el._band.yMax);
            // ensure a noticeable delta
            if (Math.abs(newX - curX) < 16 && Math.abs(newY - curY) < 16) continue;
            const rect = { left: newX, top: newY, right: newX + el._w, bottom: newY + el._h };
            // recompute active rects excluding self
            const others = Array.from(bgEl.querySelectorAll('.distractor')).filter(d => d !== el).map(d => {
              const rr = d.getBoundingClientRect();
              return { left: rr.left - wrapRect.left, top: rr.top - wrapRect.top, right: rr.right - wrapRect.left, bottom: rr.bottom - wrapRect.top };
            });
            if (forbiddenRects.some(f => overlaps(rect, f))) continue;
            if (others.some(a => overlaps(rect, a))) continue;
            // vary transition duration based on distance for natural flow
            const dx = Math.abs(newX - curX);
            const dy = Math.abs(newY - curY);
            const dist = Math.hypot(dx, dy);
            const ms = Math.round(400 + Math.min(1200, dist * 6)); // 0.4s to ~1.6s
            el.style.transitionDuration = `${ms}ms, ${ms}ms`;
            el.style.left = `${newX}px`;
            el.style.top = `${newY}px`;
            break;
          }
        };
        break;
      }
    }

  // Try to find a non-overlapping position
    let placed = false;
    let chosenPos = null;
    let chosenQuadrant = null;
    // Respect HUD for all types except falsecard
    const forbRects = type === "falsecard" ? [cardForbiddenRect] : forbiddenRects;
    for (const pos of candidatePositions) {
      // Estimate distractor rect
      const width = el._w || (el.classList.contains('notification') ? 280 : (type === 'screen' ? W : 0));
      const height = el._h || (el.classList.contains('notification') ? 80 : (type === 'screen' ? H : 0));
      const rect = {left:pos.x,top:pos.y,right:pos.x+width,bottom:pos.y+height};
      // Check forbidden zones
      if (forbRects.some(f => overlaps(rect, f))) continue;
      // Check active distractors
      if (activeRects.some(a => overlaps(rect, a))) continue;
      // Place here
      el.style.left = `${pos.x}px`;
      el.style.top = `${pos.y}px`;
      chosenPos = { x: pos.x, y: pos.y };
      // Compute a coarse quadrant relative to the card rect in wrap coordinates
      const cxL = cardRect.left - wrapRect.left;
      const cxR = cardRect.right - wrapRect.left;
      const cyT = cardRect.top - wrapRect.top;
      const cyB = cardRect.bottom - wrapRect.top;
      if (rect.bottom <= cyT) chosenQuadrant = 'top';
      else if (rect.top >= cyB) chosenQuadrant = 'bottom';
      else if (rect.right <= cxL) chosenQuadrant = 'left';
      else if (rect.left >= cxR) chosenQuadrant = 'right';
      else chosenQuadrant = 'around';
      placed = true;
      break;
    }
    // Fallback: try random safe positions allowing overlap with other distractors (but not with card/HUD)
    if (!placed) {
      const width = el._w || (el.classList.contains('notification') ? 280 : (type === 'screen' ? W : 0));
      const height = el._h || (el.classList.contains('notification') ? 80 : (type === 'screen' ? H : 0));
      let tries = 0;
      while (tries++ < 40 && !placed) {
        const x = ri(12, Math.max(12, W - width - 12));
        // If falsecard, allow spawning anywhere vertically (including HUD), otherwise avoid HUD
        const yMin = type === "falsecard" ? 12 : Math.max(12, hudRect.bottom + 8);
        const y = ri(yMin, Math.max(12, H - height - 12));
        const rect = {left:x, top:y, right:x+width, bottom:y+height};
        if (forbRects.some(f => overlaps(rect, f))) continue;
        // allow overlap with other distractors in fallback
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        chosenPos = { x, y };
        const cxL = cardRect.left - wrapRect.left;
        const cxR = cardRect.right - wrapRect.left;
        const cyT = cardRect.top - wrapRect.top;
        const cyB = cardRect.bottom - wrapRect.top;
        if (rect.bottom <= cyT) chosenQuadrant = 'top';
        else if (rect.top >= cyB) chosenQuadrant = 'bottom';
        else if (rect.right <= cxL) chosenQuadrant = 'left';
        else if (rect.left >= cxR) chosenQuadrant = 'right';
        else chosenQuadrant = 'around';
        placed = true;
      }
      if (!placed) return null;
    }

    bgEl.appendChild(el);

    // Determine effective duration (shorter for falsecard)
    let effDurMs = durMs;
    if (type === "falsecard" && Array.isArray(CFG.FALSECARD_DUR_MS)) {
      try { effDurMs = Math.round(r(...CFG.FALSECARD_DUR_MS)); } catch { /* keep durMs */ }
    }

    // Animate in/out with proper timing
    const startTimer = window.setTimeout(() => {
      el.style.opacity = type === "screen" ? "0.15" : "1";
      if (type === 'banner') {
        requestAnimationFrame(() => { el.classList.add('show'); });
      }
      if (type === 'ripple') {
        el.style.animation = `rippleExpand ${Math.max(600, Math.min(1400, effDurMs - 300))}ms ease-out forwards`;
      }
      // If shape, animate movement every ~1.2s, 2-3 times
      if (type === "shape") {
        // Recursive scheduler for natural cadence with random pauses
        const tEnd = performance.now() + effDurMs - 200; // stop a bit early for fade
        const scheduleMove = () => {
          if (performance.now() > tEnd) return;
          el._moveShape();
          const pause = ri(500, 1200); // random pause between moves
          const id = window.setTimeout(scheduleMove, pause);
          distractorTimers.current.push(id);
        };
        // Kick off soon after appear
        const firstId = window.setTimeout(scheduleMove, 80);
        distractorTimers.current.push(firstId);
      }
      const endTimer = window.setTimeout(() => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
      }, effDurMs);
      distractorTimers.current.push(endTimer);
    }, onsetMs);
    distractorTimers.current.push(startTimer);
    return { type: type, onset: onsetMs, duration: effDurMs, x: chosenPos?.x ?? null, y: chosenPos?.y ?? null, quadrant: chosenQuadrant };
  };

  const downloadCSV = ()=>{
    const rows = dataRef.current; if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const out = [cols.join(",")];
    rows.forEach((r)=>{
      out.push(cols.map(k=> (r[k]===null||r[k]===undefined)?"":String(r[k]).replace(/,/g,";")).join(","));
    });
    const blob = new Blob([out.join("\n")], {type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "cpt_trials.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const pct = (trialInBlock / CFG.TRIALS_PER_BLOCK) * 100;

  return (
    <div className="wrap" ref={wrapRef}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
  <div className="card" ref={cardRef}>

        {/* INTRO */}
        <div className={`stage ${stage==="intro"?"active":""}`}>
          <h1>Card CPT (Game)</h1>
          <p>Press <b>SPACE</b> when you see the card <b>{CFG.TARGET}</b>. Don’t press for any other card.</p>
            <div className="flex justify-center items-center">
              <Image src={CFG.LETTERSARRAY[CFG.LETTERS.indexOf(CFG.TARGET)]} alt={CFG.TARGET} width={200} height={250} />
            </div>
          <div className="row">
            <button onClick={startTask}>Start</button>
            <button onClick={()=>document.documentElement.requestFullscreen?.()}>Fullscreen</button>
          </div>
        </div>

        {/* GAME */}
        <div className={`stage ${stage==="game"?"active":""}`}>
          <div className="hud">
            <div>Block <b>{block}</b> / {CFG.BLOCKS}</div>
            <div>Trial <b>{trialInBlock}</b> / {CFG.TRIALS_PER_BLOCK}</div>
            <div className="row" style={{ gap: 8 }}>
              <span>Space:</span>
              <span className={`keylamp ${spaceFlash ? "on" : ""}`} />
            </div>
          </div>

          <div className="progress"><div className="bar" style={{ width: `${pct}%` }} /></div>

          <div
            className="arena"
            ref={arenaRef}
            tabIndex={0}
            onMouseDown={(e) => { e.currentTarget.focus(); }}
          >
            <div className="outer" ref={outerRef} />
            <div className="inner" ref={innerRef} />
            <div className="letter" ref={letterRef}>
              {letter && (
                <Image
                  src={CFG.LETTERSARRAY[CFG.LETTERS.indexOf(letter)]}
                  alt={letter}
                  width={300}
                  height={400}
                />
              )}
            </div>
          </div>
        </div>

        {/* BREAK */}
        <div className={`stage ${stage==="break"?"active":""}`}>
          <h2>Break</h2>
          <p>Click resume when you’re ready.</p>
          <div className="row">
            <button onClick={nextBlock}>Resume</button>
          </div>
        </div>

        {/* DONE */}
        <div className={`stage ${stage==="done"?"active":""}`}>
          <h2>All Done 🎉</h2>
          <Summary data={dataRef.current} />
          <div className="row" style={{marginTop:8}}>
            {embedded ? (
              <button onClick={() => onDone?.()}>Continue</button>
            ) : (
              <>
                <button onClick={downloadCSV}>Download CSV</button>
                <button onClick={()=>location.reload()}>Restart</button>
              </>
            )}
          </div>
        </div>

      </div>
      {/*here*/}
      <div className="distractor-layer" ref={bgRef} />
    </div>
  );
}

function Summary({ data }){
  const total = data.length;
  const hits = data.filter(d=>d.is_hit).length;
  const om   = data.filter(d=>d.is_omission).length;
  const fa   = data.filter(d=>d.is_commission).length;
  
  // Target and non-target counts
  const targetTrials = data.filter(d=>d.is_target).length;
  const nonTargetTrials = total - targetTrials;
  
  // Rates
  const hitRate = targetTrials > 0 ? (hits / targetTrials) : 0;
  const faRate = nonTargetTrials > 0 ? (fa / nonTargetTrials) : 0;
  const omRate = targetTrials > 0 ? (om / targetTrials) : 0;
  
  // Signal detection: d-prime and response bias (c)
  const hitRateAdj = Math.max(0.01, Math.min(0.99, hitRate)); // avoid 0/1
  const faRateAdj = Math.max(0.01, Math.min(0.99, faRate));
  const zHit = Math.sqrt(2) * erfinv(2 * hitRateAdj - 1);
  const zFA = Math.sqrt(2) * erfinv(2 * faRateAdj - 1);
  const dPrime = zHit - zFA;
  const responseBias = -(zHit + zFA) / 2;
  
  // RT metrics
  const rtHits = data.filter(d=>d.is_hit && Number.isFinite(d.response_time_ms)).map(d=>d.response_time_ms);
  const mean = rtHits.length ? rtHits.reduce((a,b)=>a+b,0)/rtHits.length : 0;
  const sd = rtHits.length > 1 ? Math.sqrt(rtHits.map(x => (x-mean)**2).reduce((a,b)=>a+b,0)/(rtHits.length-1)) : 0;
  const cv = mean > 0 ? sd / mean : 0;
  
  // RT percentiles
  const rtSorted = [...rtHits].sort((a,b)=>a-b);
  const median = rtSorted.length ? rtSorted[Math.floor(rtSorted.length/2)] : 0;
  const p90 = rtSorted.length ? rtSorted[Math.floor(rtSorted.length*0.9)] : 0;
  
  // Lapses (RT > 800ms)
  const lapses = rtHits.filter(rt => rt > 800).length;
  const lapseRate = rtHits.length > 0 ? lapses / rtHits.length : 0;
  
  // Anticipatory responses (RT < 200ms)
  const anticipatory = rtHits.filter(rt => rt < 200).length;
  
  // Distractor effects
  const withDistractor = data.filter(d=>d.has_distractor===1);
  const withoutDistractor = data.filter(d=>d.has_distractor===0);
  
  const hitsWithD = withDistractor.filter(d=>d.is_hit).length;
  const hitsWithoutD = withoutDistractor.filter(d=>d.is_hit).length;
  const targetsWithD = withDistractor.filter(d=>d.is_target).length;
  const targetsWithoutD = withoutDistractor.filter(d=>d.is_target).length;
  
  const hitRateWithD = targetsWithD > 0 ? hitsWithD / targetsWithD : 0;
  const hitRateWithoutD = targetsWithoutD > 0 ? hitsWithoutD / targetsWithoutD : 0;
  
  const rtWithD = withDistractor.filter(d=>d.is_hit && Number.isFinite(d.response_time_ms)).map(d=>d.response_time_ms);
  const rtWithoutD = withoutDistractor.filter(d=>d.is_hit && Number.isFinite(d.response_time_ms)).map(d=>d.response_time_ms);
  const meanRtWithD = rtWithD.length ? rtWithD.reduce((a,b)=>a+b,0)/rtWithD.length : 0;
  const meanRtWithoutD = rtWithoutD.length ? rtWithoutD.reduce((a,b)=>a+b,0)/rtWithoutD.length : 0;
  
  // Block-level trends
  const blocks = [...new Set(data.map(d=>d.block_index))].sort((a,b)=>a-b);
  const blockStats = blocks.map(b => {
    const blockData = data.filter(d=>d.block_index===b);
    const bHits = blockData.filter(d=>d.is_hit).length;
    const bTargets = blockData.filter(d=>d.is_target).length;
    const bHitRate = bTargets > 0 ? bHits/bTargets : 0;
    const bRtHits = blockData.filter(d=>d.is_hit && Number.isFinite(d.response_time_ms)).map(d=>d.response_time_ms);
    const bMeanRt = bRtHits.length ? bRtHits.reduce((a,b)=>a+b,0)/bRtHits.length : 0;
    return { block: b, hitRate: bHitRate, meanRt: bMeanRt };
  });
  
  // Helper for inverse error function (approximation)
  function erfinv(x) {
    const a = 0.147;
    const b = 2/(Math.PI * a) + Math.log(1-x*x)/2;
    const sqrt1 = Math.sqrt(b*b - Math.log(1-x*x)/a);
    const sqrt2 = Math.sqrt(sqrt1 - b);
    return Math.sign(x) * sqrt2;
  }
  
  return (
    <div className="summary">
      <h3 style={{gridColumn:'1/-1',margin:'0 0 8px',fontSize:'16px',color:'#e8eaed'}}>Performance Summary</h3>
      
      <div style={{gridColumn:'1/-1',borderBottom:'1px solid #2b3036',margin:'4px 0'}}/>
      <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:'13px',color:'#9aa0a6'}}>Overall Metrics</div>
      
      <div>Total trials: <b>{total}</b></div>
      <div>Hits: <b>{hits}</b> ({(hitRate*100).toFixed(1)}%)</div>
      <div>Omissions: <b>{om}</b> ({(omRate*100).toFixed(1)}%)</div>
      <div>Commissions (FA): <b>{fa}</b> ({(faRate*100).toFixed(1)}%)</div>
      
      <div style={{gridColumn:'1/-1',borderBottom:'1px solid #2b3036',margin:'4px 0'}}/>
      <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:'13px',color:'#9aa0a6'}}>Signal Detection</div>
      
      <div>d-prime (d'): <b>{dPrime.toFixed(2)}</b></div>
      <div>Response bias (c): <b>{responseBias.toFixed(2)}</b></div>
      
      <div style={{gridColumn:'1/-1',borderBottom:'1px solid #2b3036',margin:'4px 0'}}/>
      <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:'13px',color:'#9aa0a6'}}>Response Time (Hits)</div>
      
      <div>Mean RT: <b>{Math.round(mean)} ms</b></div>
      <div>SD: <b>{Math.round(sd)} ms</b></div>
      <div>Median RT: <b>{Math.round(median)} ms</b></div>
      <div>90th percentile: <b>{Math.round(p90)} ms</b></div>
      <div>Coefficient of variation: <b>{cv.toFixed(2)}</b></div>
      <div>Lapses (RT&gt;800ms): <b>{lapses}</b> ({(lapseRate*100).toFixed(1)}%)</div>
      <div>Anticipatory (RT&lt;200ms): <b>{anticipatory}</b></div>
      
      <div style={{gridColumn:'1/-1',borderBottom:'1px solid #2b3036',margin:'4px 0'}}/>
      <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:'13px',color:'#9aa0a6'}}>Distractor Effects</div>
      
      <div>Trials with distractor: <b>{withDistractor.length}</b></div>
      <div>Trials without distractor: <b>{withoutDistractor.length}</b></div>
      <div>Hit rate (with distractor): <b>{(hitRateWithD*100).toFixed(1)}%</b></div>
      <div>Hit rate (no distractor): <b>{(hitRateWithoutD*100).toFixed(1)}%</b></div>
      <div>Mean RT (with distractor): <b>{Math.round(meanRtWithD)} ms</b></div>
      <div>Mean RT (no distractor): <b>{Math.round(meanRtWithoutD)} ms</b></div>
      
      <div style={{gridColumn:'1/-1',borderBottom:'1px solid #2b3036',margin:'4px 0'}}/>
      <div style={{gridColumn:'1/-1',fontWeight:600,fontSize:'13px',color:'#9aa0a6'}}>Block-Level Trends</div>
      
      {blockStats.map(bs => (
        <React.Fragment key={bs.block}>
          <div>Block {bs.block} hit rate: <b>{(bs.hitRate*100).toFixed(1)}%</b></div>
          <div>Block {bs.block} mean RT: <b>{Math.round(bs.meanRt)} ms</b></div>
        </React.Fragment>
      ))}
    </div>
  );
}