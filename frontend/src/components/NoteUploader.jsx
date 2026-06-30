import { useState, useEffect, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function NoteUploader() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notes');
      setNotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    setUploading(true);
    try {
      await api.post('/notes/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchNotes();
    } catch (err) {
      console.error("Upload error:", err);
      alert(err.response?.data?.detail || "Failed to upload note.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      fetchNotes();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full p-6 lg:p-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">My Knowledge Base</h2>
          <p className="text-muted-foreground text-sm">Upload PDFs or text files to let Aegis learn your curriculum.</p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept=".pdf,.txt,.md"
        />
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-5 py-2.5 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all disabled:opacity-70"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {uploading ? 'Processing...' : 'Upload Note'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
             <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <div className="border-2 border-dashed border-white/10 rounded-2xl h-64 flex flex-col items-center justify-center text-muted-foreground bg-white/5">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p>No notes uploaded yet.</p>
            <p className="text-sm">Click "Upload Note" to add study materials.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map(note => (
              <div key={note.id} className="glass bg-white/5 border border-white/10 hover:border-primary/50 transition-colors p-5 rounded-2xl group flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="font-semibold text-lg line-clamp-1 mb-1">{note.title}</h3>
                <p className="text-xs text-muted-foreground mb-4 font-mono">{note.filename}</p>
                
                <div className="mt-auto pt-4 border-t border-white/10 flex justify-between items-center text-xs text-muted-foreground">
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                  <span className="bg-white/10 px-2 py-1 rounded-md">{Math.round(note.extracted_text.length / 1000)}k chars</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
