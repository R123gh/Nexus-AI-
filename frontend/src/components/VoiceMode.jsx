import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2, VolumeX } from 'lucide-react';
import { apiVoice } from '../utils/api';

const VoiceMode = ({ settings, user, isMuted, setIsMuted }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Standby');
  const [visualizerData, setVisualizerData] = useState(new Array(30).fill(0));
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const synthRef = useRef(window.speechSynthesis);
  const isMutedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
    if (isMuted && isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setStatus('Standby');
    }
  }, [isMuted, isSpeaking]);

  // Initialize MediaRecorder when listening starts
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsListening(true);
        setStatus('Listening...');
        setTranscript('');
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setStatus('Processing...');
        setTranscript('Transcribing audio...');
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        await processVoiceInput(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setStatus('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.stop();
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [isListening]);

  // Handle the processing of the voice transcript
  const processVoiceInput = async (audioBlob) => {
    try {
      setStatus('Thinking...');
      
      const data = await apiVoice(audioBlob, settings, user?.id);
      
      const aiResponse = data.response || "I understood you, but I couldn't generate a response.";
      const transcriptText = data.transcript || "";

      if (transcriptText) {
        setTranscript(`You: "${transcriptText}"\n\nAI: ${aiResponse}`);
      } else {
        setTranscript(aiResponse);
      }
      
      setStatus('Responding...');
      speakResponse(aiResponse);
      
    } catch (error) {
      console.error("Voice processing error:", error);
      setStatus('Error');
      setTranscript(`Error: ${error.message || 'Something went wrong. Please try again.'}`);
    }
  };

  const speakResponse = (text) => {
    if (!synthRef.current || isMutedRef.current) {
        setStatus('Standby');
        return;
    }
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.text = text.replace(/[*#`_]/g, '');
    utterance.rate = 1.05; 
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Standby');
    };
    
    synthRef.current.speak(utterance);
  };

  // Simulate visualizer
  useEffect(() => {
    if (isListening || isSpeaking) {
      timerRef.current = setInterval(() => {
        setVisualizerData(prev => prev.map(() => Math.random() * 100));
      }, 100);
    } else {
      clearInterval(timerRef.current);
      setVisualizerData(new Array(30).fill(2));
    }
    return () => clearInterval(timerRef.current);
  }, [isListening, isSpeaking]);

  const toggleListening = () => {
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
      setStatus('Standby');
      return;
    }

    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="voice-mode-container" style={{ 
      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)', padding: '32px'
    }}>
      <div className="voice-visualizer" style={{ 
        display: 'flex', alignItems: 'center', gap: '4px', height: '120px', marginBottom: '64px' 
      }}>
        {visualizerData.map((h, i) => (
          <div 
            key={i} 
            style={{ 
              width: '4px', height: `${h}%`, background: (isListening || isSpeaking) ? 'var(--text-0)' : 'var(--text-2)',
              borderRadius: '2px', transition: 'height 0.1s ease-out'
            }} 
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '64px', width: '100%', maxWidth: '800px' }}>
        <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-2)', marginBottom: '16px' }}>
          {status}
        </h2>
        <div style={{ 
          maxHeight: '300px', 
          overflowY: 'auto', 
          padding: '0 20px'
        }}>
          <p style={{ 
            fontSize: '1.2rem', 
            fontWeight: '500', 
            color: 'var(--text-0)', 
            lineHeight: '1.6',
            minHeight: '1.5em'
          }}>
            {transcript || (isListening ? 'Speak now...' : 'Tap the microphone to start')}
          </p>
        </div>
      </div>

      <button 
        onClick={toggleListening}
        style={{
          width: '80px', height: '80px', borderRadius: '50%', background: isListening ? 'var(--error)' : 'var(--text-0)',
          color: isListening ? '#ffffff' : 'var(--bg-0)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)',
          boxShadow: (isListening || isSpeaking) ? '0 0 30px rgba(255,255,255,0.1)' : 'none'
        }}
      >
        {isListening ? <MicOff size={32} /> : (isSpeaking ? <VolumeX size={32} /> : <Mic size={32} />)}
      </button>

      <div style={{ marginTop: '48px', display: 'flex', gap: '24px' }}>
        <button 
          onClick={() => setIsMuted(!isMuted)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            color: isMuted ? 'var(--text-3)' : 'var(--text-1)', 
            fontSize: '0.85rem', background: 'transparent', border: 'none', 
            cursor: 'pointer', transition: 'color 0.2s'
          }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />} 
          {isMuted ? 'Auto-Speak Muted' : 'Auto-Speak Enabled'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-2)', fontSize: '0.85rem' }}>
          <Loader2 size={16} className={status === 'Thinking...' ? 'animate-spin' : ''} /> Real-time Processing
        </div>
      </div>
    </div>
  );
};

export default VoiceMode;
