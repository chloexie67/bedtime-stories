// Point-and-name: Claude looks at a camera frame and picks ONE id from the approved vocabulary, or "none".
// Forced tool use with an enum means Claude cannot return anything outside the list.
import "dotenv/config";
import { VOCAB } from "./vocab.js";

const MODEL = "claude-haiku-5-5";

export interface IdentifyResult {
  id: string; // vocab id or "none"
  confidence: "high" | "medium" | "low";
}

export async function identifyObject(jpegBase64: string): Promise<IdentifyResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const ids = VOCAB.map((v) => v.id);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2026-10-21",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 200,
      system:
        "You help a young child learn words. Look at the photo and decide which ONE object from the allowed list " +
        "is the main thing being shown. Only pick an object if it is clearly visible and clearly that object. " +
        'If none of the allowed objects is clearly shown, or there are people\'s faces as the main subject, answer "none". ' +
        "Never guess. Allowed objects: " +
        VOCAB.map((v) => `${v.id} (${v.en})`).join(", "),
      tools: [
        {
          name: "name_object",
          description: "Report which allowed object is shown.",
          input_schema: {
            type: "object",
            properties: {
              id: { type: "string", enum: [...ids, "none"] },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
            },
            required: ["id", "confidence"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "name_object", disable_parallel_tool_use: true },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpegBase64 } },
            { type: "text", text: "Which allowed object is this?" },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`identify failed: HTTP ${res.status} ${await res.text()}`);
  const data = await res.json();
  const tool = data.content?.find((c: { type: string }) => c.type === "tool_use");
  const out = tool?.input as IdentifyResult | undefined;
  // Defensive: re-validate against the list; low confidence counts as "none" so the voice never names a guess.
  if (!out || !(ids.includes(out.id) || out.id === "none")) return { id: "none", confidence: "low" };
  if (out.confidence === "low") return { id: "none", confidence: "low" };
  return out;
}
