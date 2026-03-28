import { chatWithData } from "../services/aiService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { profile, sample, query, history } = req.body;
  console.log(`Chatting with data for query: ${query}`);

  try {
    const result = await chatWithData(profile, sample, query, history);
    if (!result) throw new Error("AI returned an empty response.");
    res.json({ response: result });
  } catch (error: any) {
    console.error("Chat Error:", error);
    const message = error.message || "Internal Server Error during chat";
    res.status(500).json({ error: message, details: error.stack });
  }
}
