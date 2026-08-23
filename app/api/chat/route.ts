import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";

// Initialize Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Initialize Groq if API Key exists
const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === '') return null;
  return new Groq({ apiKey });
};

const SYSTEM_INSTRUCTION = `You are an elite, highly sophisticated AI assistant embedded in a premium web development portfolio. Respond to the user's inquiry with an elegant, concise, and highly professional tone. Keep your response short (2-4 sentences max), focusing on design, development, and seamless digital experiences.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, dbContext, matchedQuery } = body || {};

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // 1. If we have a direct match from Firestore database, return it immediately
    if (matchedQuery && matchedQuery.answer) {
      return NextResponse.json({
        text: matchedQuery.answer,
        buttonName: matchedQuery.buttonName || null,
        buttonLink: matchedQuery.buttonLink || null,
        source: 'database'
      });
    }

    // Context from database items if provided
    let contextPrompt = prompt.trim();
    if (dbContext && Array.isArray(dbContext) && dbContext.length > 0) {
      const formattedContext = dbContext
        .slice(0, 8)
        .map((q: any) => `[Topic: ${q.topic}] User Query: ${q.userQuery} -> Answer: ${q.answer}`)
        .join("\n");
      contextPrompt = `KNOWLEDGE BASE:\n${formattedContext}\n\nUSER QUESTION: ${prompt}`;
    }

    // 2. Try Groq API if available
    const groq = getGroqClient();
    if (groq) {
      try {
        const groqCompletion = await groq.chat.completions.create({
          messages: [
            { role: "system", content: SYSTEM_INSTRUCTION },
            { role: "user", content: contextPrompt }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.7,
          max_tokens: 300,
        });

        const reply = groqCompletion.choices[0]?.message?.content;
        if (reply && reply.trim().length > 0) {
          return NextResponse.json({
            text: reply.trim(),
            source: 'groq'
          });
        }
      } catch (groqErr) {
        console.warn("Groq API failed or rate-limited, falling back to Gemini:", groqErr);
      }
    }

    // 3. Fallback to Gemini
    const CANDIDATE_MODELS = [
      "gemini-3.7-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest"
    ];

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: contextPrompt,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          }
        });

        if (response.text) {
          return NextResponse.json({ 
            text: response.text,
            source: 'gemini'
          });
        }
      } catch (err: any) {
        console.warn(`Gemini model ${model} issue:`, err?.message || err);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // 4. Fallback graceful response if all APIs are unavailable or quota exceeded
    return NextResponse.json({
      text: "I am ready to bring your visionary digital project to life with bespoke architecture and refined aesthetics. Let's connect and build something remarkable together.",
      source: 'fallback'
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({
      text: "I am ready to bring your visionary digital project to life with bespoke architecture and refined aesthetics. Let's connect and build something remarkable together.",
      source: 'fallback'
    }, { status: 200 }); // Return 200 with fallback so client never gets 500/503 fetch failure
  }
}
