import { useState, useEffect } from 'react';
import { Brain, BookOpen, Target, Activity, Settings } from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import NoteUploader from '../components/NoteUploader';
import QuizView from '../components/QuizView';
import ProgressTracker from '../components/ProgressTracker';
import SettingsView from '../components/SettingsView';

export default function Dashboard({ token }) {
  const [activeTab, setActiveTab] = useState('chat');
  const [activeQuizTopic, setActiveQuizTopic] = useState(null);

  const startQuiz = (topic) => {
    setActiveQuizTopic(topic);
    setActiveTab('quiz');
  };

  const endQuiz = () => {
    setActiveQuizTopic(null);
    setActiveTab('progress');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-6rem)]">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="glass-card p-4 space-y-2">
          <NavItem 
            icon={<Brain />} 
            label="Aegis AI Chat" 
            active={activeTab === 'chat'} 
            onClick={() => setActiveTab('chat')} 
          />
          <NavItem 
            icon={<BookOpen />} 
            label="My Notes" 
            active={activeTab === 'notes'} 
            onClick={() => setActiveTab('notes')} 
          />
          <NavItem 
            icon={<Target />} 
            label="Quizzes" 
            active={activeTab === 'quiz'} 
            onClick={() => setActiveTab('quiz')} 
          />
          <NavItem 
            icon={<Activity />} 
            label="Progress" 
            active={activeTab === 'progress'} 
            onClick={() => setActiveTab('progress')} 
          />
          <NavItem 
            icon={<Settings />} 
            label="Settings" 
            active={activeTab === 'settings'} 
            onClick={() => setActiveTab('settings')} 
          />
        </div>
        
        {/* Quick Stats Mini-Widget */}
        <div className="glass-card p-6 mt-auto hidden lg:block bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
          <h3 className="text-sm font-semibold mb-2">Ready to study?</h3>
          <p className="text-xs text-muted-foreground">
            Ask Aegis to summarize a note, or say "let's prepare for an exam" to begin.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-3 h-full glass-card overflow-hidden flex flex-col relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 pointer-events-none" />
        
        {activeTab === 'chat' && <ChatWindow token={token} onQuizRequested={startQuiz} />}
        {activeTab === 'notes' && <NoteUploader />}
        {activeTab === 'quiz' && <QuizView initialTopic={activeQuizTopic} onComplete={endQuiz} />}
        {activeTab === 'progress' && <ProgressTracker />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        active 
          ? 'bg-primary/20 text-primary border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' 
          : 'hover:bg-white/5 text-muted-foreground hover:text-foreground border border-transparent'
      }`}
    >
      <div className={`w-5 h-5 ${active ? 'animate-pulse' : ''}`}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
    </button>
  );
}
