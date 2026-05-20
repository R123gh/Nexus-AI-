import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Plus, Upload, MessageSquare, FileText, Trash2, ArrowLeft,
  ChevronRight, Search, BookOpen, Loader2, CheckCircle, AlertCircle,
  BarChart2, Info, Settings, Layout, Layers, Shield, RefreshCw
} from 'lucide-react';
import { 
  apiGetKBs, apiCreateKB, apiUploadKB, 
  apiDeleteKB, apiDeleteKBFile, apiGetKBChunks 
} from '../utils/api';
import { createNotification } from '../utils/notifications';

const KnowledgeBases = ({ onSelectKB, user }) => {
  const [kbs, setKbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedKb, setSelectedKb] = useState(null);
  const [activeTab, setActiveTab] = useState('documents'); // 'overview', 'documents', 'chunks', 'settings'
  const [chunks, setChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const fetchKBs = async () => {
    try {
      const data = await apiGetKBs();
      setKbs(data);
      if (selectedKb) {
        const updated = data.find(k => k.id === selectedKb.id);
        if (updated) setSelectedKb(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKBs(); }, []);

  const fetchChunks = async (kbId) => {
    setLoadingChunks(true);
    try {
      const data = await apiGetKBChunks(kbId);
      setChunks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChunks(false);
    }
  };

  useEffect(() => {
    if (selectedKb && activeTab === 'chunks') {
      fetchChunks(selectedKb.id);
    }
  }, [selectedKb?.id, activeTab]);

  const handleCreateKB = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await apiCreateKB(newName, newDesc);
      createNotification(user?.id, 'Knowledge Base Created', `Successfully initialized ${newName}`, 'success');
      setNewName('');
      setNewDesc('');
      setShowCreate(false);
      fetchKBs();
    } catch (e) {
      console.error(e);
      createNotification(user?.id, 'Failed to Create KB', e.message || 'Could not initialize Knowledge Base.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKB = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this Knowledge Base? All data will be lost.')) return;
    try {
      await apiDeleteKB(id);
      createNotification(user?.id, 'Knowledge Base Deleted', `${name} has been removed.`, 'warning');
      fetchKBs();
    } catch (e) {
      console.error(e);
      createNotification(user?.id, 'Failed to Delete KB', e.message || 'Could not remove Knowledge Base.', 'error');
    }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    try {
      await apiDeleteKBFile(selectedKb.id, filename);
      createNotification(user?.id, 'Document Deleted', `${filename} removed from index.`, 'warning');
      fetchKBs();
    } catch (e) {
      console.error(e);
      createNotification(user?.id, 'Failed to Delete Document', e.message || 'Could not remove document from index.', 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedKb) return;
    setUploading(true);
    try {
      await apiUploadKB(selectedKb.id, file);
      createNotification(user?.id, 'Indexing Complete', `${file.name} successfully vectorized.`, 'success');
      fetchKBs();
    } catch (e) {
      console.error(e);
      createNotification(user?.id, 'Indexing Failed', e.message || 'Could not upload and vectorize document.', 'error');
    } finally {
      setUploading(false);
    }
  };

  if (selectedKb) {
    return (
      <div className="flex flex-col h-full bg-[var(--bg-0)] animate-in fade-in duration-500">
        {/* Detail Header */}
        <header className="px-4 py-4 md:px-8 md:py-6 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-1)] backdrop-blur-md">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button className="p-2 bg-[var(--bg-2)] rounded-lg hover:bg-[var(--bg-hover)] transition-all" onClick={() => setSelectedKb(null)}>
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-[var(--text-0)]">{selectedKb.name}</h2>
              <p className="text-xs text-[var(--text-2)]">ID: {selectedKb.id}</p>
            </div>
          </div>
          <button 
            onClick={() => onSelectKB(selectedKb)}
            className="w-full sm:w-auto bg-[var(--accent)] hover:brightness-110 text-white px-6 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
          >
            <MessageSquare size={16} /> Open Chat
          </button>
        </header>

        {/* Tabs Navigation */}
        <nav className="flex px-4 md:px-8 bg-[var(--bg-1)] border-b border-[var(--border-subtle)] gap-4 md:gap-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'documents', label: 'Documents', icon: FileText },
            { id: 'chunks', label: 'Semantic Chunks', icon: Layers },
            { id: 'settings', label: 'Engine Settings', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 whitespace-nowrap font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === tab.id ? 'text-[var(--text-0)] border-[var(--text-0)]' : 'text-[var(--text-2)] border-transparent'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto">
            
            {activeTab === 'documents' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="text-xl font-extrabold text-[var(--text-0)]">Knowledge Source</h3>
                    <p className="text-sm text-[var(--text-2)]">Upload files to populate the semantic index.</p>
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 bg-[var(--text-0)] text-[var(--bg-0)] px-4 py-2 rounded-lg font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Add Document
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.txt" />
                </div>

                <div className="grid gap-4">
                  {(!selectedKb.files || selectedKb.files.length === 0) ? (
                    <div className="py-16 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-1)]">
                      <Upload size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-[var(--text-2)] font-medium">No documents found. Upload a file to begin indexing.</p>
                    </div>
                  ) : (
                    selectedKb.files.map((file, i) => (
                      <div key={i} className="group p-4 md:p-5 flex items-center gap-4 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-xl hover:border-[var(--accent)] transition-all">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm md:text-base font-bold text-[var(--text-0)] truncate">{file}</h4>
                          <div className="flex gap-4 text-xs text-[var(--text-2)] mt-1 font-medium">
                            <span>{file.split('.').pop()?.toUpperCase()}</span>
                            <span className="text-emerald-500 flex items-center gap-1">
                              <CheckCircle size={10} /> Indexed
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteFile(file)}
                          className="p-2 text-rose-500 bg-rose-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'chunks' && (
              <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--text-0)]">Semantic Index Inspector</h3>
                  <p className="text-sm text-[var(--text-2)]">Review the data segments extracted and vectorized for search.</p>
                </div>

                {loadingChunks ? (
                  <div className="py-16 flex justify-center">
                    <Loader2 size={32} className="animate-spin text-[var(--text-2)]" />
                  </div>
                ) : chunks.length === 0 ? (
                  <div className="py-16 text-center border border-dashed border-[var(--border-subtle)] rounded-xl">
                    <p className="text-[var(--text-2)] font-medium">No chunks available. Try uploading a document.</p>
                  </div>
                ) : (
                  <div className="grid gap-5">
                    {chunks.map((chunk, i) => (
                      <div key={i} className="p-6 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-xl relative group">
                        <div className="absolute top-4 right-4 text-[10px] font-bold tracking-tighter bg-[var(--bg-2)] px-2 py-1 rounded text-[var(--text-2)] uppercase">
                          Chunk #{i+1}
                        </div>
                        <p className="text-sm md:text-base leading-relaxed text-[var(--text-1)] mb-4 font-medium italic">
                          "{chunk.text}"
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent)] bg-[var(--accent)]/5 w-fit px-2 py-1 rounded">
                          <BookOpen size={12} /> Source: {chunk.source}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-xl space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <div>
                  <h3 className="text-xl font-extrabold text-[var(--text-0)]">Engine Configuration</h3>
                  <p className="text-sm text-[var(--text-2)]">Tune how the retrieval engine interacts with your data.</p>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-bold text-[var(--text-0)]">Retrieval Top-K</label>
                      <span className="text-lg font-black text-[var(--accent)]">5</span>
                    </div>
                    <p className="text-xs text-[var(--text-2)] font-medium">
                      Number of chunks to retrieve for each query. Higher values provide more context but may dilute the answer.
                    </p>
                    <input type="range" min="1" max="10" defaultValue="5" className="w-full h-1.5 bg-[var(--bg-2)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]" />
                  </div>

                  <div className="p-6 bg-[var(--accent)]/5 rounded-2xl border border-[var(--accent)]/10">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield size={18} className="text-[var(--accent)]" />
                      <h4 className="text-sm font-bold text-[var(--text-0)]">Hybrid Search Optimization</h4>
                    </div>
                    <p className="text-xs text-[var(--text-2)] leading-relaxed mb-4 font-medium">
                      The engine is currently using a combination of TF-IDF keyword matching and Semantic Vector Embeddings for maximum accuracy.
                    </p>
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-emerald-500 tracking-widest uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      System Active & Optimized
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto px-4 py-8 md:px-8 md:py-16 bg-[var(--bg-0)] animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-12 md:mb-16">
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-[var(--accent)] font-black text-[10px] tracking-widest uppercase">
              <Database size={20} />
              <span>Infrastructure Layer</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[var(--text-0)] leading-none">
              RAG Engine
            </h1>
            <p className="text-lg text-[var(--text-2)] max-w-xl font-medium leading-tight">
              Connect your documentation and personal knowledge to build context-aware AI agents.
            </p>
          </div>
          <button 
            onClick={() => setShowCreate(true)}
            className="w-full lg:w-auto bg-[var(--text-0)] text-[var(--bg-0)] px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
          >
            <Plus size={20} /> New Infrastructure
          </button>
        </header>

        {/* KB Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {loading ? (
            <div className="col-span-full py-32 flex justify-center">
              <Loader2 size={40} className="animate-spin text-[var(--text-2)]" />
            </div>
          ) : kbs.length === 0 ? (
            <div className="col-span-full py-24 px-8 text-center border-2 border-dashed border-[var(--border-subtle)] rounded-3xl bg-[var(--bg-1)]/50 backdrop-blur-sm">
              <Database size={64} className="mx-auto mb-6 opacity-10" />
              <h3 className="text-xl font-black text-[var(--text-0)] mb-2">Initialize Your Knowledge Base</h3>
              <p className="text-[var(--text-2)] mb-8 font-medium">Create your first index to start using RAG-powered intelligence.</p>
              <button 
                onClick={() => setShowCreate(true)}
                className="bg-[var(--accent)] text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-indigo-500/20"
              >
                Get Started
              </button>
            </div>
          ) : (
            kbs.map(kb => (
              <div 
                key={kb.id} 
                onClick={() => setSelectedKb(kb)}
                className="group p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-3xl cursor-pointer hover:border-[var(--accent)] hover:shadow-2xl hover:shadow-indigo-500/10 transition-all relative overflow-hidden active:scale-95"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <button 
                    onClick={(e) => handleDeleteKB(kb.id, kb.name, e)}
                    className="p-2 text-[var(--text-2)] hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <h4 className="text-xl font-black text-[var(--text-0)] mb-2 group-hover:text-[var(--accent)] transition-colors">{kb.name}</h4>
                <p className="text-sm text-[var(--text-2)] leading-relaxed mb-6 font-medium line-clamp-2 min-h-[2.5rem]">
                  {kb.description || "No description provided."}
                </p>
                <div className="flex gap-4">
                  <div className="px-3 py-1.5 bg-[var(--bg-2)] rounded-lg text-[10px] font-black tracking-widest uppercase">
                    {kb.files?.length || 0} Files
                  </div>
                  <div className="px-3 py-1.5 bg-[var(--bg-2)] rounded-lg text-[10px] font-black tracking-widest uppercase">
                    {kb.chunk_count || 0} Chunks
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowCreate(false)} />
          <div className="w-full max-w-md bg-[var(--bg-1)] p-8 rounded-3xl border border-[var(--border-subtle)] shadow-2xl relative z-10 animate-in slide-in-from-bottom-8 duration-500">
            <h2 className="text-2xl font-black tracking-tighter text-[var(--text-0)] mb-8">New Index</h2>
            <div className="space-y-6 mb-10">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mb-2 block">Index Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Legal Docs"
                  className="w-full p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-[var(--accent)] transition-all font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mb-2 block">Context Details</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="What knowledge does this hold?"
                  className="w-full p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] outline-none focus:border-[var(--accent)] transition-all font-bold resize-none h-32"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={handleCreateKB}
                className="flex-1 bg-[var(--accent)] text-white p-4 rounded-xl font-black hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-indigo-500/20"
              >
                Create Hub
              </button>
              <button 
                onClick={() => setShowCreate(false)}
                className="flex-1 bg-[var(--bg-2)] text-[var(--text-0)] p-4 rounded-xl font-bold hover:bg-[var(--bg-hover)] transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBases;
