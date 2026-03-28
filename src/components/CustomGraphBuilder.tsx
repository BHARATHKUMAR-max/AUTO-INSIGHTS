import React, { useState, useEffect } from 'react';
import { Sparkles, BarChart3, LineChart, PieChart, ScatterChart, Loader2, Plus, Trash2, Wand2, Copy, Check, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Plot from 'react-plotly.js';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

interface CustomGraphBuilderProps {
  profile: any;
  sample: any[];
  onSave?: (config: any) => void;
}

export default function CustomGraphBuilder({ profile, sample, onSave }: CustomGraphBuilderProps) {
  const [prompt, setPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();
  const [config, setConfig] = useState<any>({
    title: 'Custom Chart',
    chart_type: 'bar',
    x: '',
    y: '',
    color: '',
    aggregation: 'sum',
    reasoning: '',
    python_code: ''
  });

  const columns = Object.keys(profile.columns || {});
  const numericColumns = columns.filter(c => profile.columns[c].type === 'numeric');

  const handleCopyCode = () => {
    if (!config.python_code) return;
    navigator.clipboard.writeText(config.python_code);
    setCopied(true);
    toast.success('Python code copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
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
    
    const normalizedTarget = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const actualKey = Object.keys(row).find(k => {
      const normalizedK = k.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
      return normalizedK === normalizedTarget;
    });
    
    return actualKey ? row[actualKey] : undefined;
  };

  const handleAiGenerate = async () => {
    if (!prompt.trim() || isAiLoading) return;
    setIsAiLoading(true);

    try {
      const response = await fetch('/api/generate-graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, sample, prompt })
      });

      if (!response.ok) throw new Error('Failed to generate graph');
      const data = await response.json();
      setConfig(data);
      toast.success('AI generated a chart for you!');
    } catch (error: any) {
      toast.error('AI failed: ' + error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const getPlotData = () => {
    if (!config.x) return [];

    // Helper to format numbers for labels
    const formatLabel = (val: any) => {
      if (typeof val !== 'number') return val;
      if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
      if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
      return val.toFixed(1);
    };

    // If no grouping, use the single trace logic
    if (!config.color) {
      const rawX = sample.map(d => getRowValue(d, config.x));
      const rawY = config.y ? sample.map(d => cleanNumeric(getRowValue(d, config.y))) : undefined;
      
      let xData = rawX;
      let yData = rawY;

      if (!config.y || config.y === config.x || config.chart_type === 'pie') {
        const counts: Record<string, number> = {};
        rawX.forEach(val => {
          const s = val === null || val === undefined ? 'N/A' : String(val);
          counts[s] = (counts[s] || 0) + 1;
        });
        xData = Object.keys(counts);
        yData = Object.values(counts);
      }

      if (config.chart_type === 'pie') {
        return [{
          labels: xData,
          values: yData,
          type: 'pie',
          hole: 0.4,
          marker: { colors: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ecfdf5', '#064e3b', '#065f46'] },
          textinfo: 'percent+label',
          hoverinfo: 'label+value+percent',
          name: config.title
        }];
      }

      if (config.chart_type === 'line') {
        return [{
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines+markers+text',
          text: yData?.map(formatLabel),
          textposition: 'top center',
          line: { color: '#10b981', width: 3, shape: 'spline' },
          marker: { size: 8, color: theme === 'dark' ? '#34d399' : '#064e3b' },
          name: config.title
        }];
      }

      return [{
        x: xData,
        y: yData,
        type: config.chart_type as any,
        text: yData?.map(formatLabel),
        textposition: 'auto',
        marker: { 
          color: '#10b981',
          line: { color: theme === 'dark' ? '#34d399' : '#065f46', width: 1 }
        },
        name: config.title
      }];
    }

    // Grouping logic (Multiple Traces)
    const groups: Record<string, any[]> = {};
    sample.forEach(d => {
      const groupVal = String(getRowValue(d, config.color) || 'Other');
      if (!groups[groupVal]) groups[groupVal] = [];
      groups[groupVal].push(d);
    });

    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

    return Object.entries(groups).map(([groupName, groupData], idx) => {
      const xData = groupData.map(d => getRowValue(d, config.x));
      const yData = config.y ? groupData.map(d => cleanNumeric(getRowValue(d, config.y))) : undefined;

      const color = colors[idx % colors.length];

      if (config.chart_type === 'line') {
        return {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines+markers',
          line: { color, width: 2, shape: 'spline' },
          marker: { size: 6 },
          name: groupName
        };
      }

      return {
        x: xData,
        y: yData,
        type: config.chart_type as any,
        marker: { color },
        name: groupName
      };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Controls Panel */}
      <div className="lg:col-span-1 space-y-6">
        {/* AI Prompt Section */}
        <div className="bg-app-card border border-app-border p-6 rounded-3xl shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-app-text">AI Graph Generator</h3>
          </div>
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., 'Show sales trend by month' or 'Compare revenue by category'"
              className="w-full p-4 pr-12 bg-app-bg border border-app-border rounded-2xl text-app-text text-sm resize-none h-24 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
            />
            <button
              onClick={handleAiGenerate}
              disabled={isAiLoading || !prompt.trim()}
              className="absolute right-3 bottom-3 p-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Manual Configuration Section */}
        <div className="bg-app-card border border-app-border p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-app-text">Manual Builder</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-app-secondary uppercase mb-2 block">Chart Type</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'bar', icon: BarChart3 },
                  { id: 'line', icon: LineChart },
                  { id: 'pie', icon: PieChart },
                  { id: 'scatter', icon: ScatterChart }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setConfig({ ...config, chart_type: type.id })}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center gap-1 transition-all",
                      config.chart_type === type.id 
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                        : "bg-app-bg border-app-border text-app-secondary hover:border-app-text"
                    )}
                  >
                    <type.icon className="w-5 h-5" />
                    <span className="text-[10px] capitalize">{type.id}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-app-secondary uppercase mb-2 block">X-Axis (Dimension)</label>
              <select
                value={config.x}
                onChange={(e) => setConfig({ ...config, x: e.target.value })}
                className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select Column</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-app-secondary uppercase mb-2 block">Y-Axis (Metric)</label>
              <select
                value={config.y}
                onChange={(e) => setConfig({ ...config, y: e.target.value })}
                className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Select Column (Optional)</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-app-secondary uppercase mb-2 block">Group By (Color)</label>
              <select
                value={config.color}
                onChange={(e) => setConfig({ ...config, color: e.target.value })}
                className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">No Grouping</option>
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-app-secondary uppercase mb-2 block">Aggregation</label>
              <select
                value={config.aggregation}
                onChange={(e) => setConfig({ ...config, aggregation: e.target.value })}
                className="w-full p-3 bg-app-bg border border-app-border rounded-xl text-app-text outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="count">Count</option>
                <option value="none">None (Raw Data)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-2 bg-app-card border border-app-border rounded-3xl shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-app-border bg-app-bg/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-app-text">Live Preview</h3>
            {config.python_code && (
              <button
                onClick={handleCopyCode}
                className="p-2 hover:bg-app-card rounded-xl transition-colors text-app-secondary hover:text-emerald-600 group relative flex items-center gap-2 border border-app-border"
                title="Copy Python Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span className="text-xs font-medium">Copy Python</span>
              </button>
            )}
          </div>
          <button
            onClick={() => onSave?.(config)}
            disabled={!config.x}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Dashboard
          </button>
        </div>
        
        <div className="flex-1 p-6 flex flex-col bg-white dark:bg-slate-900">
          {config.x ? (
            <>
              {config.reasoning && (
                <div className="mb-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex gap-3">
                  <Info className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-app-secondary italic">{config.reasoning}</p>
                </div>
              )}
              <div className="flex-1 min-h-[400px]">
                <Plot
                  data={getPlotData()}
                  layout={{
                    title: config.title,
                    autosize: true,
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { family: 'Inter, sans-serif', color: theme === 'dark' ? '#94a3b8' : '#1f2937' },
                    margin: { t: 40, r: 40, b: 60, l: 60 },
                    xaxis: { 
                      gridcolor: theme === 'dark' ? '#334155' : '#f3f4f6',
                      tickangle: -45
                    },
                    yaxis: { 
                      gridcolor: theme === 'dark' ? '#334155' : '#f3f4f6'
                    },
                    hovermode: 'closest'
                  }}
                  config={{
                    displayModeBar: true,
                    responsive: true,
                    displaylogo: false
                  }}
                  useResizeHandler={true}
                  className="w-full h-full"
                />
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 opacity-30">
              <BarChart3 className="w-24 h-24 mx-auto" />
              <p className="font-medium">Select columns to preview chart</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
