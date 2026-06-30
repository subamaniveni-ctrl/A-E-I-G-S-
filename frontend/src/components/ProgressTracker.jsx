import { useState, useEffect } from 'react';
import { Flame, Clock, Target, AlertCircle, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

export default function ProgressTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await api.get('/progress');
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Study Progress</h2>
        <p className="text-muted-foreground text-sm">Track your analytics, mastery levels, and study streaks.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="glass bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-500 flex items-center justify-center">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{data.streak} <span className="text-sm font-normal text-muted-foreground">days</span></p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Streak</p>
          </div>
        </div>
        
        <div className="glass bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{Math.floor(data.total_study_minutes / 60)}h {Math.round(data.total_study_minutes % 60)}m</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Time Studied</p>
          </div>
        </div>

        <div className="glass bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{data.average_quiz_score}%</p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Avg Score</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Timeline Chart */}
        <div className="lg:col-span-2 glass bg-white/5 border border-white/10 p-6 rounded-2xl">
          <h3 className="text-lg font-semibold mb-6">Study Timeline (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.timeline}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dy={10} />
                <YAxis hide={true} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#333', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMinutes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weak Areas */}
        <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Focus Areas</h3>
          </div>
          
          <div className="flex-1">
            {data.weak_topics.length > 0 ? (
              <ul className="space-y-3">
                {data.weak_topics.map((topic, i) => (
                  <li key={i} className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl flex items-center justify-between">
                    <span className="font-medium text-sm">{topic}</span>
                    <span className="text-xs text-red-400 font-medium px-2 py-1 bg-red-500/10 rounded-md">Needs Review</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm">You have no weak areas currently.<br/>Great job!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subject Mastery List */}
      <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl">
        <h3 className="text-lg font-semibold mb-6">Subject Mastery</h3>
        {data.subject_mastery.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects studied yet. Start chatting or take a quiz to build mastery!</p>
        ) : (
          <div className="space-y-6">
            {data.subject_mastery.map((sub, i) => (
              <div key={i}>
                <div className="flex justify-between items-end mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{sub.subject}</span>
                    <span className="text-xs text-muted-foreground">{sub.quizzes_taken} quizzes taken</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{sub.mastery}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${sub.mastery < 40 ? 'bg-red-500' : sub.mastery < 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${sub.mastery}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
