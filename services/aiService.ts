import { groq } from "../lib/backend-config.js";
import { z } from "zod";

export const AnalysisSchema = z.object({
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

export async function generateAnalysisPlan(profile: any, sample: any[], goal: string) {
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

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content!);
}

export async function generateCustomGraph(profile: any, sample: any[], prompt: string) {
  const systemPrompt = `
    You are a Data Visualization Expert. 
    Based on the dataset profile and sample data, generate a chart configuration for the user's request.
    
    DATA PROFILE:
    ${JSON.stringify(profile, null, 2)}
    
    SAMPLE DATA:
    ${JSON.stringify(sample.slice(0, 5), null, 2)}
    
    RESPONSE REQUIREMENTS:
    Return ONLY a JSON object:
    {
      "title": "Chart Title",
      "chart_type": "bar|line|pie|scatter",
      "x": "column_name",
      "y": "column_name_optional",
      "aggregation": "sum|avg|count|none",
      "reasoning": "Brief explanation"
    }
  `;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content!);
}

export async function chatWithData(profile: any, sample: any[], query: string, history: any[]) {
  const systemPrompt = `
    You are an AI Data Analyst. 
    Answer the user's question based on the provided dataset profile and sample data.
    
    DATA PROFILE:
    ${JSON.stringify(profile, null, 2)}
    
    SAMPLE DATA (First 5 rows):
    ${JSON.stringify(sample.slice(0, 5), null, 2)}
    
    RULES:
    1. Be concise and professional.
    2. If the user asks for a chart, suggest the best x and y columns.
    3. Use Markdown for formatting.
    4. If you don't know the answer, say you don't know based on the data.
  `;

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: "user", content: query }
  ];

  const completion = await groq.chat.completions.create({
    messages: messages as any,
    model: "llama-3.3-70b-versatile",
    stream: false // Streaming can be added later if needed
  });

  return completion.choices[0].message.content;
}
