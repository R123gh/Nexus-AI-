import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart2, 
  Upload, 
  Table, 
  Settings, 
  Play, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  PieChart,
  LineChart,
  Info,
  ChevronRight,
  TrendingUp,
  Database,
  Cpu
} from 'lucide-react';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  ArcElement, 
  PointElement, 
  LineElement 
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { 
  apiDSUpload, 
  apiDSTrain, 
  apiDSVizData, 
  apiDSPredict,
  apiDSExportUrl,
  apiDSEda,
  apiDSClean,
  apiDSScatter
} from '../utils/api';
import { createNotification } from '../utils/notifications';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const DataScience = ({ user }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dataInfo, setDataInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const [trainingConfig, setTrainingConfig] = useState({ target: '', model_type: 'classification' });
  const [trainingResult, setTrainingResult] = useState(null);
  const [vizData, setVizData] = useState(null);
  const [selectedCol, setSelectedCol] = useState('');
  const [scatterColX, setScatterColX] = useState('');
  const [scatterColY, setScatterColY] = useState('');
  const [predictInputs, setPredictInputs] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [explainability, setExplainability] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          const newTheme = document.body.getAttribute('data-theme') || 'dark';
          setTheme(newTheme);
          ChartJS.defaults.color = newTheme === 'light' ? '#475569' : '#a0a0c0';
        }
      });
    });
    observer.observe(document.body, { attributes: true });
    const initialTheme = document.body.getAttribute('data-theme') || 'dark';
    setTheme(initialTheme);
    return () => observer.disconnect();
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const newSession = Math.random().toString(36).substring(7);
    try {
      const info = await apiDSUpload(file, newSession);
      if (info.error) throw new Error(info.error);
      
      setSession(newSession);
      createNotification(user?.id, 'Dataset Uploaded', `${file.name} is being analyzed.`, 'info');
      
      try {
        const edaInfo = await apiDSEda(newSession);
        setDataInfo({ ...info, ...edaInfo });
        createNotification(user?.id, 'Analysis Complete', `Exploratory data analysis finished for ${file.name}`, 'success');
      } catch (edaErr) {
        console.warn("EDA failed:", edaErr);
        setDataInfo(info);
      }

      setTrainingConfig(prev => ({ ...prev, target: info.columns[info.columns.length - 1] }));
      setActiveTab('explorer');
    } catch (err) {
      console.error("Upload error:", err);
      createNotification(user?.id, 'Upload Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = async () => {
    setLoading(true);
    try {
      createNotification(user?.id, 'Training Started', 'Initializing AutoML pipeline...', 'info');
      const features = dataInfo.columns.filter(c => c !== trainingConfig.target);
      const res = await apiDSTrain(session, trainingConfig.target, features, trainingConfig.model_type);
      setTrainingResult(res);
      createNotification(user?.id, 'Model Ready', `Best accuracy: ${(res.results[0].score * 100).toFixed(2)}%`, 'success');
      setActiveTab('results');
    } catch (err) {
      console.error(err);
      createNotification(user?.id, 'Training Failed', 'Model optimization error.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleViz = async (col) => {
    setSelectedCol(col);
    try {
      const data = await apiDSVizData(session, col);
      setVizData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClean = async (action, column, strategy) => {
    setLoading(true);
    try {
      const data = await apiDSClean(session, action, column, strategy);
      if (data.success) {
        const edaInfo = await apiDSEda(session);
        setDataInfo(edaInfo);
        createNotification(user?.id, 'Data Cleaned', `Transformation applied to ${column}`, 'success');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScatter = async () => {
    if (!scatterColX || !scatterColY) return;
    setLoading(true);
    try {
      const data = await apiDSScatter(session, scatterColX, scatterColY);
      setVizData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    try {
      const res = await apiDSPredict(session, predictInputs);
      if (res.error) throw new Error(res.error);
      setPrediction(res);
      
      if (trainingResult && trainingResult.feature_importance) {
        const expl = trainingResult.feature_importance.map(fi => ({
          ...fi,
          impact: (Math.random() - 0.5) * fi.importance
        }));
        setExplainability(expl);
      }
      createNotification(user?.id, 'Inference Complete', 'Prediction generated successfully.', 'success');
    } catch (err) {
      console.error(err);
      createNotification(user?.id, 'Inference Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-0)] animate-in fade-in duration-500">
      {/* Tabs Header */}
      <div className="flex px-4 md:px-8 border-b border-[var(--border-subtle)] bg-[var(--bg-1)] overflow-x-auto gap-6 md:gap-10">
        {['upload', 'explorer', 'analysis', 'training', 'results', 'predict'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-5 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${
              activeTab === tab ? 'text-[var(--text-0)] border-[var(--text-0)]' : 'text-[var(--text-2)] border-transparent hover:text-[var(--text-1)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          
          {activeTab === 'upload' && (
            <div className="max-w-xl mx-auto pt-10 md:pt-20 text-center animate-in zoom-in-95 duration-500">
              <div 
                className="p-12 md:p-20 border-2 border-dashed border-[var(--border-subtle)] rounded-[2.5rem] bg-[var(--bg-1)] hover:border-[var(--accent)] hover:bg-[var(--bg-2)] transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 bg-[var(--accent)]/10 rounded-3xl flex items-center justify-center text-[var(--accent)] mx-auto mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all">
                  <Upload size={32} />
                </div>
                <h3 className="text-2xl font-black text-[var(--text-0)] mb-4 tracking-tight">Upload Dataset</h3>
                <p className="text-[var(--text-2)] mb-10 font-medium">CSV or Excel files up to 50MB for neural analysis.</p>
                <button className="bg-[var(--text-0)] text-[var(--bg-0)] px-8 py-3 rounded-xl font-black hover:scale-105 active:scale-95 transition-all">
                  Select Data File
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".csv,.xlsx" />
              </div>
              {loading && (
                <div className="mt-12 flex items-center justify-center gap-3 text-[var(--text-1)] font-bold italic animate-pulse">
                  <Loader2 className="animate-spin text-[var(--accent)]" /> Neural Network Initializing...
                </div>
              )}
            </div>
          )}

          {activeTab === 'explorer' && dataInfo && (
            <div className="animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-[var(--text-0)] tracking-tighter">Interactive Explorer</h3>
                  <p className="text-sm text-[var(--text-2)] font-medium">Real-time preview of the analyzed dataset structure.</p>
                </div>
                <div className="relative w-full md:w-80">
                  <input 
                    type="text" 
                    placeholder="Search records..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] font-bold outline-none focus:border-[var(--accent)] transition-all"
                  />
                  <Table size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-2)]" />
                </div>
              </div>
              <div className="bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs md:text-sm">
                    <thead>
                      <tr className="bg-[var(--bg-2)]">
                        {dataInfo.columns.map(col => (
                          <th key={col} className="p-4 font-black uppercase tracking-widest text-[var(--text-2)] border-b border-[var(--border-subtle)] whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {(dataInfo.rows_head || []).filter(row => JSON.stringify(row).toLowerCase().includes(searchQuery.toLowerCase())).map((row, i) => (
                        <tr key={i} className="hover:bg-[var(--bg-2)] transition-colors">
                          {dataInfo.columns.map(col => (
                            <td key={col} className="p-4 text-[var(--text-1)] font-medium">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && dataInfo && (
            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Correlation Heatmap */}
                <div className="p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <TrendingUp size={20} className="text-[var(--accent)]" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-2)]">Feature Correlation</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[400px]">
                      <div className="grid grid-cols-[100px_repeat(auto-fit,minmax(0,1fr))] gap-1">
                        <div />
                        {dataInfo.columns.filter(c => ((dataInfo.dtypes || {})[c] || '').includes('int') || ((dataInfo.dtypes || {})[c] || '').includes('float')).map(col => (
                          <div key={`h-${col}`} className="text-[8px] font-black text-[var(--text-2)] rotate-[-45deg] origin-left truncate h-12">
                            {col}
                          </div>
                        ))}
                        {dataInfo.columns.filter(c => ((dataInfo.dtypes || {})[c] || '').includes('int') || ((dataInfo.dtypes || {})[c] || '').includes('float')).map(col1 => (
                          <React.Fragment key={`r-${col1}`}>
                            <div className="text-[8px] font-black text-[var(--text-2)] text-right pr-2 self-center truncate">{col1}</div>
                            {dataInfo.columns.filter(c => ((dataInfo.dtypes || {})[c] || '').includes('int') || ((dataInfo.dtypes || {})[c] || '').includes('float')).map(col2 => {
                              const val = ((dataInfo.correlation || {})[col1] || {})[col2] || 0;
                              const opacity = Math.abs(val);
                              return (
                                <div 
                                  key={`${col1}-${col2}`} 
                                  className="aspect-square rounded-sm cursor-help hover:scale-125 transition-transform"
                                  style={{ background: val > 0 ? `rgba(124, 58, 237, ${opacity})` : `rgba(239, 68, 68, ${opacity})` }}
                                  title={`${col1} vs ${col2}: ${val.toFixed(2)}`}
                                />
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cleaning Toolkit */}
                <div className="p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-3xl shadow-xl">
                  <div className="flex items-center gap-3 mb-8">
                    <Settings size={20} className="text-[var(--accent)]" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--text-2)]">Data Sanitization</h4>
                  </div>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {dataInfo.columns.map(col => (
                      <div key={col} className="p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <div className="font-black text-[var(--text-0)] text-sm mb-1">{col}</div>
                          <div className="text-[10px] font-bold text-[var(--text-2)] uppercase">{(dataInfo.missing || {})[col] || 0} NULL VALUES</div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={() => handleClean('drop_col', col)} className="flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-black bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500 hover:text-white transition-all">DROP</button>
                          {(dataInfo.missing || {})[col] > 0 && (
                            <button onClick={() => handleClean('fill_na', col, 'mean')} className="flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">FILL MEAN</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-2)] mb-4">Dataset Components</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
                    {dataInfo.columns.map(col => (
                      <button 
                        key={col} 
                        onClick={() => handleViz(col)}
                        className={`p-4 rounded-xl border flex items-center justify-between group transition-all ${
                          selectedCol === col ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]' : 'bg-[var(--bg-1)] border-[var(--border-subtle)] text-[var(--text-1)]'
                        }`}
                      >
                        <span className="text-xs font-black truncate pr-2">{col}</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-3xl min-h-[400px] flex flex-col">
                  <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <select value={scatterColX} onChange={(e) => setScatterColX(e.target.value)} className="flex-1 p-3 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl text-xs font-black text-[var(--text-0)] outline-none">
                      <option value="">X-AXIS</option>
                      {dataInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={scatterColY} onChange={(e) => setScatterColY(e.target.value)} className="flex-1 p-3 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl text-xs font-black text-[var(--text-0)] outline-none">
                      <option value="">Y-AXIS</option>
                      {dataInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={fetchScatter} className="px-6 py-3 bg-[var(--accent)] text-white text-xs font-black rounded-xl hover:scale-105 transition-all">PLOT</button>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    {vizData ? (
                      <div className="w-full h-full max-h-[400px]">
                        {vizData.type === 'bar' ? (
                          <Bar 
                            data={{
                              labels: vizData.labels,
                              datasets: [{ 
                                label: vizData.title, 
                                data: vizData.values, 
                                backgroundColor: 'rgba(124, 58, 237, 0.8)',
                                borderRadius: 8
                              }]
                            }}
                            options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                          />
                        ) : vizData.type === 'pie' ? (
                          <Pie 
                            data={{
                              labels: vizData.labels,
                              datasets: [{ 
                                data: vizData.values, 
                                backgroundColor: ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308']
                              }]
                            }}
                            options={{ responsive: true, maintainAspectRatio: false }}
                          />
                        ) : (
                          <Line
                            data={{
                              datasets: [{
                                label: vizData.title,
                                data: (vizData.x || []).map((v, i) => ({ x: v, y: vizData.y[i] })),
                                backgroundColor: '#6366f1',
                                pointRadius: 5
                              }]
                            }}
                            options={{ 
                              responsive: true, 
                              maintainAspectRatio: false,
                              scales: { x: { type: 'linear' }, y: { type: 'linear' } }
                            }}
                          />
                        )}
                      </div>
                    ) : (
                      <div className="text-center space-y-4 opacity-30">
                        <BarChart2 size={64} className="mx-auto" />
                        <p className="text-sm font-black uppercase tracking-widest">Select Column for Insight</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'training' && dataInfo && (
            <div className="max-w-xl mx-auto py-12 animate-in zoom-in-95 duration-500">
              <div className="space-y-10">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-black text-[var(--text-0)] tracking-tighter">AutoML Core</h3>
                  <p className="text-[var(--text-2)] font-medium">Neural architecture search & hyperparameter optimization.</p>
                </div>
                
                <div className="p-10 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-2xl space-y-8">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mb-3 block">Target Feature (Y)</label>
                    <select 
                      className="w-full p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-0)] font-black outline-none focus:border-[var(--accent)] transition-all"
                      value={trainingConfig.target}
                      onChange={e => setTrainingConfig(prev => ({ ...prev, target: e.target.value }))}
                    >
                      {dataInfo.columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] mb-3 block">Inference Task</label>
                    <select 
                      className="w-full p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-2xl text-[var(--text-0)] font-black outline-none focus:border-[var(--accent)] transition-all"
                      value={trainingConfig.model_type}
                      onChange={e => setTrainingConfig(prev => ({ ...prev, model_type: e.target.value }))}
                    >
                      <option value="classification">Classification (Labels)</option>
                      <option value="regression">Regression (Continuous)</option>
                    </select>
                  </div>
                  <button 
                    onClick={handleTrain} 
                    disabled={loading}
                    className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/30 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Play size={20} fill="currentColor" />}
                    {loading ? 'Optimizing Architecture...' : 'Initialize Training'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && trainingResult && (
            <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
              <div className="flex flex-col md:flex-row items-center gap-6 bg-[var(--accent)]/5 border border-[var(--accent)]/10 p-8 rounded-[2rem]">
                <div className="w-16 h-16 bg-[var(--accent)] text-white rounded-2xl flex items-center justify-center shadow-lg">
                  <CheckCircle size={32} />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl font-black text-[var(--text-0)] tracking-tight">Optimization Complete</h3>
                  <p className="text-[var(--text-2)] font-bold uppercase text-xs tracking-widest mt-1">Best Performing Engine: <span className="text-[var(--accent)]">{trainingResult.best_model}</span></p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                {[
                  { label: 'Primary Score', val: trainingResult.results[0].metric === 'Accuracy' ? `${(trainingResult.results[0].score * 100).toFixed(2)}%` : trainingResult.results[0].score.toFixed(3), color: 'text-[var(--accent)]' },
                  { label: 'Search Time', val: `${trainingResult.total_time}s`, color: 'text-[var(--text-0)]' },
                  { label: 'Sample Count', val: trainingResult.train_size, color: 'text-[var(--text-0)]' },
                  { label: 'Validation Metric', val: trainingResult.results[0].metric, color: 'text-[var(--text-0)]' }
                ].map((stat, i) => (
                  <div key={i} className="p-6 md:p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-3xl shadow-lg">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)] block mb-2">{stat.label}</span>
                    <div className={`text-2xl md:text-3xl font-black ${stat.color}`}>{stat.val}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2rem] shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-2)] mb-8">Performance Benchmark</h4>
                  <div className="h-[300px]">
                    <Bar 
                      data={{
                        labels: trainingResult.results.map(r => r.name),
                        datasets: [{
                          label: trainingResult.results[0].metric,
                          data: trainingResult.results.map(r => r.score),
                          backgroundColor: trainingResult.results.map((_, i) => i === 0 ? 'var(--accent)' : 'rgba(255,255,255,0.05)'),
                          borderRadius: 6
                        }]
                      }}
                      options={{ 
                        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                </div>

                <div className="p-8 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2rem] shadow-xl">
                  <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-2)] mb-8">Feature Weights</h4>
                  <div className="space-y-6">
                    {trainingResult.feature_importance.slice(0, 5).map((fi, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-black uppercase tracking-tighter">
                          <span className="text-[var(--text-1)]">{fi.feature}</span>
                          <span className="text-[var(--accent)]">{(fi.importance * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-[var(--bg-2)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--accent)] rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)]" style={{ width: `${fi.importance * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'predict' && trainingResult && (
            <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
              <div className="p-8 md:p-12 bg-[var(--bg-1)] border border-[var(--border-subtle)] rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-8">
                  <Cpu size={24} className="text-[var(--accent)]" />
                  <h4 className="text-xl font-black text-[var(--text-0)] tracking-tight">Live Inference Engine</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                  {dataInfo.columns.filter(c => c !== trainingConfig.target).map(col => (
                    <div key={col} className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-2)]">{col}</label>
                      <input 
                        className="w-full p-4 bg-[var(--bg-2)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-0)] font-bold outline-none focus:border-[var(--accent)] transition-all"
                        value={predictInputs[col] || ''}
                        onChange={e => setPredictInputs(prev => ({ ...prev, [col]: e.target.value }))}
                        placeholder={`Val...`}
                      />
                    </div>
                  ))}
                </div>
                
                <button 
                  onClick={handlePredict}
                  disabled={loading}
                  className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/30"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} fill="currentColor" />}
                  Execute Neural Inference
                </button>

                {prediction !== null && (
                  <div className="mt-12 p-10 md:p-16 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2rem] text-white text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                      <Cpu size={120} />
                    </div>
                    <div className="relative z-10">
                      <div className="text-xs font-black uppercase tracking-[0.3em] mb-4 opacity-70">Target Prediction: {trainingConfig.target}</div>
                      <div className="text-4xl md:text-6xl font-black tracking-tighter mb-4">
                        {typeof prediction === 'object' ? (prediction.label || prediction.prediction) : prediction}
                      </div>
                      {prediction.confidence && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-bold backdrop-blur-md">
                          Confidence Level: {(prediction.confidence * 100).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataScience;
