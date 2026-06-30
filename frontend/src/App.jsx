import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'

function App() {
  const [token, setToken] = useState(localStorage.getItem('aegis_token'));

  useEffect(() => {
    // Check auth on mount
    const storedToken = localStorage.getItem('aegis_token');
    if (storedToken) setToken(storedToken);
  }, []);

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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            A
          </div>
          <h1 className="font-bold tracking-wider text-xl">A.E.G.I.S</h1>
        </div>
        <button 
          onClick={handleLogout}
          className="text-sm text-muted-foreground hover:text-white transition-colors"
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
