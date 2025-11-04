"use client"
import React, { useState, useMemo, useRef } from "react"
function randInt(min, max) {
  // Ensure min <= max to avoid NaN ranges
  if (max < min) {
    const t = min; min = max; max = t;
  }
  // Ensure min <= max to avoid NaN ranges
  if (max < min) {
    const t = min; min = max; max = t;
  }
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function generateComparisonNumber(problem) {
  const product = problem.a * problem.b;
  
  const product = problem.a * problem.b;
  
  const strategies = [
    () => {
      const variance = product * 0.2;
      return randInt(Math.max(1, Math.floor(product - variance)), Math.floor(product + variance));
      const variance = product * 0.2;
      return randInt(Math.max(1, Math.floor(product - variance)), Math.floor(product + variance));
    },
    () => {
      const roundTo = randInt(1, 3) === 1 ? 10 : 25;
      const base = Math.round(product / roundTo) * roundTo;
      return base + (randInt(0, 1) ? roundTo : -roundTo);
      const roundTo = randInt(1, 3) === 1 ? 10 : 25;
      const base = Math.round(product / roundTo) * roundTo;
      return base + (randInt(0, 1) ? roundTo : -roundTo);
    },
    () => {
      const maxReasonable = Math.max(100, product * 3);
      return randInt(10, maxReasonable);
      const maxReasonable = Math.max(100, product * 3);
      return randInt(10, maxReasonable);
    }
  ];
  
  const strategy = strategies[randInt(0, strategies.length - 1)];
  let comparisonNumber = strategy();
  // Safety: cap attempts so we never loop forever
  let attempts = 0
  const maxAttempts = 30
  while ((typeof comparisonNumber !== 'number' || isNaN(comparisonNumber) || Math.abs(comparisonNumber - product) < 5 || comparisonNumber < 10) && attempts < maxAttempts) {
    comparisonNumber = strategy();
    attempts += 1
  }
  if (attempts >= maxAttempts || typeof comparisonNumber !== 'number' || isNaN(comparisonNumber)) {
    // Fallback: choose a sensible value near product
    comparisonNumber = Math.max(10, Math.round(product * 0.7) || 10)
  }
  return Math.max(10, comparisonNumber);
}
function generateProblemSet(count = 7) {
  const problems = [];
  
  for (let i = 0; i < count; i++) {
    const typeRoll = randInt(1, 3);
    let a, b, type;
    
    if (typeRoll === 1) {
      a = randInt(1, 9);
      b = randInt(1, 9);
      type = "1 digit × 1 digit";
    } else if (typeRoll === 2) {
      const oneDigit = randInt(1, 9);
      const twoDigit = randInt(10, 99);
      if (Math.random() < 0.5) {
        a = oneDigit;
        b = twoDigit;
      } else {
        a = twoDigit;
        b = oneDigit;
      }
      type = "1 digit × 2 digit";
    } else {
      a = randInt(10, 99);
      b = randInt(10, 99);
      type = "2 digit × 2 digit";
    }
    
    const product = a * b;
    const comparisonNumber = generateComparisonNumber({ a, b, product });
    
    problems.push({
      a,
      b,
      type,
      description: `${a} × ${b}`,
      product: product,
      comparisonNumber: comparisonNumber,
      isLargerThanComparison: product > comparisonNumber
    });
  }
  
  return problems;
}
export default function MathNumberSense() {
  // Initialize problems synchronously so the page doesn't show a perpetual loading state
  const [problems, setProblems] = useState(() => generateProblemSet(7))
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [testStarted, setTestStarted] = useState(false)
  const [answers, setAnswers] = useState(() => Array(problems.length).fill(null))
  const [hoveredAnswer, setHoveredAnswer] = useState(null)
  const [answers, setAnswers] = useState(() => Array(problems.length).fill(null))
  const [hoveredAnswer, setHoveredAnswer] = useState(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [testCompleted, setTestCompleted] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [timeMarkers, setTimeMarkers] = useState([])
  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const testStartTimeRef = useRef(null)
  // problems are initialized synchronously above; no useEffect needed
  if (!problems) {
    return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.2rem" }}>Loading...</div>
  }
  const currentProblem = problems ? problems[currentProblemIndex] : null
  if (!currentProblem) {
    return <div style={{ padding: "2rem", textAlign: "center", fontSize: "1.2rem" }}>Loading...</div>
  }
  const startTest = async () => {
    try {
      // Initialize audio context once
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setTestCompleted(true);
        clearInterval(timerRef.current);
      };
      // Record start time
      testStartTimeRef.current = Date.now();
      
      // Add initial marker for problem 1
      setTimeMarkers([{
        problemIndex: 0,
        timestamp: 0,
        unixTime: testStartTimeRef.current,
        description: problems[0].description
      }]);
      mediaRecorderRef.current.start();
      setTestStarted(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error)
      alert("Could not access microphone. Please check permissions.")
    }
  }
  const stopTest = () => {
    if (mediaRecorderRef.current && testStarted) {
      mediaRecorderRef.current.stop();
    }
    audioChunksRef.current = [];
  };
  const goToNextProblem = () => {
    // require an answer before advancing
    if (!answers[currentProblemIndex]) {
      alert('Please indicate whether the product is larger or smaller before continuing.')
      return
    }
    if (currentProblemIndex < problems.length - 1) {
      const currentTime = Date.now() - testStartTimeRef.current;
      const newIndex = currentProblemIndex + 1;
      
      setTimeMarkers(prev => [...prev, {
        problemIndex: newIndex,
        timestamp: currentTime,
        unixTime: Date.now(),
        description: problems[newIndex].description
      }]);
      
      setCurrentProblemIndex(newIndex);
    } else {
      stopTest();
    }
  }
  const handleAnswer = (choice) => {
    const now = Date.now()
    const rel = testStartTimeRef.current ? now - testStartTimeRef.current : 0
    const p = problems[currentProblemIndex]
    const correct = choice === 'larger' ? (p.product > p.comparisonNumber) : (p.product < p.comparisonNumber)
    setAnswers(prev => {
      const copy = [...prev]
      copy[currentProblemIndex] = {
        answer: choice,
        unixTime: now,
        timeSinceStartMs: rel,
        correct: !!correct
      }
      return copy
    })
  }
  const audioBufferToWav = (audioBuffer) => {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    const channelData = [];
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }
    const length = channelData[0].length;
    const interleaved = new Float32Array(length * numberOfChannels);
    let offset = 0;
    
    // Copy data with minimal processing
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        interleaved[offset++] = channelData[channel][i];
      }
    }
    const dataLength = interleaved.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeString = (off, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(off + i, string.charCodeAt(i));
      }
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    // Convert to 16-bit PCM with proper scaling
    let writeOffset = 44;
    const maxInt = 32767;
    const minInt = -32768;
    
    for (let i = 0; i < interleaved.length; i++) {
      let s = interleaved[i];
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      s = Math.max(minInt, Math.min(maxInt, s));
      view.setInt16(writeOffset, s, true);
      writeOffset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };
  const handleDownload = async () => {
    if (audioChunksRef.current.length === 0) {
      alert('No recording available');
      return;
    }
    setUploading(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      const wavBlob = audioBufferToWav(audioBuffer);
      
      // Prepare markers data
      const markersData = {
        testDate: new Date().toISOString(),
        totalDuration: recordingTime,
        problems: problems.map((p, idx) => ({
          index: idx,
          description: p.description,
          type: p.type,
          product: p.product,
          comparisonNumber: p.comparisonNumber,
          isLargerThanComparison: p.isLargerThanComparison,
          answer: answers[idx] ? answers[idx].answer : null,
          correct: answers[idx] ? answers[idx].correct : null,
          answerTimeSinceStartMs: answers[idx] ? answers[idx].timeSinceStartMs : null
        })),
        timeMarkers: timeMarkers
      };

      // If embedded mode, call onDone to navigate to export page
      if (embedded) {
        onDone?.({ wavBlob, markers: markersData });
        setUploadSuccess(true);
        setUploading(false);
        return;
      }

      // Otherwise, download files locally (existing behavior)
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const audioFilename = `math_number_sense_${dateStr}.wav`;
      const markersFilename = `math_number_sense_markers_${dateStr}.json`;
      // Download audio file
      const audioUrl = URL.createObjectURL(wavBlob);
      const audioLink = document.createElement('a');
      audioLink.href = audioUrl;
      audioLink.download = audioFilename;
      document.body.appendChild(audioLink);
      audioLink.click();
      document.body.removeChild(audioLink);
      
      setTimeout(() => {
        URL.revokeObjectURL(audioUrl);
      }, 100);
      // Download markers file
      const markersData = {
        testDate: new Date().toISOString(),
        totalDuration: recordingTime,
        problems: problems.map((p, idx) => ({
          index: idx,
          description: p.description,
          type: p.type,
          product: p.product,
          comparisonNumber: p.comparisonNumber,
          isLargerThanComparison: p.isLargerThanComparison
        })),
        timeMarkers: timeMarkers
      };
      const markersBlob = new Blob([JSON.stringify(markersData, null, 2)], { type: 'application/json' });
      const markersUrl = URL.createObjectURL(markersBlob);
      const markersLink = document.createElement('a');
      markersLink.href = markersUrl;
      markersLink.download = markersFilename;
      document.body.appendChild(markersLink);
      markersLink.click();
      document.body.removeChild(markersLink);
      
      setTimeout(() => {
        URL.revokeObjectURL(markersUrl);
      }, 100);
      // Also download CSV automatically along with audio and markers
      try {
        downloadCSV()
      } catch (err) {
        console.error('Error auto-downloading CSV:', err)
      }
      setUploadSuccess(true);
    } catch (error) {
      console.error('Error downloading:', error);
      alert('Error downloading files. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  // Generate CSV of answers and provide as a download
  const downloadCSV = () => {
    if (!answers || answers.length === 0) {
      alert('No answers recorded')
      return
    }
    const rows = []
    // timeSinceStartSeconds is seconds since test start (with 2 decimals)
    rows.push(['problemIndex', 'description', 'answer', 'timeSinceStartSeconds', 'correct'])
    answers.forEach((ans, idx) => {
      const p = problems[idx]
      if (!ans) {
        rows.push([idx, p.description, '', '', ''])
      } else {
  const seconds = typeof ans.timeSinceStartMs === 'number' ? (ans.timeSinceStartMs / 1000).toFixed(4) : ''
        rows.push([idx, p.description, ans.answer, seconds, ans.correct])
      }
    })

    const csvContent = rows.map(r => r.map(cell => {
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
        return '"' + cell.replace(/"/g, '""') + '"'
      }
      return String(cell)
    }).join(',')).join('\n')
    const csvBlob = new Blob([csvContent], { type: 'text/csv' })
    const csvUrl = URL.createObjectURL(csvBlob)
    const csvLink = document.createElement('a')
    csvLink.href = csvUrl
    csvLink.download = `math_number_sense_answers_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(csvLink)
    csvLink.click()
    document.body.removeChild(csvLink)
    setTimeout(() => URL.revokeObjectURL(csvUrl), 100)
  }
  const resetTest = () => {
    const newProblems = generateProblemSet(7);
    const newProblems = generateProblemSet(7);
    setProblems(newProblems);
    setCurrentProblemIndex(0);
    audioChunksRef.current = [];
    setTimeMarkers([]);
    setTestStarted(false);
    setTestCompleted(false);
    setUploadSuccess(false);
    setRecordingTime(0);
    testStartTimeRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const containerStyle = {
    fontFamily: "Inter, Roboto, system-ui, -apple-system, 'Segoe UI', Arial",
    padding: "2rem",
    maxWidth: 600,
    margin: "2rem auto",
    textAlign: "center",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
  }
  const headerStyle = {
    fontSize: "1.5rem",
    fontWeight: 700,
    marginBottom: "2rem",
    color: "#0066cc",
    letterSpacing: "-0.5px"
  }
  const problemStyle = {
    fontSize: "3rem",
    fontWeight: 700,
    margin: "2rem 0",
    padding: "2rem",
    backgroundColor: "#f0f7ff",
    borderRadius: "12px",
    border: "2px solid #0066cc",
    color: "#0066cc"
  }
  const comparisonStyle = {
    fontSize: "1.3rem",
    margin: "1.5rem 0",
    padding: "1.5rem",
    backgroundColor: "#fff3cd",
    borderRadius: "10px",
    border: "2px solid #ffc107",
    color: "#856404",
    fontWeight: 600
  }
  const btnStyle = {
    padding: "0.75rem 1.5rem",
    margin: "0.5rem",
    fontSize: "1rem",
    borderRadius: "8px",
    border: "none",
    background: "#0066cc",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s",
    fontWeight: 600,
    boxShadow: "0 2px 4px rgba(0, 102, 204, 0.2)"
  }
  const secondaryBtnStyle = {
    ...btnStyle,
    background: "#e8f0ff",
    color: "#0066cc",
    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)"
  }
  const progressStyle = {
    margin: "1.5rem 0 2rem 0",
    fontSize: "0.95rem",
    color: "#666",
    fontWeight: 600
  }
  const timerStyle = {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#0066cc",
    margin: "1rem 0",
    fontVariantNumeric: "tabular-nums"
  }
  if (testCompleted) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          Test Completed!
        </div>
        <div style={{ fontSize: "4rem", marginBottom: "1rem", color: uploadSuccess ? "#28a745" : "#0066cc" }}>
          ✓
        </div>
        <div style={{ fontSize: "1.3rem", margin: "1.5rem 0", fontWeight: 600, color: uploadSuccess ? "#28a745" : "#2d3748" }}>
          {uploadSuccess ? 'Download Complete!' : 'Test Recording Ready'}
        </div>
        <div style={{ margin: "1rem 0", color: "#666", fontSize: "1rem" }}>
          {timeMarkers.length} problems completed • Total time: {formatTime(recordingTime)}
        </div>
        
        {!uploadSuccess && (
          <button 
            onClick={handleDownload}
            disabled={uploading}
            style={{
              ...btnStyle,
              background: uploading ? "#a0aec0" : "#28a745",
              cursor: uploading ? "not-allowed" : "pointer",
              marginBottom: "1rem",
              padding: "1rem 2.5rem",
              fontSize: "1.05rem"
            }}
          >
            {uploading ? 'Processing...' : embedded ? 'Continue to Export' : 'Download Audio & Markers'}
          </button>
        )}
        {uploadSuccess && (
          <p style={{ color: "#28a745", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
            {embedded ? 'Proceeding to export page...' : 'Audio and markers file downloaded successfully'}
          </p>
        )}
        <button 
          onClick={resetTest}
          style={{
            ...secondaryBtnStyle,
            display: "block",
            margin: "0 auto"
          }}
        >
          Start New Test
        </button>
      </div>
    )
  }
  if (!testStarted) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>
          MATH & NUMBER SENSE
        </div>
        
        <div style={{ 
          fontSize: "1.2rem", 
          margin: "2rem 0", 
          color: "#555",
          lineHeight: "1.8"
        }}>
          <p style={{ marginBottom: "1rem" }}>
            You will be shown {problems.length} multiplication problems.
          </p>
          <p style={{ marginBottom: "1rem" }}>
            For each problem, state whether the solution is <strong>larger</strong> than the comparison number shown.
          </p>
          <p style={{ marginBottom: "1rem" }}>
            The test will record continuously. Click <strong>Continue</strong> to move to the next problem.
          </p>
        </div>
        <button 
          style={{
            ...btnStyle,
            padding: "1.5rem 3rem",
            fontSize: "1.2rem",
            marginTop: "2rem"
          }}
          onClick={startTest}
        >
          Start Test
        </button>
        <div style={{ 
          marginTop: "2rem", 
          padding: "1.5rem",
          backgroundColor: "#fff3cd",
          borderRadius: "10px",
          fontSize: "0.9rem",
          color: "#856404",
          lineHeight: "1.6"
        }}>
          <strong>Note:</strong> Please allow microphone access when prompted. Recording will begin automatically when you start the test.
        </div>
      </div>
    )
  }
  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        MATH & NUMBER SENSE
      </div>
      <div style={progressStyle}>
        Problem {currentProblemIndex + 1} of {problems.length}
      </div>
      <div style={problemStyle} aria-live="polite">
        {currentProblem.description}
      </div>
      <div style={{...problemStyle, fontSize: "1.1rem"}}>
        Type: {currentProblem.type}
      </div>
      <div style={comparisonStyle}>
        Is it larger than: <strong>{currentProblem.comparisonNumber}</strong>?
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button
          onMouseEnter={() => setHoveredAnswer('larger')}
          onMouseLeave={() => setHoveredAnswer(null)}
          onClick={() => handleAnswer('larger')}
          style={{
            ...btnStyle,
            marginRight: '0.5rem',
            background: answers[currentProblemIndex] && answers[currentProblemIndex].answer === 'larger' ? '#004a99' : (hoveredAnswer === 'larger' ? '#005fbf' : btnStyle.background),
            boxShadow: answers[currentProblemIndex] && answers[currentProblemIndex].answer === 'larger' ? '0 4px 8px rgba(0,75,153,0.25)' : btnStyle.boxShadow
          }}
        >
          Larger
        </button>
        <button
          onMouseEnter={() => setHoveredAnswer('smaller')}
          onMouseLeave={() => setHoveredAnswer(null)}
          onClick={() => handleAnswer('smaller')}
          style={{
            ...secondaryBtnStyle,
            background: answers[currentProblemIndex] && answers[currentProblemIndex].answer === 'smaller' ? '#cfe8ff' : (hoveredAnswer === 'smaller' ? '#e6f3ff' : secondaryBtnStyle.background),
            boxShadow: answers[currentProblemIndex] && answers[currentProblemIndex].answer === 'smaller' ? '0 4px 8px rgba(0,102,204,0.12)' : secondaryBtnStyle.boxShadow,
            border: answers[currentProblemIndex] && answers[currentProblemIndex].answer === 'smaller' ? '2px solid #0066cc' : secondaryBtnStyle.border
          }}
        >
          Smaller
        </button>
      </div>
      <div style={timerStyle}>
        {formatTime(recordingTime)}
      </div>
      <div style={{ 
        margin: "1rem 0",
        padding: "0.75rem",
        backgroundColor: "#ffe6e6",
        borderRadius: "8px",
        color: "#d32f2f",
        fontWeight: 600,
        fontSize: "0.95rem"
      }}>
        🔴 Recording in progress
      </div>
      <div style={{ margin: "2rem 0" }}>
        <button 
          style={{
            ...btnStyle,
            padding: "1rem 3rem",
            fontSize: "1.1rem"
          }}
          onClick={goToNextProblem}
        >
          {currentProblemIndex < problems.length - 1 ? 'Continue' : 'Finish Test'}
        </button>
      </div>
      <div style={{ 
        marginTop: "2rem", 
        padding: "1.5rem",
        backgroundColor: "#f8f9ff",
        borderRadius: "10px",
        fontSize: "0.9rem",
        color: "#555",
        lineHeight: "1.6"
      }}>
        <strong style={{color: "#0066cc"}}>Instructions:</strong> For each math problem that appears, explain your thought process as to why it is larger or smaller than the other number shown. Then, select your answer & click Continue to move to the next problem. The recording is continuous and will include timestamps for each question.
      </div>
    </div>
  )
}