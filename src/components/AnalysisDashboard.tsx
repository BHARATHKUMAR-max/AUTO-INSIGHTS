import React, { useState, useMemo, useEffect } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Copy, 
  Check, 
  Info, 
  AlertCircle, 
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface AnalysisDashboardProps {
  analysis: any;
  profile: any;
  sample: any[];
}

export default function AnalysisDashboard({ analysis, profile, sample }: AnalysisDashboardProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const { theme } = useTheme();

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cleanNumeric = (val: any) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const cleaned = val.replace(/[$,\s]/g, '');
      const num = Number(cleaned);
      return isNaN(num) ? val : num;
    }
    return val;
  };

  const getRowValue = (row: any, key: string) => {
    if (!row || !key) return undefined;
    if (row[key] !== undefined) return row[key];
    
    // Case-insensitive and normalized fallback
    const normalizedTarget = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const actualKey = Object.keys(row).find(k => {
      const normalizedK = k.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      return normalizedK === normalizedTarget;
    });
    
    return actualKey ? row[actualKey] : undefined;
  };

  // Simple filtering logic (client-side for sample/small data)
  const filteredData = useMemo(() => {
    return sample.filter(row => {
      return Object.entries(activeFilters).every(([key, value]) => {
        const filterValue = value as any[];
        if (!filterValue || filterValue.length === 0) return true;
        return filterValue.includes(row[key]);
      });
    });
  }, [sample, activeFilters]);

  return (
    <div className="flex bg-app-bg min-h-screen">
      {/* Left Sidebar: Filters */}
      <aside className="w-72 border-r border-app-border bg-app-card p-6 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
        <div className="flex items-center gap-2 mb-8">
          <Filter className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold text-app-text">Filters</h2>
        </div>

        <div className="space-y-8">
          {analysis.filters.map((filterKey: string) => {
            const colStats = profile.columns[filterKey];
            if (!colStats) return null;

            return (
              <div key={filterKey} className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-app-secondary">
                  {filterKey.replace(/_/g, ' ')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {colStats.sample_values.map((val: any) => (
                    <button
                      key={val}
                      onClick={() => {
                        const current = activeFilters[filterKey] || [];
                        const next = current.includes(val) 
                          ? current.filter((v: any) => v !== val)
                          : [...current, val];
                        setActiveFilters({ ...activeFilters, [filterKey]: next });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
                        activeFilters[filterKey]?.includes(val)
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-app-bg text-app-text border-app-border hover:border-emerald-300"
                      )}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 space-y-8">
        {/* Header Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-widest">
              Analysis Complete
            </div>
          </div>
          <h1 className="text-4xl font-bold text-app-text tracking-tight">
            Executive Summary
          </h1>
          <p className="text-xl text-app-secondary max-w-3xl leading-relaxed">
            {analysis.executive_summary}
          </p>
        </section>

        {/* KPI Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analysis.kpis.map((kpi: any, idx: number) => (
            <div key={idx} className="bg-app-card p-6 rounded-3xl shadow-sm border border-app-border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <Info className="w-4 h-4 text-app-secondary cursor-help" />
              </div>
              <p className="text-sm font-medium text-app-secondary mb-1">{kpi.name}</p>
              <h3 className="text-2xl font-bold text-app-text">
                {(() => {
                  const col = profile.columns[kpi.value_key];
                  if (!col) return 'N/A';
                  const val = kpi.aggregation === 'sum' ? col.sum : col.avg;
                  if (val === undefined || val === null) return 'N/A';
                  
                  if (kpi.format?.includes('$')) {
                    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
                  }
                  return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
                })()}
              </h3>
            </div>
          ))}
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {!analysis.charts || analysis.charts.length === 0 ? (
            <div className="col-span-full bg-app-card p-12 rounded-3xl border border-dashed border-app-border flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-app-bg rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-app-secondary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-app-text">No charts generated</h3>
                <p className="text-app-secondary max-w-xs">
                  The AI didn't recommend any specific visualizations for this dataset.
                </p>
              </div>
            </div>
          ) : (
            analysis.charts.map((chart: any) => (
              <div key={chart.id} className="bg-app-card rounded-3xl shadow-sm border border-app-border overflow-hidden flex flex-col">
                <div className="p-6 border-b border-app-border flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-app-text">{chart.title}</h3>
                    <p className="text-sm text-app-secondary">{chart.why_this_chart}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(chart.python_code, chart.id)}
                    className="p-2 hover:bg-app-bg rounded-xl transition-colors text-app-secondary hover:text-emerald-600 group relative"
                    title="Copy Python Code"
                  >
                    {copiedId === chart.id ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                    {copiedId === chart.id && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-app-text text-app-bg text-[10px] px-2 py-1 rounded whitespace-nowrap">
                        Copied!
                      </span>
                    )}
                  </button>
                </div>
                
                <div className="p-6 flex-1 min-h-[400px] flex items-center justify-center bg-app-bg/30">
                  {filteredData.length === 0 ? (
                    <div className="text-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                      <p className="text-sm text-app-secondary font-medium">No data matches current filters</p>
                    </div>
                  ) : (
                    <Plot
                      data={[
                        (() => {
                          const rawX = filteredData.map(d => getRowValue(d, chart.x));
                          const rawY = chart.y ? filteredData.map(d => cleanNumeric(getRowValue(d, chart.y))) : undefined;
                          
                          let xData = rawX;
                          let yData = rawY;

                          // If it's a distribution chart (no Y or Y is same as X), calculate frequencies
                          if (!chart.y || chart.y === chart.x || chart.title.toLowerCase().includes('distribution')) {
                            const counts: Record<string, number> = {};
                            rawX.forEach(val => {
                              const s = val === null || val === undefined ? 'N/A' : String(val);
                              counts[s] = (counts[s] || 0) + 1;
                            });
                            xData = Object.keys(counts);
                            yData = Object.values(counts);
                          }

                          // Format numbers for labels
                          const formatLabel = (val: any) => {
                            if (typeof val !== 'number') return val;
                            if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
                            if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
                            return val.toFixed(1);
                          };

                          if (chart.chart_type === 'pie') {
                            return {
                              labels: xData,
                              values: yData,
                              type: 'pie',
                              hole: 0.4,
                              marker: { colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ecfdf5', '#064e3b', '#065f46'] },
                              textinfo: 'percent+label',
                              hoverinfo: 'label+value+percent',
                              name: chart.title
                            };
                          }
                          
                          if (chart.chart_type === 'line') {
                            return {
                              x: xData,
                              y: yData,
                              type: 'scatter',
                              mode: 'lines+markers+text',
                              text: yData?.map(formatLabel),
                              textposition: 'top center',
                              line: { color: '#10b981', width: 3, shape: 'spline' },
                              marker: { size: 8, color: theme === 'dark' ? '#34d399' : '#065f46' },
                              name: chart.title
                            };
                          }

                          return {
                            x: xData,
                            y: yData,
                            type: chart.chart_type as any,
                            text: yData?.map(formatLabel),
                            textposition: 'auto',
                            marker: { 
                              color: '#10b981',
                              line: { color: theme === 'dark' ? '#34d399' : '#065f46', width: 1 }
                            },
                            name: chart.title
                          };
                        })()
                      ]}
                      layout={{
                        autosize: true,
                        margin: { t: 40, r: 40, b: 60, l: 60 },
                        paper_bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
                        plot_bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
                        font: { family: 'Inter, sans-serif', size: 12, color: theme === 'dark' ? '#f1f5f9' : '#1f2937' },
                        showlegend: chart.chart_type === 'pie',
                        xaxis: { 
                          gridcolor: theme === 'dark' ? '#334155' : '#f3f4f6',
                          title: { text: chart.x.replace(/_/g, ' '), font: { size: 10, color: theme === 'dark' ? '#94a3b8' : '#9ca3af' } },
                          tickangle: -45
                        },
                        yaxis: { 
                          gridcolor: theme === 'dark' ? '#334155' : '#f3f4f6',
                          title: { text: chart.y?.replace(/_/g, ' ') || 'Count', font: { size: 10, color: theme === 'dark' ? '#94a3b8' : '#9ca3af' } }
                        },
                        hovermode: 'closest'
                      }}
                      config={{
                        displayModeBar: true,
                        responsive: true,
                        displaylogo: false,
                        modeBarButtonsToRemove: ['lasso2d', 'select2d']
                      }}
                      useResizeHandler
                      className="w-full h-full"
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* Insights & Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-app-card text-app-text p-8 rounded-3xl space-y-6 border border-app-border shadow-sm">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-emerald-400" />
              Key Insights
            </h2>
            <ul className="space-y-4">
              {analysis.key_insights.map((insight: string, idx: number) => (
                <li key={idx} className="flex gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-app-secondary leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-app-card p-8 rounded-3xl border border-app-border space-y-6 shadow-sm">
            <h2 className="text-2xl font-bold text-app-text flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-500" />
              Data Quality Findings
            </h2>
            <ul className="space-y-4">
              {analysis.data_quality_findings.map((finding: string, idx: number) => (
                <li key={idx} className="flex gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2.5 flex-shrink-0" />
                  <span className="text-app-secondary leading-relaxed">{finding}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
