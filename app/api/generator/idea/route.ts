import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a creative business consultant specializing in innovative startup ideas. 
Generate a concise, specific, and innovative business idea that would make for an interesting landing page.
The idea should be 1-2 sentences long and focus on a unique value proposition.
Make it specific enough to be interesting but general enough to be flexible.`;

export async function POST() {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: "Generate a business idea." },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const idea = data.choices[0].message.content.trim();

    return NextResponse.json({ idea });
  } catch (error: any) {
    console.error("Error generating idea:", error);
    return NextResponse.json(
      { error: "Failed to generate idea" },
      { status: 500 }
    );
  }
} 