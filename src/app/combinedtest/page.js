"use client";
import React, { useState, useRef } from 'react';
import CardCPT from '../01cardcpt/page';
import Stroop from '../02stroop/page';
import FreeSpeech from '../03freespeech/page';
import NumberSense from '../04numbersense/page';



function TestWrapper({ TestComponent, onStart, onComplete }) {
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <div style={{ textAlign: 'center', marginTop: '60px' }}>
        <button onClick={() => {
          console.log('TEST START BUTTON PRESSED');
          setStarted(true);
          onStart && onStart();
        }} style={{ fontSize: '1.2em', padding: '10px 20px' }}>Start Test</button>
      </div>
    );
  }
  return <TestComponent onComplete={onComplete} />;
}

const TESTS = [
  { name: 'Card CPT', component: CardCPT },
  { name: 'Stroop', component: Stroop },
  { name: 'Free Speech', component: FreeSpeech },
  { name: 'Number Sense', component: NumberSense },
];

function StartScreen({ onStart }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
      <h2>Welcome to the Combined Test</h2>
      <p>This test consists of four sections:</p>
      <ol style={{ textAlign: 'left', margin: '0 auto', display: 'inline-block' }}>
        <li><b>Card CPT</b>: Measures sustained attention and response control.</li>
        <li><b>Stroop</b>: Assesses cognitive flexibility and processing speed.</li>
        <li><b>Free Speech</b>: Evaluates spontaneous verbal fluency.</li>
        <li><b>Number Sense</b>: Tests basic numerical reasoning.</li>
      </ol>
      <p>Between each section, you will have a break screen. The timer will only run while you are actively completing each test section.</p>
      <button onClick={onStart} style={{ fontSize: '1.2em', padding: '10px 20px', marginTop: '30px' }}>Start Combined Test</button>
    </div>
  );
}

function BreakScreen({ onContinue }) {
  return (
    <div style={{ textAlign: 'center', marginTop: '100px' }}>
      <h2>Break Time!</h2>
      <p>Take a short break. Click continue when you are ready for the next test.</p>
      <button onClick={onContinue} style={{ fontSize: '1.2em', padding: '10px 20px' }}>Continue</button>
    </div>
  );
}



function CombinedTest() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0); // 0: test, 1: break
  const [testIndex, setTestIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [testStarted, setTestStarted] = useState(false);

  React.useEffect(() => {
    if (timerRunning) {
      console.log('TIMER STARTED');
      timerRef.current = setInterval(() => {
        setElapsed(e => e + 1);
      }, 1000);
    } else if (timerRef.current) {
      console.log('TIMER STOPPED');
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) {
        console.log('TIMER CLEANUP');
        clearInterval(timerRef.current);
      }
    };
  }, [timerRunning]);

  const handleStart = () => {
    setStarted(true);
    setTimerRunning(false); // Ensure timer is paused after briefing
  };

  // Called when user clicks start for a test section
  const handleTestSectionStart = () => {
    setTestStarted(true);
    setTimerRunning(true);
  };

  // Called when a test section is completed
  const handleTestComplete = () => {
    setTimerRunning(false);
    setTestStarted(false);
    setStep(1); // show break
  };

  const handleBreakContinue = () => {
    setTimerRunning(false); // Ensure timer is paused after break
    if (testIndex < TESTS.length - 1) {
      setTestIndex(testIndex + 1);
      setStep(0);
    }
  };

  // Render logic
  if (!started) {
    return <StartScreen onStart={handleStart} />;
  }

  if (testIndex >= TESTS.length) {
    return (
      <div style={{ textAlign: 'center', marginTop: '100px' }}>
        <h2>All tests completed!</h2>
        <p>Total elapsed time: {elapsed} seconds</p>
      </div>
    );
  }

  const CurrentTest = TESTS[testIndex].component;

  return (
    <div>
      <div style={{ position: 'fixed', top: 10, right: 10, fontSize: '1.2em' }}>
        Elapsed Time: {elapsed} seconds
      </div>
      {step === 0 ? (
        <div>
          <h2 style={{ textAlign: 'center' }}>{TESTS[testIndex].name}</h2>
          <TestWrapper TestComponent={CurrentTest} onStart={handleTestSectionStart} onComplete={handleTestComplete} />
        </div>
      ) : (
        <BreakScreen onContinue={handleBreakContinue} />
      )}
    </div>
  );
}

export default CombinedTest;
