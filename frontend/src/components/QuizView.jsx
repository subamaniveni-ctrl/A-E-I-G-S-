import { useState, useEffect } from 'react';
import { Target, CheckCircle2, XCircle, ArrowRight, Loader2, Award } from 'lucide-react';
import api from '../lib/api';

export default function QuizView({ initialTopic, onComplete }) {
  const [topic, setTopic] = useState(initialTopic || '');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Quiz active state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (initialTopic) {
      handleGenerate(initialTopic);
    }
  }, [initialTopic]);

  const handleGenerate = async (searchTopic) => {
    const t = searchTopic || topic;
    if (!t.trim()) return;
    
    setLoading(true);
    setQuestions([]);
    setIsSubmitted(false);
    setResult(null);
    setCurrentIndex(0);
    setAnswers({});
    
    try {
      const res = await api.post('/quiz/generate', { topic: t, num_questions: 5 });
      setQuestions(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate quiz. Is Ollama running locally?');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qId, option) => {
    setAnswers(prev => ({ ...prev, [qId]: option }));
  };

  const handleShortAnswer = (qId, text) => {
    setAnswers(prev => ({ ...prev, [qId]: text }));
  };

  const handleSubmit = async () => {
    const submission = questions.map(q => ({
      id: q.id,
      type: q.type,
      question: q.question,
      user_answer: answers[q.id] || '',
      correct_answer: q.correct_answer
    }));

    setLoading(true);
    try {
      const res = await api.post('/quiz/submit', {
        topic_name: topic || initialTopic || 'General Study',
        answers: submission
      });
      setResult(res.data);
      setIsSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
          <Loader2 className="w-12 h-12 animate-spin text-primary relative z-10" />
        </div>
        <p className="text-muted-foreground animate-pulse">
          {isSubmitted ? 'Grading answers...' : 'Aegis is generating your quiz...'}
        </p>
      </div>
    );
  }

  if (isSubmitted && result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-green-500/20">
          <Award className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          You scored {result.score} out of {result.total_questions} ({result.percentage.toFixed(0)}%)
        </p>
        
        <div className="w-full space-y-4 text-left max-h-[40vh] overflow-y-auto pr-4 mb-8">
          {result.answers.map((ans, i) => (
            <div key={i} className={`p-4 rounded-xl border ${ans.is_correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
              <div className="flex items-start gap-3">
                {ans.is_correct ? <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />}
                <div>
                  <p className="font-medium text-sm mb-2">{ans.question}</p>
                  <p className="text-xs text-muted-foreground mb-1">Your answer: <span className={ans.is_correct ? 'text-green-400' : 'text-red-400'}>{ans.user_answer || '(No answer)'}</span></p>
                  {!ans.is_correct && (
                    <p className="text-xs text-green-400">Correct answer: {ans.correct_answer}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <button 
          onClick={onComplete}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-3 rounded-xl transition-all"
        >
          View Progress
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto text-center">
        <div className="w-16 h-16 bg-primary/20 text-primary rounded-2xl flex items-center justify-center mb-6">
          <Target className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-3">Generate a Quiz</h2>
        <p className="text-muted-foreground mb-8 text-sm">
          Enter a topic you've uploaded notes for, and Aegis will instantly generate a structured quiz to test your active recall.
        </p>
        <div className="w-full relative">
          <input 
            type="text"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="e.g. DBMS, Biology, History..."
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
          />
          <button 
            onClick={() => handleGenerate()}
            disabled={!topic}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="flex flex-col h-full p-6 lg:p-8 max-w-3xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold">Quiz: {topic || initialTopic}</h2>
        <div className="bg-white/10 px-3 py-1 rounded-full text-xs font-medium">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/10 rounded-full mb-10 overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300" 
          style={{ width: `${((currentIndex) / questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1">
        <div className="glass bg-white/5 p-6 md:p-8 rounded-2xl border border-white/10">
          <h3 className="text-lg md:text-xl font-medium mb-6 leading-relaxed">
            {q.question}
          </h3>
          
          {q.type === 'mcq' ? (
            <div className="space-y-3">
              {q.options?.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(q.id, opt)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all ${
                    answers[q.id] === opt 
                      ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]' 
                      : 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${answers[q.id] === opt ? 'border-primary' : 'border-muted-foreground'}`}>
                      {answers[q.id] === opt && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <textarea 
              value={answers[q.id] || ''}
              onChange={(e) => handleShortAnswer(q.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          )}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="px-6 py-2.5 rounded-xl border border-white/10 text-muted-foreground hover:bg-white/5 hover:text-white transition-colors disabled:opacity-30"
        >
          Previous
        </button>
        
        {currentIndex === questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
            className="px-8 py-2.5 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors flex items-center gap-2"
          >
            Next <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
