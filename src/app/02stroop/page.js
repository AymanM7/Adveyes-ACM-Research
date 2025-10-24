"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ================= THEME (dark purple) ================= */
const TEXT = "#f7f8fb", MUTED = "#9aa0a6";
const BG_START = "#0e0e10", BG_END = "#0b0c0f";
const CARD_BG = "#16171a", CARD_BD = "#1e2126";
const ACCENT = "#4b8cf5", ACCENT_SOFT = "#72a2f7";

/** ================= PROTOCOL CONSTANTS ================= */
const TRIALS_PER_TASK = 23;
const AUDIO_SAMPLE_RATE_HZ = 22050;     // low CPU, speech-grade
const AUDIO_FRAME_SIZE = 4096;
const CALIBRATION_WINDOW_MS = 1000;
const CIRCLE_JITTER_INTERVAL_MS = 40;   // Task 2 movement step
const JITTER_PX = 12;                   // ± amplitude (small)

/** ================= COLORS (common only) ================= */
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
const BigTimer = ({ seconds }) => null; // Hidden per unified spec

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
const tzOffsetMin = new Date().getTimezoneOffset();
const toISO = (ms)=>new Date(ms).toISOString();

/** ================= MONO WAV RECORDER (session-level) ================= */
class MicRecorder {
  constructor(){ this.ctx=null; this.processor=null; this.source=null; this.stream=null;
    this.sampleRate=AUDIO_SAMPLE_RATE_HZ; this.frameSize=AUDIO_FRAME_SIZE; this.chunks=[]; this.rmsListeners=new Set(); this._onAudioProcess=this._onAudioProcess.bind(this); }
  async start(){
    this.stream = await navigator.mediaDevices.getUserMedia({ audio:{ channelCount:1, echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
    const AC = (window.AudioContext||window.webkitAudioContext);
    this.ctx = new AC({latencyHint:'interactive' });
    this.sampleRate=this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(this.frameSize,1,1);
    this.source.connect(this.processor);
    const silent=this.ctx.createGain(); silent.gain.value=0; this.processor.connect(silent); silent.connect(this.ctx.destination);
    this.processor.addEventListener("audioprocess", this._onAudioProcess);
  }
  _onAudioProcess(e){
    const input=e.inputBuffer.getChannelData(0);
    const copy=new Float32Array(input.length); copy.set(input); this.chunks.push(copy);
    let sum=0, peak=0; for(let i=0;i<input.length;i++){ const v=input[i]; sum+=v*v; const a=Math.abs(v); if(a>peak) peak=a; }
    const rms=Math.sqrt(sum/input.length), durationMs=1000*input.length/this.sampleRate;
    for(const cb of this.rmsListeners) cb({rms,peak,durationMs});
  }
  onRms(cb){ this.rmsListeners.add(cb); return ()=>this.rmsListeners.delete(cb); }
  async stop(){
    if(!this.ctx) return null;
    this.processor.removeEventListener("audioprocess", this._onAudioProcess);
    try{ this.processor.disconnect(); }catch{}
    try{ this.source.disconnect(); }catch{}
    try{ this.stream.getTracks().forEach(t=>t.stop()); }catch{}
    const wav = encodeWavMono(this.chunks, this.sampleRate); this.chunks=[];
    try{ await this.ctx.close(); }catch{} this.ctx=null; return wav;
  }
}
function encodeWavMono(float32Chunks, sampleRate){
  let len=0; for(const c of float32Chunks) len+=c.length;
  const data=new Float32Array(len); let off=0; for(const c of float32Chunks){ data.set(c,off); off+=c.length; }
  const bytesPerSample=2, blockAlign=bytesPerSample, buf=new ArrayBuffer(44+data.length*bytesPerSample), view=new DataView(buf);
  ws(view,0,"RIFF"); view.setUint32(4,36+data.length*bytesPerSample,true); ws(view,8,"WAVE"); ws(view,12,"fmt "); view.setUint32(16,16,true);
  view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*blockAlign,true);
  view.setUint16(32,blockAlign,true); view.setUint16(34,16,true); ws(view,36,"data"); view.setUint32(40,data.length*bytesPerSample,true);
  let i=44; for(let k=0;k<data.length;k++,i+=2){ const s=Math.max(-1,Math.min(1,data[k])); view.setInt16(i, s<0?s*0x8000:s*0x7fff, true); }
  return new Blob([view.buffer],{type:"audio/wav"});
}
function ws(view,offset,str){ for(let i=0;i<str.length;i++) view.setUint8(offset+i, str.charCodeAt(i)); }

/** ================= CSV (compact, key metrics only) ================= */
const esc=(v)=>{ const s=String(v??""); return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
function downloadCSV(filename, rows, descriptions){
  if(!rows.length) return;
  const cols=Object.keys(rows[0]);
  const header=cols.join(",");
  const descRow=cols.map(c=>esc(descriptions[c]??"")).join(",");
  const data=rows.map(r=>cols.map(c=>esc(r[c])).join(",")).join("\r\n");
  const csv="\uFEFF"+header+"\r\n"+descRow+"\r\n"+data;
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"}), url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),0);
}

/** ================= WEBCAM GAZE (no overlays) w/ pointer fallback ================= */
function useWebcamGaze(stimRef){
  // Eye tracking disabled in outputs per unified spec. Keep no-op to avoid refactor churn.
  return useCallback(()=>({}),[]);
}

/** ================= SESSION AUDIO MANAGEMENT (one WAV for all tasks) ================= */
function useSessionAudio(){
  const recRef=useRef(null);
  const getRecorder = useCallback(async ()=>{
    if(!recRef.current){ const mr=new MicRecorder(); await mr.start(); recRef.current=mr; }
    return recRef.current;
  },[]);
  const stopAndGetWav = useCallback(async ()=>{
    if(!recRef.current) return null;
    const wav = await recRef.current.stop(); recRef.current=null; return wav;
  },[]);
  return { getRecorder, stopAndGetWav, hasActive: ()=>!!recRef.current };
}

/** ================= TASK ENGINE (uses session recorder; SPACE to advance) ================= */
function useTaskEngine({ part, totalTrials, getRecorder, onRow }){
  const [idx,setIdx]=useState(-1), [calibrating,setCalibrating]=useState(false), [seconds,setSeconds]=useState(0);
  const timerRef=useRef(null);
  // VAD refs (per-task, per-trial)
  const stimStartRef=useRef(null), voiceOnsetMsRef=useRef(null), speakingBeforeStimRef=useRef(false);
  const baselineRef=useRef({mean:0,std:0,thresh:0.02}), movingMeanRef=useRef(0), alpha=0.1;
  const trialStartPerfRef=useRef(null), trialVoicedMsRef=useRef(0), trialBurstsRef=useRef(0), prevVoicedRef=useRef(false);
  const peakRmsRef=useRef(0), meanRmsSumRef=useRef(0), meanRmsCountRef=useRef(0);
  const unsubRef=useRef(()=>{});

  const resetAcc=()=>{ trialVoicedMsRef.current=0; trialBurstsRef.current=0; prevVoicedRef.current=false; peakRmsRef.current=0; meanRmsSumRef.current=0; meanRmsCountRef.current=0; };

  const start = useCallback(async ()=>{
    const mr = await getRecorder(); // start session mic if not already
    setSeconds(0); clearInterval(timerRef.current); timerRef.current=setInterval(()=>setSeconds(s=>s+1),1000);

    // calibration
    setCalibrating(true);
    const samples=[]; const unsub=mr.onRms(({rms})=>samples.push(rms));
    const t0=performance.now(); while(performance.now()-t0<CALIBRATION_WINDOW_MS){ await new Promise(r=>setTimeout(r,50)); }
    unsub();
    const mean=samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length);
    const varc=samples.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,samples.length);
    const std=Math.sqrt(varc);
    const thresh=Math.max(0.01, Math.min(0.06, mean+4*std));
    baselineRef.current={mean,std,thresh}; movingMeanRef.current=mean; setCalibrating(false);

    unsubRef.current = mr.onRms(({rms,peak,durationMs})=>{
      movingMeanRef.current=(1-alpha)*movingMeanRef.current+alpha*rms;
      if(peak>peakRmsRef.current) peakRmsRef.current=peak;
      meanRmsSumRef.current+=rms; meanRmsCountRef.current+=1;

      const voiced = rms>baselineRef.current.thresh || movingMeanRef.current>baselineRef.current.thresh;
      if(stimStartRef.current==null){ if(voiced) speakingBeforeStimRef.current=true; }
      else{
        if(voiceOnsetMsRef.current==null && voiced){ voiceOnsetMsRef.current=performance.now()-stimStartRef.current; trialBurstsRef.current+=1; prevVoicedRef.current=true; }
        else if(voiced){ trialVoicedMsRef.current+=durationMs; if(!prevVoicedRef.current){ trialBurstsRef.current+=1; prevVoicedRef.current=true; } }
        else { prevVoicedRef.current=false; }
      }
    });

    setIdx(0);
  },[getRecorder]);

  const markStimShown = useCallback(()=>{
    stimStartRef.current=performance.now(); trialStartPerfRef.current=stimStartRef.current;
    voiceOnsetMsRef.current=null; speakingBeforeStimRef.current=false; resetAcc();
  },[]);

  useEffect(()=>{
    if(idx<0) return;
    const onKey=(e)=>{
      if(e.key===" "){
        e.preventDefault();
        const unix=Date.now(), now=performance.now();
        const trialDur=Math.round(now-(trialStartPerfRef.current??now));
        const meanRms=meanRmsCountRef.current?(meanRmsSumRef.current/meanRmsCountRef.current):0;

        const baseRow={
          "part[str]":part, "trial_idx[count]":idx,
          "unix_epoch_ms[ms]":unix, "iso_utc[str]":toISO(unix),
          "trial_duration_ms[ms]":trialDur,
          "voice_onset_ms[ms]": voiceOnsetMsRef.current ?? "",
          "speaking_before_stimulus[0/1]": speakingBeforeStimRef.current?1:0,
          "speech_peak_abs[unitless_-1..1]": Number(peakRmsRef.current.toFixed(5)),
          "speech_mean_rms[unitless]": Number(meanRms.toFixed(5)),
          "rater_correct[0/1]":"", "rater_marked[str]":"unknown",
        };
        onRow?.(baseRow);
        if(idx+1>=totalTrials){ setIdx(totalTrials); } else setIdx(n=>n+1);
      }
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[idx,totalTrials,part,onRow]);

  useEffect(()=>()=>{ clearInterval(timerRef.current); try{ unsubRef.current(); }catch{} },[]);

  return { idx,start,markStimShown,calibrating,seconds };
}

/** ================= INSTRUCTIONS ================= */
const Instructions = () => (
  <div style={{background:"rgba(255,255,255,0.06)",padding:"12px 14px",borderRadius:14,borderLeft:`4px solid ${ACCENT_SOFT}`}}>
    <div style={{fontSize:13,color:MUTED,lineHeight:1.7}}>
      <div><b>Instructions</b></div>
      <div>• Answer out loud, then press <b>SPACE</b> to advance.</div>
      <div>• Allow microphone and camera permissions.</div>
      <div>• Keep the room quiet and your face visible to the camera.</div>
    </div>
  </div>
);

/** ================= TASKS ================= */
function TaskReading({ onDone, collect, onSchema, getRecorder }){
  const words=useMemo(()=>buildSequenceNoAdjacent(COLOR_KEYS, TRIALS_PER_TASK),[]);
  const stimRef=useRef(null); const takeGaze=useWebcamGaze(stimRef);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ part:"Reading", totalTrials:TRIALS_PER_TASK, getRecorder,
    onRow:(base)=>{ const w=words[Math.min(Math.max(idx,0),words.length-1)];
      const row={...base, "stimulus_type[str]":"WORD_BLACK", "stimulus_word[str]":w, "stimulus_ink_hex[str]":"#000000"};
      collect?.(row); onSchema?.(row); }});
  const current=idx>=0 && idx<TRIALS_PER_TASK?words[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  return (
    <Card title="Task 1 — Baseline Reading" subtitle="Say the printed word (black ink). Press SPACE to advance.">
      {idx<0 && (<div style={{display:"grid",gap:12}}><Instructions/><Button onClick={start}>Start Task 1</Button>{calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}</div>)}
      {current && !done && (
        <div style={{display:"grid",gap:10}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill></div>
          <div style={{background:"#fafafa",border:"1px solid #eaeaea",borderRadius:14,padding:16}}>
            <div ref={stimRef} style={{fontSize:72,fontFamily:"Times New Roman, serif",color:"#000",lineHeight:1,userSelect:"none",textAlign:"center"}}>{current}</div>
          </div>
          <div style={{color:MUTED,fontSize:12,textAlign:"center"}}>Speak, then press SPACE.</div>
        </div>
      )}
      {done && (<div style={{display:"grid",gap:10,marginTop:8}}><Button onClick={onDone} full>Next Task →</Button></div>)}
    </Card>
  );
}

function TaskNaming({ onDone, collect, onSchema, getRecorder }){
  const colors=useMemo(()=>buildSequenceNoAdjacent(COLOR_KEYS, TRIALS_PER_TASK),[]);
  const stimRef=useRef(null); const takeGaze=useWebcamGaze(stimRef);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ part:"Naming", totalTrials:TRIALS_PER_TASK, getRecorder,
    onRow:(base)=>{ const c=colors[Math.min(Math.max(idx,0),colors.length-1)];
      const row={...base, "stimulus_type[str]":"CIRCLE_COLOR", "stimulus_word[str]":"", "stimulus_ink_hex[str]":INK[c]};
      collect?.(row); onSchema?.(row); }});
  const current=idx>=0 && idx<TRIALS_PER_TASK?colors[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  // 40ms jitter movement while trial is active
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
    <Card title="Task 2 — Baseline Naming" subtitle="Name the circle’s color. The circle jitters slightly. Press SPACE to advance.">
      {idx<0 && (<div style={{display:"grid",gap:12}}><Instructions/><Button onClick={start}>Start Task 2</Button>{calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}</div>)}
      {current && !done && (
        <div style={{display:"grid",gap:10,placeItems:"center"}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",width:"100%"}}><Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill></div>
          <div style={{width:300,height:300,position:"relative"}}>
            <div
              ref={stimRef}
              style={{
                width:260,height:260,borderRadius:"50%",background:INK[current],
                position:"absolute",left:"50%",top:"50%",transform:`translate(-50%,-50%) translate(${jitter.x}px, ${jitter.y}px)`,
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

function TaskIncongruent({ onDone, collect, onSchema, getRecorder }){
  const trials=useMemo(()=>buildIncongruentTrials(TRIALS_PER_TASK),[]);
  const stimRef=useRef(null); const takeGaze=useWebcamGaze(stimRef);
  const { idx,start,markStimShown,calibrating,seconds }=useTaskEngine({ part:"Incongruent", totalTrials:TRIALS_PER_TASK, getRecorder,
    onRow:(base)=>{ const t=trials[Math.min(Math.max(idx,0),trials.length-1)];
      const row={...base, "stimulus_type[str]":"WORD_INK_INCONGRUENT", "stimulus_word[str]":t.word, "stimulus_ink_hex[str]":INK[t.ink]};
      collect?.(row); onSchema?.(row); }});
  const current=idx>=0 && idx<TRIALS_PER_TASK?trials[idx]:null;
  useEffect(()=>{ if(current) markStimShown(); },[current,markStimShown]);
  const done=idx>=TRIALS_PER_TASK;

  return (
    <Card title="Task 3 — Incongruent" subtitle="Name the INK color (ignore the word). Press SPACE to advance.">
      {idx<0 && (<div style={{display:"grid",gap:12}}><Instructions/><Button onClick={start}>Start Task 3</Button>{calibrating && <div style={{color:MUTED,fontSize:12}}>Calibrating microphone…</div>}</div>)}
      {current && !done && (
        <div style={{display:"grid",gap:10}}>
          <BigTimer seconds={seconds}/>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><Pill>Trial {idx+1} / {TRIALS_PER_TASK}</Pill></div>
          <div ref={stimRef} style={{fontSize:72,fontFamily:"Times New Roman, serif",color:INK[current.ink],lineHeight:1,userSelect:"none",textAlign:"center"}}>{current.word}</div>
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
function StepNav({ step, setStep }){
  const Item=({n,label})=>(
    <button onClick={()=>setStep(n)} style={{
      display:"inline-flex",alignItems:"center",gap:8,padding:"10px 14px",borderRadius:999,border:`1px solid ${CARD_BD}`,
      background: step===n?`linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_SOFT} 100%)`:"rgba(255,255,255,0.05)",
      color: step===n?"#0b021a":TEXT,fontWeight:900,letterSpacing:0.3,cursor:"pointer"
    }}>
      <span style={{width:22,height:22,borderRadius:999,background: step===n?"rgba(0,0,0,0.15)":"rgba(167,139,250,0.2)",display:"grid",placeItems:"center",fontSize:12}}>{n}</span>
      {label}
    </button>
  );
  return <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Item n={1} label="Task 1: Reading"/><Item n={2} label="Task 2: Naming"/><Item n={3} label="Task 3: Incongruent"/></div>;
}

/** ================= PAGE (compact CSV + single session WAV) ================= */
export default function StroopTestPage({ embedded=false, onDone }){
  const [step,setStep]=useState(1);
  const [rows,setRows]=useState([]); const [schema,setSchema]=useState({});
  const [sessionBlob,setSessionBlob]=useState(null);
  const { getRecorder, stopAndGetWav, hasActive } = useSessionAudio();

  // silent correctness hotkeys (C/X) — not shown in UI, but stored in CSV
  useEffect(()=>{
    const onKey=(e)=>{
      const k=e.key?.toLowerCase();
      if(k!=="c" && k!=="x") return;
      setRows(prev=>{
        if(!prev.length) return prev;
        const last={...prev[prev.length-1]};
        if(k==="c"){ last["rater_correct[0/1]"]=1; last["rater_marked[str]"]="correct"; }
        else { last["rater_correct[0/1]"]=0; last["rater_marked[str]"]="incorrect"; }
        return [...prev.slice(0,-1), last];
      });
    };
    window.addEventListener("keydown", onKey);
    return ()=>window.removeEventListener("keydown", onKey);
  },[]);

  const collect=(row)=>setRows(r=>[...r,row]);
  const onSchema=(row)=>setSchema(s=>({ ...s, ...Object.fromEntries(Object.keys(row).map(k=>[k,true])) }));

  const DESCRIPTIONS = useMemo(()=>({
    "part[str]":"Task: Reading / Naming / Incongruent.",
    "trial_idx[count]":"0-based index within task.",
    "unix_epoch_ms[ms]":"UNIX time at SPACE (UTC ms).",
    "iso_utc[str]":"ISO-8601 timestamp (UTC).",
    "stimulus_type[str]":"WORD_BLACK | CIRCLE_COLOR | WORD_INK_INCONGRUENT.",
    "stimulus_word[str]":"Displayed word (blank for circle).",
    "stimulus_ink_hex[str]":"Ink/circle color in hex.",
    "trial_duration_ms[ms]":"Stimulus-on → SPACE press.",
    "voice_onset_ms[ms]":"Stimulus-on → first voiced frame (VAD).",
    "speaking_before_stimulus[0/1]":"1 if speech detected before stimulus onset.",
    "speech_mean_rms[unitless]":"Mean RMS amplitude during trial.",
    "speech_peak_abs[unitless_-1..1]":"Peak absolute amplitude.",
    "gaze_focused_ms[ms]":"Dwell inside stimulus AOI (webcam or pointer fallback).",
    "gaze_offscreen_ms[ms]":"Dwell outside AOI / missing.",
    "gaze_focus_ratio[%]":"100 * focused / (focused+offscreen).",
    "rater_correct[0/1]":"Researcher mark (optional): 1=correct, 0=incorrect.",
    "rater_marked[str]":"correct | incorrect | unknown",
  }),[]);

  const downloadCombinedCSV = ()=>{
    if(!rows.length) return;
    const cols = Object.keys(schema);
    const normalized = rows.map(r=>Object.fromEntries(cols.map(c=>[c, r[c] ?? ""])));
    downloadCSV("stroop_compact_metrics.csv", normalized, DESCRIPTIONS);
  };

  const downloadSessionWAV = async ()=>{
    let blob = sessionBlob;
    if(!blob){ blob = await stopAndGetWav(); setSessionBlob(blob); }
    if(!blob) return;
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    a.href=url; a.download="stroop_session_audio.wav"; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),0);
  };

  const finishEmbedded = async ()=>{
    let blob = sessionBlob;
    if(!blob){ blob = await stopAndGetWav(); setSessionBlob(blob); }
    onDone?.({ rows, sessionWav: blob });
  };

  if(embedded){
    return (
      <div>
        {step===1 && (
          <TaskReading collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={()=>setStep(2)} />
        )}
        {step===2 && (
          <TaskNaming collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={()=>setStep(3)} />
        )}
        {step===3 && (
          <TaskIncongruent collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={finishEmbedded} />
        )}
      </div>
    );
  }

  return (
    <Page>
      <div style={{marginBottom:18}}>
        <h1 style={{margin:0,fontSize:30,letterSpacing:0.3}}>Stroop Test</h1>
        <div style={{color:MUTED,fontSize:13,marginTop:6}}>
          Speak the answer, then press <b>SPACE</b> to advance. A single CSV + one session WAV are available after the final task.
        </div>
        <div style={{marginTop:12}}><StepNav step={step} setStep={setStep}/></div>
      </div>

      {step===1 && (
        <TaskReading collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={()=>setStep(2)} />
      )}
      {step===2 && (
        <TaskNaming collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={()=>setStep(3)} />
      )}
      {step===3 && (
        <TaskIncongruent collect={collect} onSchema={onSchema} getRecorder={getRecorder} onDone={()=>setStep(4)} />
      )}
      {step>=4 && (
        <Card title="Export" subtitle="Download your data artifacts.">
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <Button onClick={downloadCombinedCSV} disabled={!rows.length}>Download CSV (compact metrics)</Button>
            <Button kind="secondary" onClick={downloadSessionWAV} disabled={!hasActive() && !sessionBlob}>Download Session WAV</Button>
          </div>
          <div style={{color:MUTED,fontSize:12,marginTop:8}}>
            CSV includes per-trial timestamps, voice onset (mic), and optional correctness labels.
          </div>
        </Card>
      )}
    </Page>
  );
}