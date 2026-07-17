import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import api from './lib/api'

function App() {
  const [token, setToken] = useState(localStorage.getItem('aegis_token'));
  const [ollamaConnected, setOllamaConnected] = useState(null);

  useEffect(() => {
    // Check auth on mount
    const storedToken = localStorage.getItem('aegis_token');
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) return;
    const checkOllama = async () => {
      try {
        const res = await api.get('/ollama/status');
        setOllamaConnected(res.data.connected);
      } catch (err) {
        setOllamaConnected(false);
      }
    };
    checkOllama();
    const interval = setInterval(checkOllama, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('aegis_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('aegis_token');
    setToken(null);
  };

  if (!token) {
    return <AuthPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-white/10 bg-black/20 backdrop-blur-md px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-lg shadow-primary/20">
            A
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-extrabold tracking-wider text-xl bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">A.E.G.I.S</h1>
            <span className={`text-[10px] flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border transition-all ${
              ollamaConnected === true 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]' 
                : ollamaConnected === false 
                  ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse'
                  : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                ollamaConnected === true 
                  ? 'bg-emerald-400' 
                  : ollamaConnected === false 
                    ? 'bg-red-400' 
                    : 'bg-yellow-400'
              }`} />
              {ollamaConnected === true 
                ? 'AI Core Active' 
                : ollamaConnected === false 
                  ? 'AI Core Offline' 
                  : 'Checking AI Core...'}
            </span>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="text-sm font-medium text-muted-foreground hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
        >
          Logout
        </button>
      </nav>
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<Dashboard token={token} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
