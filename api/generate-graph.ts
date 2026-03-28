import { generateCustomGraph } from "../services/aiService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { profile, sample, prompt } = req.body;
  console.log(`Generating custom graph for prompt: ${prompt}`);

  try {
    const result = await generateCustomGraph(profile, sample, prompt);
    res.json(result);
  } catch (error: any) {
    console.error("Generate Graph Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error during graph generation" });
  }
}
