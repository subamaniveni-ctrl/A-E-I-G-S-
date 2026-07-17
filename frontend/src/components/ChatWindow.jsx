import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Volume2, PlayCircle, Loader2 } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';
import api from '../lib/api';

export default function ChatWindow({ token, onQuizRequested }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [ws, setWs] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const messagesEndRef = useRef(null);
  
  const sessionId = useRef(`session_${Math.random().toString(36).substring(7)}`).current;
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/chat/ws/${sessionId}?token=${token}`;
      
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => setIsConnected(true);
    websocket.onclose = () => setIsConnected(false);
    
    let currentAssistantMsg = '';
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'start') {
        currentAssistantMsg = '';
        setMessages(prev => [...prev, { role: 'assistant', content: '', id: Date.now() }]);
      } else if (data.type === 'chunk') {
        currentAssistantMsg += data.content;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].content = currentAssistantMsg;
          return newMsgs;
        });
      } else if (data.type === 'message') {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content, actions: data.actions, id: Date.now() }]);
      } else if (data.type === 'end') {
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1].actions = data.actions;
          return newMsgs;
        });
      } else if (data.type === 'status') {
         setMessages(prev => [...prev, { role: 'system', content: data.content, id: Date.now() }]);
      }
    };

    setWs(websocket);
    return () => websocket.close();
  }, [token, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (text) => {
    if (!text.trim() || !ws) return;
    
    setMessages(prev => [...prev, { role: 'user', content: text, id: Date.now() }]);
    ws.send(JSON.stringify({ message: text }));
    setInput('');
  };

  const handleAction = async (action) => {
    if (action.type === 'quiz') {
      if (onQuizRequested) onQuizRequested(action.topic);
    } else if (action.type === 'tts') {
      playTTS(action.text);
    }
  };

  const playTTS = async (text) => {
    if (isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      const res = await api.post('/speech/tts', { text }, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      audioRef.current.src = url;
      audioRef.current.play();
      audioRef.current.onended = () => setIsPlayingAudio(false);
    } catch (err) {
      console.error("TTS Error:", err);
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold tracking-wide">Aegis AI Chat</h2>
            <p className={`text-[10px] font-semibold flex items-center gap-1 ${isConnected ? 'text-emerald-400' : 'text-red-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
              {isConnected ? 'Connected & Listening' : 'AI Offline (Click Settings to Configure)'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center p-8 space-y-6">
            <div className="p-4 rounded-3xl bg-primary/10 border border-primary/20 text-primary animate-pulse-glow">
              <Bot className="w-12 h-12" />
            </div>
            
            <div className="text-center max-w-md space-y-2">
              <h3 className="text-xl font-bold">Talk to A.E.G.I.S</h3>
              <p className="text-muted-foreground text-sm">
                Say something like <span className="text-primary italic">"Aegis, let's prepare for DBMS"</span>. Your study companion will summarize notes, prompt active recall quizzes, and speak response answers.
              </p>
            </div>

            {!isConnected && (
              <div className="w-full max-w-md p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-left space-y-3 shadow-xl">
                <p className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                  Local AI Core Offline
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A.E.G.I.S operates local-first to protect study note privacy. To get started:
                </p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4 font-semibold">
                  <li>Install and run <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-primary hover:underline">Ollama</a>.</li>
                  <li>Pull the default model in your terminal: <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-[11px] text-white">ollama run llama3</code>.</li>
                  <li>If you already have models, configure your endpoint and select models in the <span className="text-primary font-semibold">Settings</span> tab.</li>
                </ol>
              </div>
            )}
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'}`}>
            {msg.role === 'system' ? (
              <div className="text-xs text-primary animate-pulse bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                {msg.content}
              </div>
            ) : (
              <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-gradient-to-br from-primary to-accent' : 'bg-primary/20 text-primary border border-primary/30'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className="space-y-2">
                  <div className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground rounded-tr-sm shadow-lg shadow-primary/10' : 'glass bg-white/[0.04] border border-white/[0.08] rounded-tl-sm shadow-md'}`}>
                    <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                  
                  {/* Actions (Quiz/TTS) */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex gap-2 justify-start flex-wrap">
                      {msg.actions.map((act, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(act)}
                          disabled={act.type === 'tts' && isPlayingAudio}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 hover:text-indigo-200 border border-indigo-500/30 transition-colors cursor-pointer"
                        >
                          {act.type === 'quiz' ? <PlayCircle className="w-3.5 h-3.5" /> : (isPlayingAudio && act.type === 'tts' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />)}
                          {act.type === 'quiz' ? `Take Quiz: ${act.topic}` : 'Read Aloud'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-black/20 border-t border-white/10">
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <VoiceRecorder onTranscription={(text) => handleSend(text)} />
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(input);
                }
              }}
              placeholder="Message Aegis..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none max-h-32 text-sm"
              rows={1}
            />
            <button 
              onClick={() => handleSend(input)}
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 p-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
