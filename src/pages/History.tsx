import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';
import { FileText, Calendar, Database, ChevronRight, Search, Filter } from 'lucide-react';
import { format } from 'date-fns';

export default function History() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('analyses')
      .select(`
        *,
        datasets (
          original_filename,
          rows,
          cols
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    else setAnalyses(data || []);
    setLoading(false);
  };

  const filteredAnalyses = analyses.filter(a => 
    a.datasets.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-12 px-6 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-app-text tracking-tight">Analysis History</h1>
            <p className="text-app-secondary">Access and review your past data insights.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-app-secondary" />
            <input
              type="text"
              placeholder="Search datasets..."
              className="w-full pl-12 pr-4 py-3 bg-app-card border border-app-border text-app-text rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-app-card h-48 rounded-3xl animate-pulse border border-app-border" />
            ))}
          </div>
        ) : filteredAnalyses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAnalyses.map((analysis) => (
              <Link
                key={analysis.id}
                to={`/analysis/${analysis.id}`}
                className="group bg-app-card p-6 rounded-3xl border border-app-border shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 transition-colors">
                      <FileText className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-app-secondary uppercase tracking-wider">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-bold text-app-text line-clamp-1 group-hover:text-emerald-500 transition-colors">
                      {analysis.datasets.original_filename}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-app-secondary">
                      <div className="flex items-center gap-1">
                        <Database className="w-4 h-4" />
                        {analysis.datasets.rows.toLocaleString()} rows
                      </div>
                      <div className="flex items-center gap-1">
                        <Filter className="w-4 h-4" />
                        {analysis.datasets.cols} cols
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-app-border flex items-center justify-between text-emerald-600 font-bold text-sm">
                  View Analysis
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-app-card rounded-[40px] p-20 text-center border border-app-border shadow-sm">
            <div className="w-20 h-20 bg-app-bg rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-app-secondary" />
            </div>
            <h3 className="text-2xl font-bold text-app-text">No analyses found</h3>
            <p className="text-app-secondary mt-2 max-w-md mx-auto">
              You haven't analyzed any datasets yet. Upload your first file to see it here.
            </p>
            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/10"
            >
              Start New Analysis
            </Link>
          </div>
        )}
      </div>
    </Layout>
  );
}
