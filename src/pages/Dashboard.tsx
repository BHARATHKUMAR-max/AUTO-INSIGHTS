import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AnalysisDashboard from '../components/AnalysisDashboard';
import { 
  Upload, FileText, Loader2, Sparkles, AlertCircle, Database, 
  BarChart3, Zap, CheckCircle2, ChevronRight, Calendar, PlusCircle, History as HistoryIcon 
} from 'lucide-react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard() {
  const location = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [analysis, setAnalysis] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sample, setSample] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [stats, setStats] = useState({ totalAnalyses: 0, totalDatasets: 0, totalInsights: 0 });
  const [recentAnalyses, setRecentAnalyses] = useState<any[]>([]);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when navigating to dashboard (New Analysis)
  useEffect(() => {
    setAnalysis(null);
    setFile(null);
    setError(null);
    setLoading(false);
    setStatus('');
    fetchDashboardData();
  }, [location.key]);

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: analysesCount } = await supabase
      .from('analyses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { count: datasetsCount } = await supabase
      .from('datasets')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const { data: recent } = await supabase
      .from('analyses')
      .select(`
        *,
        datasets (
          original_filename
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    setStats({
      totalAnalyses: analysesCount || 0,
      totalDatasets: datasetsCount || 0,
      totalInsights: (analysesCount || 0) * 5
    });
    setRecentAnalyses(recent || []);
    setIsFirstTime((analysesCount || 0) === 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Upload Dataset
      setStatus('Uploading dataset...');
      let uploadPath = '';
      
      try {
        const { data: uploadInfo } = await axios.post('/api/upload/signed-url', {
          filename: file.name,
          userId: user.id
        });
        
        await axios.put(uploadInfo.url, file, {
          headers: { 'Content-Type': file.type }
        });
        uploadPath = uploadInfo.path;
      } catch (serverErr: any) {
        console.warn("Server-side upload failed, attempting direct client-side upload...", serverErr);
        
        const filePath = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}. Please ensure a public bucket named 'datasets' exists.`);
        }
        uploadPath = filePath;
      }

      // 2. Create Dataset Entry
      setStatus('Registering dataset...');
      const { data: dataset, error: dbError } = await supabase.from('datasets').insert({
        user_id: user.id,
        original_filename: file.name,
        storage_path_raw: uploadPath
      }).select().single();

      if (dbError) throw dbError;

      // 3. Process on Server
      setStatus('Cleaning and profiling data...');
      const { data: processResult } = await axios.post('/api/datasets/process', {
        path: uploadPath,
        datasetId: dataset.id,
        userId: user.id
      });

      // 5. Get AI Plan
      setStatus('AI is generating insights...');
      const { data: analysisResult } = await axios.post('/api/groq/plan', {
        profile: processResult.profile,
        sample: processResult.sample,
        datasetId: dataset.id,
        userId: user.id
      });

      setAnalysis(analysisResult.analysis_json);
      setProfile(processResult.profile);
      setSample(processResult.sample);
      setStatus('Complete!');
      fetchDashboardData();
    } catch (err: any) {
      console.error("Full Analysis Error:", err);
      let errorMessage = err.message || "An error occurred during analysis.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (analysis) {
    return (
      <Layout>
        <AnalysisDashboard analysis={analysis} profile={profile} sample={sample} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            AI-Powered Analytics
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-app-text tracking-tight leading-[1.1]">
            Transform Your Data Into <br /> 
            <span className="text-emerald-600">Smart AI Insights</span>
          </h1>
          <p className="text-xl text-app-secondary">
            Upload your CSV or Excel dataset and let our AI automatically analyze, clean, and generate insights within seconds.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="flex items-center gap-3 px-4 py-3 bg-app-card rounded-2xl border border-app-border shadow-sm">
              <span className="text-xl">1️⃣</span>
              <span className="text-sm font-bold text-app-secondary">Upload your dataset</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-app-card rounded-2xl border border-app-border shadow-sm">
              <span className="text-xl">2️⃣</span>
              <span className="text-sm font-bold text-app-secondary">AI analyzes the data</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3 bg-app-card rounded-2xl border border-app-border shadow-sm">
              <span className="text-xl">3️⃣</span>
              <span className="text-sm font-bold text-app-secondary">Get actionable insights</span>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-app-card rounded-[40px] shadow-2xl shadow-emerald-900/5 border border-app-border p-8 md:p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Upload className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-app-text">Upload Dataset</h2>
            </div>

            {error && (
              <div className="mb-8 bg-red-50 border border-red-100 text-red-600 p-6 rounded-3xl flex items-start gap-4">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <div>
                  <p className="font-bold">Analysis Failed</p>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>
            )}

            {!loading ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-[32px] p-12 md:p-20 flex flex-col items-center justify-center gap-6 cursor-pointer transition-all group relative overflow-hidden ${
                  isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/30'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv,.xlsx" 
                  onChange={handleFileChange}
                />
                
                <div className="w-24 h-24 bg-app-bg rounded-[32px] flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                  <Upload className="w-12 h-12 text-app-secondary group-hover:text-emerald-600" />
                </div>

                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-app-text">
                    {file ? 'File Ready for Analysis' : 'Drag & Drop your dataset here'}
                  </p>
                  <p className="text-app-secondary">
                    or <span className="text-emerald-600 font-bold">Browse Files</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-4">
                  <div className="text-center">
                    <p className="text-xs font-bold text-app-secondary uppercase tracking-widest">Supported Formats</p>
                    <p className="text-sm font-bold text-app-text opacity-80 mt-1">CSV (.csv), Excel (.xlsx)</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-app-secondary uppercase tracking-widest">Max Size</p>
                    <p className="text-sm font-bold text-app-text opacity-80 mt-1">50MB</p>
                  </div>
                </div>

                {file && (
                  <div className="w-full max-w-md mt-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-app-card rounded-xl flex items-center justify-center shadow-sm">
                          <FileText className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-app-text truncate max-w-[200px]">{file.name}</p>
                          <p className="text-xs text-app-secondary">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startAnalysis();
                      }}
                      className="w-full mt-6 bg-emerald-600 text-white px-8 py-5 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/10 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Start Expert Analysis
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-emerald-100 rounded-full animate-pulse" />
                  <Loader2 className="w-24 h-24 text-emerald-600 animate-spin absolute top-0 left-0" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-app-text">{status}</h3>
                  <p className="text-app-secondary animate-pulse">This may take a minute for larger datasets...</p>
                </div>
                
                <div className="w-full max-w-md bg-app-bg h-3 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full animate-progress" style={{ width: '60%' }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-app-card p-8 rounded-[32px] border border-app-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
              <BarChart3 className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-4xl font-bold text-app-text">{stats.totalAnalyses}</p>
            <p className="text-app-secondary font-medium mt-1">Total Analyses</p>
          </div>
          <div className="bg-app-card p-8 rounded-[32px] border border-app-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
              <Database className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-4xl font-bold text-app-text">{stats.totalDatasets}</p>
            <p className="text-app-secondary font-medium mt-1">Datasets Uploaded</p>
          </div>
          <div className="bg-app-card p-8 rounded-[32px] border border-app-border shadow-sm hover:shadow-md transition-all group">
            <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-500 transition-colors">
              <Zap className="w-7 h-7 text-amber-600 group-hover:text-white transition-colors" />
            </div>
            <p className="text-4xl font-bold text-app-text">{stats.totalInsights}</p>
            <p className="text-app-secondary font-medium mt-1">Insights Generated</p>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-app-text">Recent Analyses</h2>
            <Link to="/history" className="text-emerald-600 font-bold hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentAnalyses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentAnalyses.map((analysis) => (
                <Link
                  key={analysis.id}
                  to={`/analysis/${analysis.id}`}
                  className="group bg-app-card p-6 rounded-[32px] border border-app-border shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 bg-app-bg rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                        <FileText className="w-6 h-6 text-app-secondary group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-app-secondary uppercase tracking-wider">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-app-text line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {analysis.datasets.original_filename}
                      </h3>
                    </div>

                    <div className="pt-4 border-t border-app-border flex items-center justify-between text-emerald-600 font-bold text-sm">
                      View Result
                      <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-app-card rounded-[40px] p-16 text-center border border-app-border shadow-sm">
              <div className="w-20 h-20 bg-app-bg rounded-3xl flex items-center justify-center mx-auto mb-6">
                <HistoryIcon className="w-10 h-10 text-app-secondary opacity-30" />
              </div>
              <h3 className="text-2xl font-bold text-app-text">No analyses yet</h3>
              <p className="text-app-secondary mt-2">
                Start by uploading your first dataset to see your insights here.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
