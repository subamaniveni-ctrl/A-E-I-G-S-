import { useState, useEffect } from 'react';
import { Settings, Server, Cpu, RefreshCw, Download, CheckCircle, AlertTriangle, Play, Sparkles, BookOpen } from 'lucide-react';
import api from '../lib/api';

export default function SettingsView() {
  const [settings, setSettings] = useState({
    base_url: 'http://localhost:11434',
    model: 'llama3',
    system_prompt_override: ''
  });
  
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pullModelName, setPullModelName] = useState('');
  const [pullingMsg, setPullingMsg] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Poll intervals
  useEffect(() => {
    fetchOllamaStatus();
    
    // Set up polling for status (especially background pulls)
    const interval = setInterval(() => {
      fetchOllamaStatus(true); // silent fetch
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const fetchOllamaStatus = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/ollama/status');
      setStatusData(res.data);
      setSettings({
        base_url: res.data.base_url,
        model: res.data.model,
        system_prompt_override: res.data.system_prompt_override || ''
      });

      if (res.data.pull_status?.is_pulling) {
        setPullingMsg(`Downloading ${res.data.pull_status.current_model} in background...`);
      } else if (res.data.pull_status?.success) {
        setPullingMsg(`Successfully downloaded!`);
        setTimeout(() => setPullingMsg(null), 5000);
      } else if (res.data.pull_status?.error) {
        setPullingMsg(`Download failed: ${res.data.pull_status.error}`);
      } else {
        setPullingMsg(null);
      }
    } catch (err) {
      console.error("Error fetching Ollama status:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.post('/ollama/settings', settings);
      setSaveSuccess(true);
      fetchOllamaStatus(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handlePullModel = async (e) => {
    e.preventDefault();
    if (!pullModelName.trim()) return;

    try {
      setPullingMsg(`Initiating download for ${pullModelName}...`);
      await api.post('/ollama/pull', { model: pullModelName });
      setPullModelName('');
      fetchOllamaStatus(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start downloading.');
    }
  };

  const selectSuggestedPrompt = (prompt) => {
    setSettings(prev => ({ ...prev, system_prompt_override: prompt }));
  };

  const suggestedPrompts = [
    {
      label: "Socratic Tutor",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      text: "Explain concepts by asking guided questions. Do not directly give full answers immediately. Guide me to find the answers."
    },
    {
      label: "Simplify (ELI5)",
      icon: <BookOpen className="w-3.5 h-3.5" />,
      text: "Explain everything like I'm a 10 year old student. Use funny, simple analogies and avoid complex jargon."
    },
    {
      label: "Strict Professor",
      icon: <Cpu className="w-3.5 h-3.5" />,
      text: "Use highly technical academic language, focus on performance/accuracy, and provide thorough, detail-rich explanations."
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isConnected = statusData?.connected;

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" />
            AI Companion Settings
          </h2>
          <p className="text-muted-foreground text-sm">Configure local Ollama options and modify Aegis's learning personality.</p>
        </div>
        
        <button 
          onClick={() => fetchOllamaStatus()}
          className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
          title="Refresh connection status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection & Configuration Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveSettings} className="glass bg-white/5 border border-white/10 p-6 rounded-3xl space-y-6">
            <h3 className="font-bold text-lg border-b border-white/5 pb-3">Ollama Connection Parameters</h3>

            <div className="space-y-4">
              {/* API Endpoint URL */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ollama Host API URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Server className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={settings.base_url}
                    onChange={e => setSettings(prev => ({ ...prev, base_url: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono"
                    placeholder="http://localhost:11434"
                    required
                  />
                </div>
              </div>

              {/* Active Model Selector */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Active LLM Model</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Cpu className="w-4 h-4" />
                  </span>
                  {statusData?.available_models?.length > 0 ? (
                    <select
                      value={settings.model}
                      onChange={e => setSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm appearance-none cursor-pointer"
                    >
                      {statusData.available_models.map(m => (
                        <option key={m} value={m} className="bg-neutral-900 text-white">{m}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={settings.model}
                      onChange={e => setSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                      placeholder="e.g. llama3"
                      required
                    />
                  )}
                </div>
              </div>

              {/* AI Personality/Tutor override */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutor Study Personality Suffix</label>
                  <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-semibold">Custom Directive</span>
                </div>
                <textarea
                  value={settings.system_prompt_override}
                  onChange={e => setSettings(prev => ({ ...prev, system_prompt_override: e.target.value }))}
                  className="w-full h-28 bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm placeholder:text-muted-foreground/30"
                  placeholder="e.g., 'Focus explanations on computer science concepts, use code blocks often, and explain formulas clearly.'"
                />
                
                {/* Suggestions Quick Buttons */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {suggestedPrompts.map(sp => (
                    <button
                      key={sp.label}
                      type="button"
                      onClick={() => selectSuggestedPrompt(sp.text)}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                    >
                      {sp.icon}
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              
              {saveSuccess && (
                <span className="text-emerald-400 text-sm flex items-center gap-1.5 animate-pulse">
                  <CheckCircle className="w-4 h-4" /> Changes applied!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Status Dashboard & Downloads */}
        <div className="space-y-6">
          {/* Status Panel Card */}
          <div className="glass bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg border-b border-white/5 pb-3">Ollama Engine Status</h3>
            
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`} />
              <div>
                <p className="font-semibold text-sm">{isConnected ? 'Server Connected' : 'Offline / Unreachable'}</p>
                <p className="text-xs text-muted-foreground">{isConnected ? 'Ready for queries' : 'Check if Ollama is running locally'}</p>
              </div>
            </div>

            {isConnected ? (
              <div className="pt-2 space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-muted-foreground">Running Model:</span>
                  <span className="font-mono text-primary font-semibold">{statusData?.model}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-muted-foreground">Local Models Installed:</span>
                  <span className="font-mono">{statusData?.available_models?.length || 0}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Host Address:</span>
                  <span className="font-mono text-muted-foreground">{statusData?.base_url}</span>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex gap-3 text-xs text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-semibold mb-1">Service Unreachable</p>
                  <p className="leading-relaxed opacity-80">Make sure your Ollama process is active. Run <code className="bg-black/30 px-1 py-0.5 rounded font-mono">ollama serve</code> in your local command prompt.</p>
                </div>
              </div>
            )}
          </div>

          {/* Pull/Download Model Card */}
          <div className="glass bg-white/5 border border-white/10 p-6 rounded-3xl space-y-4">
            <h3 className="font-bold text-lg border-b border-white/5 pb-3">Pull New AI Model</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Download any LLM directly from the Ollama library (e.g. <code className="bg-white/5 font-mono px-1 py-0.5 rounded">phi3</code>, <code className="bg-white/5 font-mono px-1 py-0.5 rounded">mistral</code>, or <code className="bg-white/5 font-mono px-1 py-0.5 rounded">gemma:2b</code>) without exiting the study companion.
            </p>

            <form onSubmit={handlePullModel} className="space-y-3">
              <input
                type="text"
                value={pullModelName}
                onChange={e => setPullModelName(e.target.value)}
                placeholder="e.g. phi3"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                required
                disabled={statusData?.pull_status?.is_pulling}
              />
              <button
                type="submit"
                disabled={!isConnected || statusData?.pull_status?.is_pulling || !pullModelName.trim()}
                className="w-full bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/20 disabled:opacity-40 disabled:hover:bg-indigo-500/20 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" /> Download Model
              </button>
            </form>

            {/* Pull progress status */}
            {pullingMsg && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-xs text-indigo-300">
                <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                <p className="leading-tight">{pullingMsg}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
