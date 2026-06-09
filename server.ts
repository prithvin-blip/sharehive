import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits large enough for base64 image requests
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // Endpoint to validate if an uploaded image is relevant to the listed product
  app.post("/api/validate-image", async (req, res) => {
    try {
      const { image, title, category } = req.body;

      if (!image) {
        return res.status(400).json({ error: "Missing required parameter: image" });
      }
      if (!title || !category) {
        return res.status(400).json({ error: "Missing required parameter: title or category" });
      }

      // Parse base64 string
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format. Expected a base64 data URL" });
      }

      const mimeType = match[1];
      const base64Data = match[2];

      const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };

      const prompt = `Analyze this uploaded image and determine if it represents a valid, realistic, or relevant image of the listed product.

Product Core Details specified by User:
- Subject Title Selected: "${title}"
- Marketplace Category Selected: "${category}"

Analyze the product name and category, and look at the image.
Determine if the image is suitable, matching, or reasonably relevant to representing a "${title}" or a student/campus product categorized under "${category}".
If the user lists a product titled "${title}" but uploads something totally unrelated (for example, uploading a picture of a cat, dog, random landscapes, or completely separate items like a pizza when the item is a Laptop or Scientific Calculator), set containsRelevantSubject to false.

Return a JSON object containing:
1. "isRelevant" (boolean): true if the image is related/relevant to the product/item category/subject, false if it is totally unrelated or mismatched.
2. "detectedLabel" (string): A short label (1-4 words) describing what is primarily visible in the image.
3. "reason" (string): A brief, friendly explanation (1-2 sentences) of your reasoning. If irrelevant, provide a helpful and polite message explaining why it was flagged (e.g. "The uploaded image appears to contain a cat, which does not match the listed product 'Laptop'.").`;

      // Use basic text and image understanding model
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [imagePart, prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isRelevant: {
                type: Type.BOOLEAN,
                description: "Is the image relevant to the product title and category?"
              },
              detectedLabel: {
                type: Type.STRING,
                description: "Shorthand description of what the AI detected in the picture."
              },
              reason: {
                type: Type.STRING,
                description: "Explanation of why the image is relevant or why it was rejected."
              }
            },
            required: ["isRelevant", "detectedLabel", "reason"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Received an empty response from Gemini API");
      }

      const parseResult = JSON.parse(responseText.trim());
      return res.json(parseResult);
    } catch (e: any) {
      console.error("Error in validate-image api:", e);
      return res.status(500).json({ error: e.message || "Could not validate image" });
    }
  });

  // Endpoint to validate if an item description is high-quality, realistic, and relevant
  app.post("/api/validate-description", async (req, res) => {
    try {
      const { description, title, category } = req.body;

      if (!description) {
        return res.status(400).json({ error: "Missing required parameter: description" });
      }
      if (!title || !category) {
        return res.status(400).json({ error: "Missing required parameter: title or category" });
      }

      const prompt = `You are an AI assistant for Share Hive, a high-trust campus P2P rental marketplace.
Your task is to analyze the user's item description and verify if it is realistic, helpful, contains no offensive language, is not spam/gibberish, and is actually relevant to listing a "${title}" under the category "${category}".

User Inputs:
- Item Title: "${title}"
- Category: "${category}"
- User Description: "${description}"

Rules for Verification:
1. "isValid" must be FALSE if the user description consists of:
   - Plain gibberish/letters like "asdasdasdasd", "qwertyuiop", "dfgkhjfsdhjk".
   - Only numbers, pure symbols, or repeated special characters like "123213123123!!!@@@".
   - A single word repeated over and over (e.g., "laptop laptop laptop laptop").
   - Explicit offensive words, toxicity, high-risk items, or malicious content.
   - Plainly irrelevant things (e.g. they listed a "Scientific Calculator" but wrote a review about a chocolate bar).
2. Otherwise, "isValid" should be TRUE if it is a reasonable description of the item state, condition, specifications, or rental context (even if short).
3. "suggestion": Provide a beautifully polished, professional version of the description based on the user's intent. If the original was too short or sketchy, expand it into a polite, well-written option of 1-3 sentences fit for Share Hive. Make it sound helpful and exciting for a potential renter!

Return a JSON object containing:
1. "isValid" (boolean): true if acceptable, false if it's spam, gibberish, offensive, or completely irrelevant.
2. "reason" (string): A short, friendly explanation (1 sentence) for why it is valid, or explaining the quality issue if blocked.
3. "suggestion" (string): An elegant, polished suggestion that expands on or cleans up the user's input to make it ideal for the marketplace.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [prompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: {
                type: Type.BOOLEAN,
                description: "Whether the description is realistic, helpful, and valid."
              },
              reason: {
                type: Type.STRING,
                description: "Brief reason for approval or rejection."
              },
              suggestion: {
                type: Type.STRING,
                description: "A nicely cleaned up/polished or expanded version of their description."
              }
            },
            required: ["isValid", "reason", "suggestion"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Received an empty response from Gemini API for description validation");
      }

      const parseResult = JSON.parse(responseText.trim());
      return res.json(parseResult);
    } catch (e: any) {
      console.error("Error in validate-description api:", e);
      return res.status(500).json({ error: e.message || "Could not validate description" });
    }
  });

  // Serve static UI assets or delegate to Vite in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
