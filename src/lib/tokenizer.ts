import { Tokenizer } from "@huggingface/tokenizers";
import { uiPreferences$ } from "~/lib/state/ui";

let currentModelId: string | null = null;
let tokenizerPromise: Promise<Tokenizer> | null = null;

async function initTokenizer(modelId: string): Promise<Tokenizer> {
  const token = uiPreferences$.huggingfaceToken.get();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const [tokenizerJson, tokenizerConfig] = await Promise.all([
    fetch(`https://huggingface.co/${modelId}/resolve/main/tokenizer.json`, {
      headers,
    }).then((res) => res.json()),
    fetch(
      `https://huggingface.co/${modelId}/resolve/main/tokenizer_config.json`,
      { headers },
    ).then((res) => res.json()),
  ]);

  return new Tokenizer(tokenizerJson, tokenizerConfig);
}

export function getTokenizer(modelId: string): Promise<Tokenizer> {
  if (tokenizerPromise && currentModelId === modelId) {
    return tokenizerPromise;
  }

  currentModelId = modelId;
  tokenizerPromise = initTokenizer(modelId);
  return tokenizerPromise;
}

export async function getTokenCount(text: string): Promise<number> {
  if (!text) return 0;
  try {
    const modelId = uiPreferences$.tokenizerModelId.get();
    const tokenizer = await getTokenizer(modelId);
    const encoded = tokenizer.encode(text);
    return encoded.ids.length;
  } catch (error) {
    console.error("Error tokenizing text:", error);
    // Fallback to simple word count if tokenizer fails
    return text.trim().split(/\s+/).length;
  }
}

export async function getTokens(text: string): Promise<string[]> {
  if (!text) return [];
  try {
    const modelId = uiPreferences$.tokenizerModelId.get();
    const tokenizer = await getTokenizer(modelId);
    const encoded = tokenizer.encode(text);
    return encoded.tokens;
  } catch (error) {
    console.error("Error getting tokens:", error);
    return text.trim().split(/\s+/);
  }
}

export async function testTokenizerMetadata(
  modelId: string,
): Promise<{ success: boolean; message: string }> {
  const token = uiPreferences$.huggingfaceToken.get();
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const [jsonRes, configRes] = await Promise.all([
      fetch(`https://huggingface.co/${modelId}/resolve/main/tokenizer.json`, {
        method: "HEAD",
        headers,
      }),
      fetch(
        `https://huggingface.co/${modelId}/resolve/main/tokenizer_config.json`,
        { method: "HEAD", headers },
      ),
    ]);

    if (jsonRes.ok && configRes.ok) {
      return { success: true, message: "Tokenizer metadata found!" };
    } else if (!jsonRes.ok && !configRes.ok) {
      return {
        success: false,
        message:
          "Tokenizer files not found for this model (unauthorized or missing).",
      };
    } else if (!jsonRes.ok) {
      return { success: false, message: "tokenizer.json not found." };
    } else {
      return { success: false, message: "tokenizer_config.json not found." };
    }
  } catch (error) {
    return {
      success: false,
      message: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
