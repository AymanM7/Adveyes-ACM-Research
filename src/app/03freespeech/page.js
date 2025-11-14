'use client';

import { useState, useRef } from 'react';

export default function Screening({ embedded=false, onDone }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const mediaRecorderRef = useRef(null);
  const timerRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 22050,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to WAV
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // WAV conversion
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;

        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;

        const channelData = [];
        for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
          channelData.push(audioBuffer.getChannelData(i));
        }

        // Interleave channels
        const length = channelData[0].length;
        const interleaved = new Float32Array(length * channelData.length);
        let offset = 0;
        for (let i = 0; i < length; i++) {
          for (let channel = 0; channel < channelData.length; channel++) {
            interleaved[offset++] = channelData[channel][i];
          }
        }

        const dataLength = interleaved.length * bytesPerSample;
        const buffer = new ArrayBuffer(44 + dataLength);
        const view = new DataView(buffer);

        // Write WAV header
        const writeString = (offset, string) => {
          for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + dataLength, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        writeString(36, 'data');
        view.setUint32(40, dataLength, true);

        // Write audio data (float to 16-bit PCM)
        let writeOffset = 44;
        for (let i = 0; i < interleaved.length; i++, writeOffset += 2) {
          const s = Math.max(-1, Math.min(1, interleaved[i]));
          view.setInt16(writeOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        const wavBlob = new Blob([buffer], { type: 'audio/wav' });
        setAudioBlob(wavBlob);
        console.log('Recording saved as WAV, blob size:', wavBlob.size);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingComplete(true);
      clearInterval(timerRef.current);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) {
      alert('No recording available to upload');
      return;
    }

    setUploading(true);

    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const filename = `free_speech_${dateStr}.wav`;

      // Download locally
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);

      console.log('Upload successful!', filename);
      setUploadSuccess(true);

    } catch (error) {
      console.error('Error uploading:', error);
      alert('Error uploading recording. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const resetRecording = () => {
    setRecordingComplete(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setUploadSuccess(false);
    audioChunksRef.current = [];
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '2rem', 
            marginBottom: '1rem', 
            color: 'white', 
            fontWeight: '600',
            textShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}
          >Free Speech
          </h1>

          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '20px',
            marginBottom: '2rem',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
          }}>
            <p style={{ 
              fontSize: '1.2rem', 
              lineHeight: '1.8', 
              color: '#2d3748',
              marginBottom: '1.5rem',
              fontWeight: '500'
            }}>
              Tell me about what you did last weekend or on your most recent holiday.
            </p>
            
            <div style={{
              background: '#f7fafc',
              padding: '1rem',
              borderRadius: '12px',
              borderLeft: '4px solid #667eea'
            }}>
              <p style={{ 
                fontSize: '0.9rem', 
                color: '#4a5568',
                margin: 0,
                lineHeight: '1.6'
              }}>
                <strong>Instructions:</strong><br/>
                • Answer the question naturally<br/>
                • Aim for 2-3 minutes of talking<br/>
                • Make sure you're in a quiet environment<br/>
                • Submit once you're ready
              </p>
            </div>
          </div>

          {!recordingComplete ? (
            <>
              {/* timer hidden per unified spec; keeping recording cue only */}

              <button
                onClick={isRecording ? stopRecording : startRecording}
                style={{
                  width: '140px',
                  height: '140px',
                  borderRadius: '50%',
                  border: 'none',
                  background: isRecording 
                    ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' 
                    : 'white',
                  color: isRecording ? 'white' : '#667eea',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  transition: 'all 0.3s ease',
                  marginBottom: '1.5rem',
                  letterSpacing: '1px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'scale(1.08)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                }}
              >
                {isRecording ? 'STOP' : 'RECORD'}
              </button>

              {isRecording && (
                <p style={{ 
                  color: 'white', 
                  fontSize: '1rem',
                  fontWeight: '500',
                  animation: 'pulse 2s ease-in-out infinite',
                  textShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}>
                  🔴 Recording in progress...
                </p>
              )}
            </>
          ) : (
            <div style={{
              background: 'white',
              padding: '2.5rem 2rem',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
            }}>
              <div style={{ 
                fontSize: '4rem',
                marginBottom: '1rem',
                color: uploadSuccess ? '#48bb78' : '#667eea'
              }}>
                {uploadSuccess ? '✓' : '✓'}
              </div>
              <p style={{ 
                fontSize: '1.3rem', 
                color: uploadSuccess ? '#48bb78' : '#2d3748',
                marginBottom: '0.5rem',
                fontWeight: '600'
              }}>
                {uploadSuccess ? 'Upload Complete!' : 'Recording Complete'}
              </p>
              {/* no time shown in UI */}
              
              {!uploadSuccess && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    style={{
                      padding: '1rem 2.5rem',
                      background: uploading ? '#a0aec0' : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '1.05rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 15px rgba(72, 187, 120, 0.3)',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      if (!uploading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(72, 187, 120, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!uploading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(72, 187, 120, 0.3)';
                      }
                    }}
                  >
                    {uploading ? 'Uploading...' : 'Submit & Download'}
                  </button>
                </div>
              )}
              
              {uploadSuccess && (
                <p style={{ color: '#48bb78', marginBottom: '2rem', fontSize: '0.95rem' }}>
                  Recording saved and downloaded successfully
                </p>
              )}
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={resetRecording}
                  style={{
                    padding: '0.85rem 1.75rem',
                    background: 'white',
                    color: '#667eea',
                    border: '2px solid #667eea',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#667eea';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.color = '#667eea';
                  }}
                >
                  {uploadSuccess ? 'New Recording' : 'Record Again'}
                </button>
                <button
                  onClick={() => {
                    const meta={ testDate: new Date().toISOString(), durationSec: recordingTime };
                    if(embedded){ onDone?.({ wavBlob: audioChunksRef.current.length? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null, meta }); }
                    else { window.location.href = '/'; }
                  }}
                  style={{
                    padding: '0.85rem 1.75rem',
                    background: '#f7fafc',
                    color: '#718096',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = '#f7fafc';
                  }}
                >
                  {embedded ? 'Continue' : 'Back to Home'}
                </button>
              </div>
            </div>
          )}
        </div>

        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `}</style>
      </div>
    </div>
  );
}