import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AnalysisDashboard from '../components/AnalysisDashboard';
import DataChat from '../components/DataChat';
import CustomGraphBuilder from '../components/CustomGraphBuilder';
import { Loader2, AlertCircle, LayoutDashboard, MessageSquare, PlusCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function AnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sample, setSample] = useState<any[]>([]);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'custom'>('dashboard');

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (analysisError) throw analysisError;
      setDatasetId(analysisData.dataset_id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('dataset_id', analysisData.dataset_id)
        .single();

      if (profileError) throw profileError;
      
      setAnalysis(analysisData.analysis_json);
      setProfile(profileData.profile_json);
      setSample(profileData.profile_json.sample || []); 
      
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] space-y-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-app-secondary font-medium">Loading analysis results...</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-md mx-auto mt-20 p-8 bg-app-card rounded-3xl border border-app-border shadow-sm text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-app-text">Failed to load analysis</h2>
          <p className="text-app-secondary">{error}</p>
          <button
            onClick={() => navigate('/history')}
            className="w-full bg-app-text text-app-bg py-3 rounded-xl font-bold hover:opacity-90 transition-all"
          >
            Back to History
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Tabs Navigation */}
        <div className="flex items-center gap-2 p-1.5 bg-app-card border border-app-border rounded-2xl w-fit shadow-lg">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'chat', label: 'Chat with Data', icon: MessageSquare },
            { id: 'custom', label: 'Custom Graph', icon: PlusCircle }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
                activeTab === tab.id 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                  : "text-app-secondary hover:text-app-text hover:bg-app-bg"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'dashboard' && (
            <AnalysisDashboard 
              analysis={analysis} 
              profile={profile} 
              sample={sample} 
            />
          )}
          {activeTab === 'chat' && datasetId && (
            <div className="max-w-4xl mx-auto">
              <DataChat 
                datasetId={datasetId} 
                profile={profile} 
                sample={sample} 
              />
            </div>
          )}
          {activeTab === 'custom' && (
            <CustomGraphBuilder 
              profile={profile} 
              sample={sample} 
              onSave={async (config) => {
                const newChart = { ...config, id: Date.now().toString(), why_this_chart: 'Custom generated chart' };
                const updatedAnalysis = {
                  ...analysis,
                  charts: [...(analysis.charts || []), newChart]
                };

                try {
                  const { error: updateError } = await supabase
                    .from('analyses')
                    .update({ analysis_json: updatedAnalysis })
                    .eq('id', id);

                  if (updateError) throw updateError;
                  
                  setAnalysis(updatedAnalysis);
                  setActiveTab('dashboard');
                  toast.success('Chart added to dashboard!');
                } catch (err: any) {
                  console.error("Failed to save custom chart:", err);
                }
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
