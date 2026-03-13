import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AnalysisDashboard from '../components/AnalysisDashboard';
import { Loader2, AlertCircle } from 'lucide-react';

export default function AnalysisView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [sample, setSample] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      // 1. Fetch Analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (analysisError) throw analysisError;

      // 2. Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('dataset_id', analysisData.dataset_id)
        .single();

      if (profileError) throw profileError;

      // 3. Fetch Sample (In a real app, we might store this in DB or fetch from storage)
      // For this demo, we'll try to fetch the first few rows from the storage file if possible
      // But since we already saved the analysis, we'll just use the profile for now
      // Or we can assume the sample was part of the analysis_json if we saved it there
      // Let's check if we have a sample in the analysis_json
      
      setAnalysis(analysisData.analysis_json);
      setProfile(profileData.profile_json);
      setSample(profileData.profile_json.sample || []); 
      
      console.log("Analysis Data Loaded:", {
        charts: analysisData.analysis_json.charts?.length,
        sample: profileData.profile_json.sample?.length
      });
      
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
      <AnalysisDashboard 
        analysis={analysis} 
        profile={profile} 
        sample={sample} 
      />
    </Layout>
  );
}
