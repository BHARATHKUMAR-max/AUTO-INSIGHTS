import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";
import { z } from "zod";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!; // Fallback for demo
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. Using ANON_KEY for server operations. This may fail if RLS is enabled.");
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Validate Environment Variables
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error("CRITICAL: Supabase environment variables are missing!");
}
if (!process.env.GROQ_API_KEY) {
  console.error("CRITICAL: GROQ_API_KEY is missing!");
}

// Ensure Storage Bucket exists
async function initStorage() {
  console.log("--- Storage Diagnostic ---");
  console.log(`Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 15) + "..." : "MISSING"}`);
  
  const keyToUse = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const isServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`Using Key Type: ${isServiceKey ? "SERVICE_ROLE" : "ANON"}`);
  if (keyToUse) {
    console.log(`Key Preview: ${keyToUse.substring(0, 10)}...${keyToUse.substring(keyToUse.length - 5)}`);
  }
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error("Error listing buckets:", listError.message);
    console.error("Full Error Object:", JSON.stringify(listError));
    return;
  }

  console.log("Available Buckets:", buckets.map(b => b.name).join(", "));
  const bucketExists = buckets.some(b => b.name === 'datasets');
  
  if (!bucketExists) {
    console.log("Bucket 'datasets' not found in the list above. Attempting to create...");
    const { error: createError } = await supabase.storage.createBucket('datasets', {
      public: true,
    });

    if (createError) {
      console.error("Failed to create bucket 'datasets':", createError.message);
    } else {
      console.log("Bucket 'datasets' created successfully.");
    }
  } else {
    console.log("Bucket 'datasets' verified and accessible.");
  }
  console.log("--------------------------");
}

async function testDB() {
  console.log("--- DB Diagnostic ---");
  const { data, error } = await supabase.from('datasets').select('count', { count: 'exact', head: true });
  if (error) {
    console.error("DB Connection Error:", error.message);
    console.error("IMPORTANT: Please ensure you have run the SQL migrations to create the 'datasets' table.");
  } else {
    console.log("DB Connection Verified. 'datasets' table is accessible.");
  }
  console.log("----------------------");
}

// Diagnostic: List Files
app.get("/api/debug/storage", async (req, res) => {
  const { data, error } = await supabase.storage.from('datasets').list('', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'desc' },
  });
  
  const envStatus = {
    url: !!process.env.VITE_SUPABASE_URL,
    anonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    groqKey: !!process.env.GROQ_API_KEY,
  };

  res.json({ envStatus, files: data, error });
});

// Diagnostic: Check Dataset Table
app.get("/api/debug/db", async (req, res) => {
  const { data, error } = await supabase.from('datasets').select('*').order('created_at', { ascending: false }).limit(5);
  res.json({ data, error });
});

// Diagnostic: Test Download
app.get("/api/debug/download", async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "Path is required" });
  
  const { data, error } = await supabase.storage.from('datasets').download(path as string);
  res.json({ success: !!data, error, size: data?.size });
});

initStorage();
testDB();

// Analysis Schema
const AnalysisSchema = z.object({
  kpis: z.array(z.object({
    name: z.string(),
    value_key: z.string(),
    aggregation: z.enum(['sum', 'average', 'count', 'min', 'max']),
    format: z.string().optional()
  })),
  filters: z.array(z.string()),
  charts: z.array(z.object({
    id: z.string(),
    title: z.string(),
    chart_type: z.string(),
    x: z.string(),
    y: z.string().optional(),
    color: z.string().optional(),
    aggregation: z.string().optional(),
    why_this_chart: z.string(),
    python_code: z.string()
  })),
  executive_summary: z.string(),
  key_insights: z.array(z.string()),
  data_quality_findings: z.array(z.string()),
  follow_up_questions: z.array(z.string())
});

// Helper: God Level Data Cleaning
function godLevelClean(rawData: any[]) {
  if (!rawData || rawData.length === 0) return [];

  // 1. Normalize Column Names (lowercase, no spaces, no special chars)
  const originalCols = Object.keys(rawData[0]);
  const colMap = originalCols.reduce((acc, col) => {
    acc[col] = col.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    return acc;
  }, {} as Record<string, string>);

  const cleanedData = rawData.map(row => {
    const newRow: any = {};
    originalCols.forEach(col => {
      let val = row[col];
      const cleanCol = colMap[col];
      
      // Handle null-like values
      if (val === null || val === undefined || val === '') {
        newRow[cleanCol] = null;
        return;
      }

      if (typeof val === 'string') {
        val = val.trim();
        const nullLikes = ['n/a', 'na', 'null', 'none', '-', 'undefined', 'nan', '?', 'unknown'];
        if (nullLikes.includes(val.toLowerCase())) {
          newRow[cleanCol] = null;
          return;
        }

        // Handle Percentages
        let isPercent = false;
        if (val.endsWith('%')) {
          isPercent = true;
          val = val.slice(0, -1);
        }

        // Handle Parentheses for negatives: (100.00) -> -100.00
        if (val.startsWith('(') && val.endsWith(')')) {
          val = '-' + val.slice(1, -1);
        }

        // Numeric Cleaning: handle currency symbols, commas, and noise
        const numericStr = val.replace(/[$,\s]/g, '');
        const num = Number(numericStr);
        
        if (!isNaN(num) && numericStr !== '') {
          newRow[cleanCol] = isPercent ? num / 100 : num;
          return;
        }

        // Date Detection
        if (val.length > 5 && val.match(/\d/)) {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            newRow[cleanCol] = date.toISOString();
            return;
          }
        }
      }

      newRow[cleanCol] = val;
    });
    return newRow;
  });

  return cleanedData;
}

// Helper: Data Profiling
function profileData(data: any[]) {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);
  const stats: any = {};

  columns.forEach(col => {
    const values = data.map(d => d[col]).filter(v => v !== null && v !== undefined && v !== '');
    
    const numericValues = values.filter(v => typeof v === 'number') as number[];
    const dateValues = values.filter(v => typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) as string[];

    const isNumeric = numericValues.length > 0 && (numericValues.length / values.length) > 0.6;
    const isDate = dateValues.length > 0 && (dateValues.length / values.length) > 0.6;
    
    const uniqueValues = new Set(values);
    
    stats[col] = {
      type: isNumeric ? 'numeric' : (isDate ? 'date' : 'categorical'),
      missing: data.length - values.length,
      unique_count: uniqueValues.size,
      sample_values: Array.from(uniqueValues).slice(0, 5)
    };

    if (isNumeric) {
      stats[col].min = Math.min(...numericValues);
      stats[col].max = Math.max(...numericValues);
      stats[col].avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      stats[col].sum = numericValues.reduce((a, b) => a + b, 0);
    }
  });

  return {
    row_count: data.length,
    col_count: columns.length,
    columns: stats
  };
}

// API: Get Signed URL
app.post("/api/upload/signed-url", async (req, res) => {
  const { filename, userId } = req.body;
  const filePath = `${userId}/${Date.now()}_${filename}`;
  
  console.log(`Generating signed URL for: ${filePath}`);
  
  const { data, error } = await supabase.storage
    .from('datasets')
    .createSignedUploadUrl(filePath);

  if (error) {
    console.error("Signed URL Error:", error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ url: data.signedUrl, path: filePath });
});

// API: Process Dataset
app.post("/api/datasets/process", async (req, res) => {
  const { path: filePath, datasetId, userId } = req.body;
  console.log(`Processing dataset: ${datasetId} at ${filePath}`);

  try {
    // 1. Download from Storage
    console.log("Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('datasets')
      .download(filePath);

    if (downloadError) {
      console.error("Download Error:", downloadError);
      throw downloadError;
    }

    if (!fileData) {
      throw new Error("File download returned no data.");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    let rawData: any[] = [];

    // 2. Parse
    console.log("Parsing file...");
    if (filePath.endsWith('.csv')) {
      const csvStr = buffer.toString();
      rawData = Papa.parse(csvStr, { header: true, dynamicTyping: true }).data;
    } else {
      const workbook = XLSX.read(buffer);
      const firstSheetName = workbook.SheetNames[0];
      rawData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
    }

    // 3. Clean (God Level)
    console.log("Applying God Level cleaning...");
    const cleanedData = godLevelClean(rawData);
    
    // 4. Profile
    console.log("Profiling data...");
    const profile = profileData(cleanedData);
    const sample = cleanedData.slice(0, 100);

    // 5. Save Profile to DB
    console.log("Saving profile to DB...");
    const { error: profileError } = await supabase.from('profiles').insert({
      dataset_id: datasetId,
      profile_json: { ...profile, sample }
    });

    if (profileError) {
      console.error("Profile Insert Error:", profileError);
      throw profileError;
    }

    // Update dataset row
    console.log("Updating dataset row...");
    const { error: updateError } = await supabase.from('datasets').update({
      rows: cleanedData.length,
      cols: Object.keys(cleanedData[0] || {}).length
    }).eq('id', datasetId);

    if (updateError) {
      console.error("Dataset Update Error:", updateError);
      throw updateError;
    }

    res.json({ success: true, profile, sample });
  } catch (error: any) {
    console.error("Process Dataset Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during processing" });
  }
});

// API: Groq Plan
app.post("/api/groq/plan", async (req, res) => {
  const { profile, sample, goal, datasetId, userId } = req.body;
  console.log(`Generating AI plan for dataset: ${datasetId}`);

  const prompt = `
    You are a Senior Principal Data Analyst and Business Intelligence Expert. 
    Your task is to analyze a dataset profile and recommend a high-impact, logical, and business-centric dashboard.

    CRITICAL CONSTRAINTS:
    1. NO HALLUCINATIONS: Use ONLY the column names provided in the DATA PROFILE.
    2. READABILITY FIRST: Design charts for a non-technical CEO. Use clear, plain-English titles and descriptions.
    3. DATA LABELS: Always prioritize charts where values can be clearly labeled.
    4. LOGICAL VISUALIZATIONS: 
       - Bar charts for comparisons.
       - Line charts for trends over time.
       - Pie/Donut for parts-of-a-whole (limit to 6 slices max).
       - Scatter for relationships between two metrics.
    5. BUSINESS CONTEXT: The 'why_this_chart' must explain the "So What?" - what action should a manager take based on this?

    DATA PROFILE:
    ${JSON.stringify(profile, null, 2)}
    
    SAMPLE DATA (First 5 rows):
    ${JSON.stringify(sample.slice(0, 5), null, 2)}
    
    USER BUSINESS GOAL: ${goal || "Identify key performance drivers and areas for immediate business improvement."}
    
    RESPONSE REQUIREMENTS:
    Return ONLY a valid JSON object matching this schema:
    {
      "kpis": [
        {
          "name": "Human-Readable Metric Name (e.g., 'Total Revenue')", 
          "value_key": "column_name", 
          "aggregation": "sum|average|count|min|max", 
          "format": "$|number|percent"
        }
      ],
      "filters": ["column_names_to_filter_by"],
      "charts": [
        {
          "id": "unique_slug",
          "title": "Plain English Title (e.g., 'Which products make the most money?')",
          "chart_type": "bar|line|pie|scatter|histogram",
          "x": "column_name",
          "y": "column_name",
          "color": "column_name_optional",
          "aggregation": "sum|avg|count",
          "why_this_chart": "Explain in 1 sentence for a non-tech person why this matters.",
          "python_code": "reproducible plotly express code snippet with clear labels"
        }
      ],
      "executive_summary": "A clear, jargon-free summary of what the data is telling us.",
      "key_insights": ["Direct, actionable business observations."],
      "data_quality_findings": ["Simple notes on data health."],
      "follow_up_questions": ["3 strategic questions for a business meeting."]
    }
  `;

  try {
    console.log("Calling Groq API...");
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content!);
    
    // Save Analysis
    console.log("Saving analysis to DB...");
    const { data: analysisData, error: analysisError } = await supabase.from('analyses').insert({
      dataset_id: datasetId,
      user_id: userId,
      analysis_json: result
    }).select().single();

    if (analysisError) {
      console.error("Analysis Insert Error:", analysisError);
      throw analysisError;
    }

    res.json(analysisData);
  } catch (error: any) {
    console.error("Groq Plan Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during AI planning" });
  }
});

// Vite middleware for development
// Serve built frontend (dist folder generated by Vite build)
app.use(express.static(path.join(__dirname, "../dist")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Export Express app for Vercel Serverless Function
export default app;