import { supabaseAdmin } from "../../lib/backend-config.js";
import { parseFile, godLevelClean, profileData } from "../../services/dataService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { path: filePath, datasetId, userId } = req.body;
  console.log(`Processing dataset: ${datasetId} at ${filePath}`);

  try {
    // 1. Download from Storage
    console.log("Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
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
    
    // 2. Parse
    console.log("Parsing file...");
    const rawData = parseFile(buffer, filePath);

    // 3. Clean (God Level)
    console.log("Applying God Level cleaning...");
    const cleanedData = godLevelClean(rawData);
    
    // 4. Profile
    console.log("Profiling data...");
    const profile = profileData(cleanedData);
    const sample = cleanedData.slice(0, 100);

    // 5. Save Profile to DB
    console.log("Saving profile to DB...");
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      dataset_id: datasetId,
      profile_json: { ...profile, sample }
    });

    if (profileError) {
      console.error("Profile Insert Error:", profileError);
      throw profileError;
    }

    // Update dataset row
    console.log("Updating dataset row...");
    const { error: updateError } = await supabaseAdmin.from('datasets').update({
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
}
