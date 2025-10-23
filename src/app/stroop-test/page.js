"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ================= THEME (dark purple) ================= */
const TEXT = "#EDE9FE", MUTED = "#C4B5FD";
const BG_START = "#0B021A", BG_END = "#1B0B3A";
const CARD_BG = "#120A24", CARD_BD = "#2A1B4D";
const ACCENT = "#7C3AED", ACCENT_SOFT = "#A78BFA";

/** ================= PROTOCOL CONSTANTS ================= */
const TRIALS_PER_TASK = 23;
const CALIBRATION_WINDOW_MS = 1000;
const CIRCLE_JITTER_INTERVAL_MS = 40;
const JITTER_PX = 12;

/** ================= COLORS ================= */
const INK = {
  RED: "#ef4444",
  GREEN: "#16a34a",
  BLUE: "#2563eb",
  YELLOW: "#f59e0b",
  ORANGE: "#f97316",
  PURPLE: "#7c3aed",
  PINK: "#ec4899",
};
const COLOR_KEYS = Object.keys(INK);

/** ================= BASIC UI ================= */
const Page = ({ children }) => (
  <div style={{minHeight:"100vh",padding:24,background:`linear-gradient(135deg,${BG_START} 0%,${BG_END} 100%)`,color:TEXT,fontFamily:"Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"}}>
    <div style={{maxWidth:980,margin:"0 auto"}}>{children}</div>
  </div>
);
const Card = ({ title, subtitle, children }) => (
  <div style={{border:`1px solid ${CARD_BD}`,background:CARD_BG,borderRadius:20,padding:22,boxShadow:"0 14px 40px rgba(0,0,0,0.35)",marginBottom:18}}>
    {title && (
      <div style={{display:"flex",alignItems:"baseline",gap:10}}>
        <div style={{width:10,height:10,borderRadius:999,background:`linear-gradient(135deg,${ACCENT} 0%,${ACCENT_SOFT} 100%)`,boxShadow:"0 0 10px rgba(124,58,237,0.65)"}}/>
        <div style={{fontSize:18,fontWeight:800,letterSpacing:0.2}}>{title}</div>
      </div>
    )}
    {subtitle && <div style={{fontSize:13,color:MUTED,marginTop:6}}>{subtitle}</div>}
    <div style={{marginTop:14}}>{children}</div>
  </div>
);
const Button = ({ children, onClick, kind="primary", full, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    width: full?"100%":undefined,padding:"12px 16px",borderRadius:14,
    border: kind==="secondary"?`1px solid ${CARD_BD}`:`1px solid ${ACCENT}`,
    background: kind==="secondary"?"rgba(255,255,255,0.05)":`linear-gradient(135deg,${ACCENT} 0%,${ACCENT_SOFT} 100%)`,
    color: kind==="secondary"?TEXT:"#0b021a",fontWeight:800,letterSpacing:0.3,cursor:disabled?"not-allowed":"pointer",
    opacity:disabled?0.6:1,boxShadow:kind==="secondary"?"inset 0 0 0 1px rgba(255,255,255,0.06)":"0 12px 30px rgba(124,58,237,0.35)"
  }}>{children}</button>
);
const Pill = ({ children }) => (
  <span style={{display:"inline-block",padding:"5px 10px",borderRadius:999,background:"rgba(167,139,250,0.15)",border:`1px solid ${CARD_BD}`,color:ACCENT_SOFT,fontSize:12,fontWeight:900,letterSpacing:0.3}}>
    {children}
  </span>
);
const BigTimer = ({ seconds }) => {
  const m = Math.floor(seconds/60), s = String(seconds%60).padStart(2,"0");
  return <div style={{fontSize:"3.0rem",fontWeight:300,color:TEXT,textAlign:"center",margin:"6px 0 10px",fontVariantNumeric:"tabular-nums",textShadow:"0 2px 12px rgba(0,0,0,0.35)"}}>{m}:{s}</div>;
};

/** ================= HELPERS ================= */
const shuffled = (a) => { const x=[...a]; for(let i=x.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [x[i],x[j]]=[x[j],x[i]];} return x; };
function buildSequenceNoAdjacent(labels,n){
  const base=Math.floor(n/labels.length); let rem=n%labels.length;
  const counts=Object.fromEntries(labels.map(k=>[k,base])); const fair=shuffled(labels); for(let i=0;i<rem;i++) counts[fair[i]]++;
  const seq=[]; while(seq.length<n){ const opts=labels.filter(k=>counts[k]>0 && k!==seq[seq.length-1]); const pool=opts.length?opts:labels.filter(k=>counts[k]>0);
    pool.sort((a,b)=>counts[b]-counts[a]); const top=pool.filter(z=>counts[z]===counts[pool[0]]); const pick=top[Math.floor(Math.random()*top.length)]; counts[pick]--; seq.push(pick); }
  return seq;
}
function buildIncongruentTrials(n){
  const all=[]; for(const w of COLOR_KEYS) for(const ink of COLOR_KEYS) if(w!==ink) all.push({word:w,ink});
  const out=[]; let lastInk=null,lastKey=null;
  while(out.length<n){ const opts=shuffled(all).filter(p=>p.ink!==lastInk && `${p.word}-${p.ink}`!==lastKey); const pick=opts[0]??shuffled(all)[0]; out.push(pick); lastInk=pick.ink; lastKey=`${pick.word}-${pick.ink}`; }
  return out;
}
const toISO = (ms)=>new Date(ms).toISOString();

/** ================= SESSION AUDIO RECORDER ================= */
class SessionRecorder {
  constructor(){
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
    this.rafId = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.mimeType = "audio/webm";
    this.rmsListeners = new Set();
  }

  async start(){
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 48000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    });

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4"
    ];
    for(const c of candidates){
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(c)) {
        this.mimeType = c; break;
      }
    }

    this.mediaRecorder = new MediaRecorder(this.stream, { 
      mimeType: this.mimeType,
      audioBitsPerSecond: 128000
    });
    this.chunks = [];
    this.mediaRecorder.ondataavailable = (e) => { 
      if(e.data && e.data.size>0) this.chunks.push(e.data); 
    };

    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.3;
    source.connect(this.analyser);

    this.mediaRecorder.start(100);

    const buf = new Float32Array(this.analyser.fftSize);
    const sampleRate = this.ctx.sampleRate;
    const frameDurMs = (this.analyser.fftSize / sampleRate) * 1000;

    const pump = () => {
      if(!this.analyser) return;
      this.analyser.getFloatTimeDomainData(buf);
      let sum = 0, peak = 0;
      for(let i=0;i<buf.length;i++){ 
        const v = buf[i]; 
        sum += v*v; 
        const a = Math.abs(v); 
        if(a>peak) peak=a; 
      }
      const rms = Math.sqrt(sum / buf.length);
      for(const cb of this.rmsListeners) cb({ rms, peak, durationMs: frameDurMs });
      this.rafId = requestAnimationFrame(pump);
    };
    this.rafId = requestAnimationFrame(pump);
  }

  onRms(cb){ this.rmsListeners.add(cb); return ()=>this.rmsListeners.delete(cb); }

  async stop(){
    if(!this.mediaRecorder || !this.stream) return null;

    if(this.rafId!=null) cancelAnimationFrame(this.rafId);
    this.rafId = null;

    const rec = this.mediaRecorder;
    const done = new Promise((resolve)=>{
      rec.onstop = () => resolve(new Blob(this.chunks, { type: this.mimeType }));
    });
    if(rec.state !== "inactive") rec.stop();

    try{ this.stream.getTracks().forEach(t=>t.stop()); }catch{}
    this.stream = null;

    try{ await this.ctx?.close(); }catch{}
    this.ctx = null; this.analyser = null;

    return await done;
  }

  getExtension(){
    return this.mimeType.includes("webm") ? "webm" : "mp4";
  }
}

/** ================= CSV EXPORT HELPER ================= */
const esc=(v)=>{ const s=String(v??""); return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
function exportCSV(filename, rows, descriptions){
  if(!rows.length) return;
  const cols=Object.keys(rows[0]);
  const header=cols.join(",");
  const descRow=cols.map(c=>esc(descriptions[c]??"")).join(",");
  const data=rows.map(r=>cols.map(c=>esc(r[c])).join(",")).join("\r\n");
  const csv="\uFEFF"+header+"\r\n"+descRow+"\r\n"+data;
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}), url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),0);
}

/** ================= SESSION AUDIO HOOK ================= */
function useSessionAudio(){
  const recRef = useRef(null);
  const getRecorder = useCallback(async ()=>{
    if(!recRef.current){ const mr=new SessionRecorder(); await mr.start(); recRef.current=mr; }
    return recRef.current;
  },[]);
  const stopAndGetAudio = useCallback(async ()=>{
    if(!recRef.current) return null;
    const blob = await recRef.current.stop(); recRef.current=null; return blob;
  },[]);
  const hasActive = useCallback(()=>!!recRef.current,[]);
  const getExtension = useCallback(()=>{
    return recRef.current ? recRef.current.getExtension() : "webm";
  },[]);
  return { getRecorder, stopAndGetAudio, hasActive, getExtension };
}

/** ================= TASK ENGINE ================= */
function useTaskEngine({ part, totalTrials, getRecorder, onRow, expectedStimulus }){
  const [idx,setIdx]=useState(-1), [calibrating,setCalibrating]=useState(false), [seconds,setSeconds]=useState(0);
  const timerRef=useRef(null);
  const stimStartRef=useRef(null), voiceOnsetMsRef=useRef(null), speakingBeforeStimRef=useRef(false);
  const baselineRef=useRef({mean:0,std:0,thresh:0.02}), movingMeanRef=useRef(0), alpha=0.1;
  const trialStartPerfRef=useRef(null), trialBurstsRef=useRef(0), prevVoicedRef=useRef(false);
  const unsubRef=useRef(()=>{});

  const resetAcc=()=>{ 
    trialBurstsRef.current=0; prevVoicedRef.current=false; 
  };

  const start = useCallback(async ()=>{
    const mr = await getRecorder();
    
    setSeconds(0); clearInterval(timerRef.current); timerRef.current=setInterval(()=>setSeconds(s=>s+1),1000);

    // Calibration
    setCalibrating(true);
    const samples=[]; const unsub=mr.onRms(({rms})=>samples.push(rms));
    const t0=performance.now(); while(performance.now()-t0<CALIBRATION_WINDOW_MS){ await new Promise(r=>setTimeout(r,50)); }
    unsub();
    
    const mean=samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length);
    const varc=samples.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,samples.length);
    const std=Math.sqrt(varc);
    const thresh=Math.max(0.01, Math.min(0.06, mean+4*std));
    baselineRef.current={mean,std,thresh}; movingMeanRef.current=mean; setCalibrating(false);

    setIdx(0);
  },[getRecorder]);

  const markStimShown = useCallback(async ()=>{
    const mr = await getRecorder();
    
    stimStartRef.current=performance.now(); 
    trialStartPerfRef.current=stimStartRef.current;
    voiceOnsetMsRef.current=null; 
    speakingBeforeStimRef.current=false; 
    resetAcc();

    unsubRef.current = mr.onRms(({rms,durationMs})=>{
      movingMeanRef.current=(1-alpha)*movingMeanRef.current+alpha*rms;

      const voiced = rms>baselineRef.current.thresh || movingMeanRef.current>baselineRef.current.thresh;
      
      if(stimStartRef.current==null){ 
        if(voiced) speakingBeforeStimRef.current=true; 
      }
      else{
        if(voiceOnsetMsRef.current==null && voiced){ 
          voiceOnsetMsRef.current=performance.now()-stimStartRef.current; 
          trialBurstsRef.current+=1; 
          prevVoicedRef.current=true; 
        }
        else if(voiced){ 
          if(!prevVoicedRef.current){ 
            trialBurstsRef.current+=1; 
            prevVoicedRef.current=true; 
          } 
        }
        else { 
          prevVoicedRef.current=false; 
        }
      }
    });
  },[getRecorder]);

  useEffect(()=>{
    if(idx<0 || idx>=totalTrials) return;
    
    const onKey=async (e)=>{
      if(e.key===" "){
        e.preventDefault();
        
        const now=performance.now();
        const trialDur=Math.round(now-(trialStartPerfRef.current??now));
        const timestampISO = new Date().toISOString();
        
        try{ unsubRef.current(); }catch{}
        
        const stimulus = expectedStimulus ? expectedStimulus(idx) : "";
        
        const baseRow={
          "task":part, 
          "trial_number": idx + 1,
          "timestamp_iso":timestampISO,
          "stimulus_shown": stimulus,
          "voice_onset_rt_ms": voiceOnsetMsRef.current ?? "",
          "response_duration_ms":trialDur,
          "speech_bursts": trialBurstsRef.current,
        };
        
        onRow?.(baseRow);
        
        if(idx+1>=totalTrials){ 
          setIdx(totalTrials);
        } else {
          setIdx(n=>n+1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[idx,totalTrials,part,onRow,expectedStimulus]);

  useEffect(()=>()=>{ 
    clearInterval(timerRef.current); 
    try{ unsubRef.current(); }catch{} 
  },[]);

  return { idx,start,markStimShown,calibrating,seconds };
}

/** ================= INSTRUCTIONS ================= */
const Instructions = () => (
  <div style={{background:"rgba(255,255,255,0.06)",padding:"12px 14px",borderRadius:14,borderLeft:`4px solid ${ACCENT_SOFT}`}}>
    <div style={{fontSize:13,color:MUTED,lineHeight:1.7}}>
      <div><b>Instructions</b></div>
      <div>• Answer out loud, then press <b>SPACE</b> to advance</div>
      <div>• Allow microphone permission when prompted</div>
      <div>• Speak clearly in a quiet environment</div>
      <div>• Session is recorded for analysis</div>
    </div>
  </div>
);

/** ================= TASKS ================= */
function TaskReading({ onDone, collect, getRecorder }){
  const words=useMemo(()=>buildSequenceNoAdjacent(COLOR_KEYS, TRIALS_PER_TASK),[]);
  const stimRef=useRef(null);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ 
    part:"Reading", 
    totalTrials:TRIALS_PER_TASK,
    getRecorder,
    expectedStimulus: (i) => words[Math.min(i, words.length-1)],
    onRow:(base)=>{ 
      collect?.(base);
    }
  });
  const current=idx>=0 && idx<TRIALS_PER_TASK?words[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  return (
    <Card title="Task 1 — Baseline Reading" subtitle="Say the printed word (black ink). Press SPACE to advance.">
      {idx<0 && (
        <div style={{display:"grid",gap:12}}>
          <Instructions/>
          <Button onClick={start}>Start Task 1</Button>
          {calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}
        </div>
      )}
      {current && !done && (
        <div style={{display:"grid",gap:10}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill>
          </div>
          <div style={{background:"#fafafa",border:"1px solid #eaeaea",borderRadius:14,padding:32}}>
            <div ref={stimRef} style={{fontSize:72,fontFamily:"Times New Roman, serif",color:"#000",lineHeight:1,userSelect:"none",textAlign:"center"}}>
              {current}
            </div>
          </div>
          <div style={{color:MUTED,fontSize:12,textAlign:"center"}}>Speak, then press SPACE.</div>
        </div>
      )}
      {done && (<div style={{display:"grid",gap:10,marginTop:8}}><Button onClick={onDone} full>Next Task →</Button></div>)}
    </Card>
  );
}

function TaskNaming({ onDone, collect, getRecorder }){
  const colors=useMemo(()=>buildSequenceNoAdjacent(COLOR_KEYS, TRIALS_PER_TASK),[]);
  const stimRef=useRef(null);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ 
    part:"Naming", 
    totalTrials:TRIALS_PER_TASK,
    getRecorder,
    expectedStimulus: (i) => `${colors[Math.min(i, colors.length-1)]}_circle`,
    onRow:(base)=>{ 
      collect?.(base);
    }
  });
  const current=idx>=0 && idx<TRIALS_PER_TASK?colors[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  const [jitter,setJitter]=useState({x:0,y:0});
  useEffect(()=>{
    if(!(current && !done)) return;
    let t=null;
    const tick=()=>{ setJitter({ x: (Math.random()*2-1)*JITTER_PX, y: (Math.random()*2-1)*JITTER_PX }); };
    t=setInterval(tick, CIRCLE_JITTER_INTERVAL_MS);
    tick();
    return ()=>clearInterval(t);
  },[current,done]);

  return (
    <Card title="Task 2 — Baseline Naming" subtitle="Name the circle's color. Press SPACE to advance.">
      {idx<0 && (
        <div style={{display:"grid",gap:12}}>
          <Instructions/>
          <Button onClick={start}>Start Task 2</Button>
          {calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}
        </div>
      )}
      {current && !done && (
        <div style={{display:"grid",gap:10,placeItems:"center"}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}>
            <Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill>
          </div>
          <div style={{width:300,height:300,position:"relative"}}>
            <div
              ref={stimRef}
              style={{
                width:260,height:260,borderRadius:"50%",background:INK[current],
                position:"absolute",left:"50%",top:"50%",
                transform:`translate(-50%, -50%) translate(${jitter.x}px, ${jitter.y}px)`,
                boxShadow:"0 24px 60px rgba(0,0,0,0.35)"
              }}
            />
          </div>
          <div style={{color:MUTED,fontSize:12,textAlign:"center"}}>Speak, then press SPACE.</div>
        </div>
      )}
      {done && (<div style={{display:"grid",gap:10,marginTop:8}}><Button onClick={onDone} full>Next Task →</Button></div>)}
    </Card>
  );
}

function TaskIncongruent({ onDone, collect, getRecorder }){
  const trials=useMemo(()=>buildIncongruentTrials(TRIALS_PER_TASK),[]);
  const stimRef=useRef(null);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ 
    part:"Incongruent", 
    totalTrials:TRIALS_PER_TASK,
    getRecorder,
    expectedStimulus: (i) => {
      const trial = trials[Math.min(i, trials.length-1)];
      return trial ? trial.ink : "";
    },
    onRow:(base)=>{ 
      collect?.(base);
    }
  });
  const current=idx>=0 && idx<TRIALS_PER_TASK?trials[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  return (
    <Card title="Task 3 — Incongruent" subtitle="Name the INK color (ignore the word). Press SPACE to advance.">
      {idx<0 && (
        <div style={{display:"grid",gap:12}}>
          <Instructions/>
          <Button onClick={start}>Start Task 3</Button>
          {calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}
        </div>
      )}
      {current && !done && (
        <div style={{display:"grid",gap:10}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill>
          </div>
          {/* DARK MODE BACKGROUND FOR INCONGRUENT TASK */}
          <div style={{background:"#1a1a1a",border:"1px solid #333",borderRadius:14,padding:32}}>
            <div ref={stimRef} style={{fontSize:72,fontFamily:"Times New Roman, serif",color:INK[current.ink],lineHeight:1,userSelect:"none",textAlign:"center"}}>
              {current.word}
            </div>
          </div>
          <div style={{color:MUTED,fontSize:12,textAlign:"center"}}>Speak, then press SPACE.</div>
        </div>
      )}
      {done && (
        <div style={{display:"grid",gap:10,marginTop:8}}>
          <div style={{display:"grid",placeItems:"center",gap:6,padding:"18px 0"}}>
            <div style={{fontSize:"3.0rem",color:"#48bb78"}}>✓</div>
            <div style={{fontWeight:800}}>All tasks complete</div>
          </div>
          <Button onClick={onDone} full>Proceed to Export</Button>
        </div>
      )}
    </Card>
  );
}

/** ================= NAV ================= */
function StepNav({ step, setStep, completedTasks }){
  const Item=({n,label})=>{
    const isCompleted = completedTasks.includes(n);
    const isAccessible = n === 1 || completedTasks.includes(n-1);
    const isCurrent = step === n;
    
    return (
      <button 
        onClick={()=>isAccessible && setStep(n)} 
        disabled={!isAccessible}
        style={{
          display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:999,border:`1px solid ${CARD_BD}`,
          background: isCurrent?`linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`:"rgba(255,255,255,0.05)",
          color: isCurrent?"#0b021a":isAccessible?TEXT:"#666",
          fontWeight:900,letterSpacing:0.3,
          cursor:isAccessible?"pointer":"not-allowed",
          opacity: isAccessible?1:0.5
        }}>
        <span style={{
          width:22,height:22,borderRadius:999,
          background: isCurrent?"rgba(0,0,0,0.15)":isCompleted?"rgba(72,187,120,0.3)":"rgba(167,139,250,0.2)",
          display:"grid",placeItems:"center",fontSize:12
        }}>
          {isCompleted?"✓":n}
        </span>
        {label}
      </button>
    );
  };
  return <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Item n={1} label="Task 1: Reading"/><Item n={2} label="Task 2: Naming"/><Item n={3} label="Task 3: Incongruent"/></div>;
}

/** ================= PAGE ================= */
export default function StroopTestPage(){
  const [step,setStep]=useState(1);
  const [rows,setRows]=useState([]);
  const [sessionBlob,setSessionBlob]=useState(null);
  const [completedTasks, setCompletedTasks] = useState([]);
  const { getRecorder, stopAndGetAudio, hasActive, getExtension } = useSessionAudio();

  const collect = useCallback((row)=>{
    setRows(r=>[...r,row]);
  },[]);

  const handleTaskComplete = useCallback((taskNum) => {
    setCompletedTasks(prev => {
      if(!prev.includes(taskNum)) return [...prev, taskNum];
      return prev;
    });
  },[]);

  const CSV_KEYS = [
    "task",
    "trial_number",
    "timestamp_iso",
    "stimulus_shown",
    "voice_onset_rt_ms",
    "response_duration_ms",
    "speech_bursts",
  ];
  
  const CSV_DESCRIPTIONS = {
    "task": "Task name: Reading / Naming / Incongruent",
    "trial_number": "Trial number (1-23 per task)",
    "timestamp_iso": "ISO 8601 timestamp when stimulus appeared (UTC)",
    "stimulus_shown": "What was displayed (e.g., RED or BLUE_circle)",
    "voice_onset_rt_ms": "Voice-Onset Reaction Time - Time from stimulus onset to first speech detected (milliseconds) - Primary measure of cognitive processing speed and attention",
    "response_duration_ms": "Total trial time from stimulus to SPACE press (milliseconds)",
    "speech_bursts": "Number of speech starts - hesitations/self-corrections (impulsivity indicator)",
  };

  const handleDownloadCSV = ()=>{
    if(!rows.length) return;
    const cleaned = rows.map(r=>{
      const out={};
      CSV_KEYS.forEach(k=>{ out[k]= r[k] ?? ""; });
      return out;
    });
    exportCSV("stroop_results.csv", cleaned, CSV_DESCRIPTIONS);
  };

  const downloadSessionAudio = async ()=>{
    let blob = sessionBlob;
    if(!blob){ blob = await stopAndGetAudio(); setSessionBlob(blob); }
    if(!blob) return;
    const ext = getExtension();
    const url=URL.createObjectURL(blob); 
    const a=document.createElement("a");
    a.href=url; 
    a.download=`stroop_session_audio.${ext}`; 
    document.body.appendChild(a); 
    a.click(); 
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  };

  return (
    <Page>
      <div style={{marginBottom:18}}>
        <h1 style={{margin:0,fontSize:30,letterSpacing:0.3}}>Stroop Test — Speech Analysis</h1>
        <div style={{color:MUTED,fontSize:13,marginTop:6}}>
          Speak your answer, then press <b>SPACE</b>. All timing metrics are in <b>milliseconds (ms)</b>.
        </div>
        <div style={{marginTop:12}}><StepNav step={step} setStep={setStep} completedTasks={completedTasks}/></div>
      </div>

      {step===1 && (
        <TaskReading
          collect={collect}
          getRecorder={getRecorder}
          onDone={()=>{handleTaskComplete(1); setStep(2);}}
        />
      )}

      {step===2 && (
        <TaskNaming
          collect={collect}
          getRecorder={getRecorder}
          onDone={()=>{handleTaskComplete(2); setStep(3);}}
        />
      )}

      {step===3 && (
        <TaskIncongruent
          collect={collect}
          getRecorder={getRecorder}
          onDone={()=>{handleTaskComplete(3); setStep(4);}}
        />
      )}

      {step>=4 && (
        <Card title="Export Results" subtitle="Download your data for research analysis.">
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Button onClick={handleDownloadCSV} disabled={!rows.length}>
              Download CSV Results ({rows.length} trials)
            </Button>
            <Button kind="secondary" onClick={downloadSessionAudio} disabled={!hasActive() && !sessionBlob}>
              Download Session Audio
            </Button>
          </div>
          <div style={{color:MUTED,fontSize:12,marginTop:12,lineHeight:1.6}}>
            <div><b>CSV includes 7 columns:</b></div>
            <div>• <b>voice_onset_rt_ms</b> - Voice-Onset Reaction Time: Primary measure of cognitive processing speed (milliseconds)</div>
            <div>• <b>response_duration_ms</b> - Total trial time (milliseconds)</div>
            <div>• <b>speech_bursts</b> - Impulsivity indicator: hesitations/self-corrections</div>
            <div>• <b>timestamp_iso</b> - Exact UTC time when stimulus appeared</div>
            <div style={{marginTop:8}}><b>Audio:</b> High-quality recording of entire session with echo cancellation and noise suppression.</div>
          </div>
        </Card>
      )}
    </Page>
  );
}