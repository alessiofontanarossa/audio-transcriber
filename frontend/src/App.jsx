import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  CheckCircle2, 
  FileAudio, 
  Zap, 
  Clock, 
  X, 
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState('full');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const addFiles = (newFiles) => {
    const newFilesArray = Array.from(newFiles).map(file => ({
      id: Math.random().toString(36).substring(7),
      rawFile: file,
      status: 'idle', // idle, processing, completed, error
      progress: 0,
      text: '',
      cost: 0,
      error: '',
      taskId: null
    }));
    setFiles(prev => [...prev, ...newFilesArray]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const pollStatus = async (id, taskId) => {
    try {
      const response = await fetch(`${API_BASE}/status/${taskId}`);
      if (!response.ok) throw new Error('Impossibile recuperare lo stato');
      const data = await response.json();
      
      setFiles(prev => prev.map(f => {
        if (f.id === id) {
          return {
            ...f,
            status: data.status,
            progress: data.progress,
            cost: data.cost,
            text: data.text || '',
            error: data.error || ''
          };
        }
        return f;
      }));

      if (data.status === 'processing') {
        setTimeout(() => pollStatus(id, taskId), 2000);
      }
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', error: err.message } : f));
    }
  };

  const startTranscription = async (fileObj) => {
    setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing', progress: 0 } : f));
    
    const formData = new FormData();
    formData.append('file', fileObj.rawFile);
    formData.append('mode', mode);

    try {
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Caricamento non riuscito');
      }

      const data = await response.json();
      const taskId = data.task_id;
      
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, taskId } : f));
      
      pollStatus(fileObj.id, taskId);
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: err.message } : f));
    }
  };

  const submitAll = () => {
    files.forEach(f => {
      if (f.status === 'idle') {
        startTranscription(f);
      }
    });
  };

  const anyIdle = files.some(f => f.status === 'idle');

  return (
    <div className="container">
      <motion.div 
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="header">
          <h1>Audio Transcriber</h1>
          <p>Trascrivi i tuoi file audio in italiano con Whisper AI di OpenAI</p>
        </div>

        <div 
          className={`upload-area ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            style={{ display: 'none' }} 
            accept="audio/*"
            multiple
          />
          <div>
            <UploadCloud className="upload-icon" />
            <div className="upload-text">Clicca per caricare o trascina i file audio</div>
            <div className="upload-subtext">Supporta più file contemporaneamente (MP3, M4A, WAV)</div>
          </div>
        </div>

        <div className="options-container">
          <div 
            className={`option-card ${mode === 'full' ? 'active' : ''}`}
            onClick={() => setMode('full')}
          >
            <div className="option-title">
              <Zap size={20} color={mode === 'full' ? '#6366f1' : '#94a3b8'} />
              Full Process
            </div>
            <div className="option-desc">
              Trascrive l'intero file in un'unica chiamata. Ideale per audio brevi sotto i 25MB.
            </div>
          </div>
          <div 
            className={`option-card ${mode === 'batched' ? 'active' : ''}`}
            onClick={() => setMode('batched')}
          >
            <div className="option-title">
              <Clock size={20} color={mode === 'batched' ? '#6366f1' : '#94a3b8'} />
              Batched Process
            </div>
            <div className="option-desc">
              Divide l'audio in finestre da 15 minuti con sovrapposizione. Salva i progressi su file.
            </div>
          </div>
        </div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div 
              className="files-list"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              {files.map(f => (
                <div key={f.id} className="file-item">
                  <div className="file-item-header">
                    <div className="file-info">
                      <FileAudio size={20} className="file-icon" />
                      <span className="file-name">{f.rawFile.name}</span>
                      <span className="file-size">{(f.rawFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    {f.status === 'idle' && (
                      <button className="remove-btn" onClick={() => removeFile(f.id)} title="Rimuovi">
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  <div className="file-status-bar">
                    {f.status === 'processing' && (
                      <div className="progress-container">
                        <div className="progress-bar">
                          <motion.div 
                            className="progress-fill" 
                            initial={{ width: 0 }}
                            animate={{ width: `${f.progress}%` }} 
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="progress-text">
                          <Loader2 size={14} className="spin-icon" /> {f.progress}%
                        </span>
                      </div>
                    )}
                    {f.status === 'completed' && (
                      <div className="completed-info">
                        <span className="success-text"><CheckCircle2 size={16} /> Completato</span>
                        <span className="cost-text">Costo Stimato: ${f.cost.toFixed(4)}</span>
                      </div>
                    )}
                    {f.status === 'error' && (
                      <span className="error-text">Errore: {f.error}</span>
                    )}
                  </div>
                  
                  {f.status === 'completed' && f.text && (
                     <div className="result-text-preview">
                       {f.text}
                     </div>
                  )}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {files.length > 0 && (
          <button 
            className="submit-btn" 
            onClick={submitAll}
            disabled={!anyIdle}
            style={{ marginTop: '1.5rem' }}
          >
            {anyIdle ? (
              <>
                <Zap size={20} />
                Avvia Trascrizione in Parallelo
              </>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Tutti i file sono stati elaborati
              </>
            )}
          </button>
        )}

      </motion.div>
    </div>
  );
}

export default App;
