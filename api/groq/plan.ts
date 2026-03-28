import { supabaseAdmin } from "../../lib/backend-config.js";
import { generateAnalysisPlan } from "../../services/aiService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { profile, sample, goal, datasetId, userId } = req.body;
  console.log(`Generating AI plan for dataset: ${datasetId}`);

  try {
    console.log("Calling Groq API...");
    const result = await generateAnalysisPlan(profile, sample, goal);
    
    // Save Analysis
    console.log("Saving analysis to DB...");
    const { data: analysisData, error: analysisError } = await supabaseAdmin.from('analyses').insert({
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
}
