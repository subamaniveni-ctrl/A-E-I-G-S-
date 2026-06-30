import { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function VoiceRecorder({ onTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'recording.webm');
          const res = await api.post('/speech/stt', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          if (res.data.transcript) {
            onTranscription(res.data.transcript);
          }
        } catch (error) {
          console.error('STT Error:', error);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  if (isProcessing) {
    return (
      <button disabled className="p-3 rounded-full bg-primary/20 text-primary border border-primary/30">
        <Loader2 className="w-5 h-5 animate-spin" />
      </button>
    );
  }

  return (
    <button
      onClick={isRecording ? stopRecording : startRecording}
      className={`p-3 rounded-full transition-all duration-300 ${
        isRecording 
          ? 'bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse' 
          : 'bg-white/5 text-muted-foreground hover:bg-primary/20 hover:text-primary border border-transparent hover:border-primary/30'
      }`}
      title={isRecording ? "Stop Recording" : "Start Voice Input"}
    >
      {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
