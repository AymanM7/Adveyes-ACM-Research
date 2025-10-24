"use client";

import React, { useMemo, useRef, useState } from "react";
import { AssessmentPage, Card, Button, BreakScreen, Pill, Progress } from "../components/ui/Theme";
import { downloadJSON, downloadCSV, downloadBlob, fileName } from "../lib/export";
import dynamic from "next/dynamic";

// Dynamically import the existing test pages to run them embedded
const CardCPT = dynamic(() => import("../01cardcpt/page"), { ssr: false });
const Stroop = dynamic(() => import("../02stroop/page"), { ssr: false });
const FreeSpeech = dynamic(() => import("../03freespeech/page"), { ssr: false });
const NumberSense = dynamic(() => import("../04numbersense/page"), { ssr: false });

export default function AssessmentWizard(){
  const [step, setStep] = useState(0); // 0 intro, 1 cpt, 2 break, 3 stroop, 4 break, 5 free, 6 break, 7 numbers, 8 export

  // Aggregated artifacts for combined export
  const cptRowsRef = useRef([]); // we will fill via a hook-on in CPT edit
  const stroopRowsRef = useRef([]); // from Stroop edits
  const stroopWavRef = useRef(null);
  const freeSpeechMetaRef = useRef(null);
  const freeSpeechWavRef = useRef(null);
  const numberMarkersRef = useRef(null);
  const numberWavRef = useRef(null);

  const steps = [
    { key: "intro", label: "Welcome" },
    { key: "cpt", label: "Card CPT" },
    { key: "break1", label: "Break" },
    { key: "stroop", label: "Stroop" },
    { key: "break2", label: "Break" },
    { key: "freespeech", label: "Free Speech" },
    { key: "break3", label: "Break" },
    { key: "numbersense", label: "Number Sense" },
    { key: "export", label: "Export" },
  ];

  const goNext = () => setStep((s) => Math.min(s + 1, steps.length - 1));

  const header = (
    <div style={{ marginBottom: 18 }}>
      <h1 style={{ margin: 0, fontSize: 30, letterSpacing: 0.3 }}>Unified Assessment</h1>
      <div style={{ color: "#9aa0a6", fontSize: 13, marginTop: 6 }}>
        A four-part evaluation with breaks between tests. Progress only; no visible timers.
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
        {steps.map((st, idx) => (
          <span key={st.key} style={{ opacity: idx <= step ? 1 : 0.5 }}>
            <Pill>{idx + 1}. {st.label}</Pill>
          </span>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Progress value={step} max={steps.length - 1} />
      </div>
    </div>
  );

  return (
    <AssessmentPage>
      {header}

      {step === 0 && (
        <Card
          title="Welcome"
          subtitle="You will complete: Card CPT, Stroop, Free Speech, and Number Sense. There are indefinite breaks between tests."
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 13, color: "#9aa0a6" }}>
              Ensure a quiet environment and allow microphone/camera permissions when prompted.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button onClick={() => setStep(1)}>Begin Assessment</Button>
              <Button kind="secondary" onClick={() => document.documentElement.requestFullscreen?.()}>Go Fullscreen</Button>
            </div>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card title="Card CPT" subtitle="Press SPACE when you see the target card. Progress shows trials only.">
          <div style={{ display: "grid", gap: 12 }}>
            <CardCPT embedded onDone={() => setStep(2)} onCollect={(rows)=>{ cptRowsRef.current = rows; }}/>
          </div>
        </Card>
      )}

      {step === 2 && (
        <BreakScreen onContinue={() => setStep(3)} />
      )}

      {step === 3 && (
        <Card title="Stroop" subtitle="Speak the answer, then press SPACE to advance. Progress only; timers hidden.">
          <Stroop embedded onDone={({ rows, sessionWav })=>{ stroopRowsRef.current = rows||[]; stroopWavRef.current = sessionWav||null; setStep(4); }} />
        </Card>
      )}

      {step === 4 && (
        <BreakScreen onContinue={() => setStep(5)} />
      )}

      {step === 5 && (
        <Card title="Free Speech" subtitle="Speak naturally for a few minutes. Progress cue only; no visible timer.">
          <FreeSpeech embedded onDone={({ wavBlob, meta })=>{ freeSpeechWavRef.current = wavBlob||null; freeSpeechMetaRef.current = meta||null; setStep(6); }} />
        </Card>
      )}

      {step === 6 && (
        <BreakScreen onContinue={() => setStep(7)} />
      )}

      {step === 7 && (
        <Card title="Number Sense" subtitle="State your answer aloud, then continue. Progress only; no visible timer.">
          <NumberSense embedded onDone={({ wavBlob, markers })=>{ numberWavRef.current = wavBlob||null; numberMarkersRef.current = markers||null; setStep(8); }} />
        </Card>
      )}

      {step === 8 && (
        <Card title="Export" subtitle="Download all artifacts or a combined JSON for modeling.">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button kind="secondary" onClick={() => downloadJSON("assessment_combined", {
                cpt: { trials: cptRowsRef.current },
                stroop: { trials: stroopRowsRef.current, sessionWav: stroopWavRef.current ? "(binary)" : "" },
                freeSpeech: { meta: freeSpeechMetaRef.current, wav: freeSpeechWavRef.current ? "(binary)" : "" },
                numberSense: { markers: numberMarkersRef.current, wav: numberWavRef.current ? "(binary)" : "" },
              })}>Download Combined JSON</Button>

              <Button kind="secondary" onClick={() => downloadJSON("cpt_trials", { trials: cptRowsRef.current })}>Download CPT JSON</Button>
              <Button kind="secondary" onClick={() => downloadJSON("stroop_trials", { trials: stroopRowsRef.current })}>Download Stroop JSON</Button>

              {stroopWavRef.current && (
                <Button kind="secondary" onClick={() => downloadBlob(stroopWavRef.current, fileName("stroop_session_audio", "wav"))}>Download Stroop WAV</Button>
              )}
              {freeSpeechWavRef.current && (
                <Button kind="secondary" onClick={() => downloadBlob(freeSpeechWavRef.current, fileName("free_speech", "wav"))}>Download Free Speech WAV</Button>
              )}
              {freeSpeechMetaRef.current && (
                <Button kind="secondary" onClick={() => downloadJSON("free_speech_meta", freeSpeechMetaRef.current)}>Download Free Speech Meta</Button>
              )}
              {numberWavRef.current && (
                <Button kind="secondary" onClick={() => downloadBlob(numberWavRef.current, fileName("numbersense", "wav"))}>Download Number Sense WAV</Button>
              )}
              {numberMarkersRef.current && (
                <Button kind="secondary" onClick={() => downloadJSON("numbersense_markers", numberMarkersRef.current)}>Download Number Sense Markers</Button>
              )}
            </div>
            <div style={{ color: "#9aa0a6", fontSize: 12 }}>
              You can always revisit individual tests from the home page if needed.
            </div>
          </div>
        </Card>
      )}
    </AssessmentPage>
  );
}


