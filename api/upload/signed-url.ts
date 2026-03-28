import { supabaseAdmin } from "../../lib/backend-config.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { filename, userId } = req.body;
  const filePath = `${userId}/${Date.now()}_${filename}`;
  
  console.log(`Generating signed URL for: ${filePath}`);
  
  const { data, error } = await supabaseAdmin.storage
    .from('datasets')
    .createSignedUploadUrl(filePath);

  if (error) {
    console.error("Signed URL Error:", error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ url: data.signedUrl, path: filePath });
}
