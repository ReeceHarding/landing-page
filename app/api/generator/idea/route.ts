import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a visionary startup consultant and product strategist who specializes in identifying high-potential business opportunities. Your expertise lies in spotting market gaps and crafting innovative solutions that solve real problems.

When generating business ideas, follow these principles:
1. SPECIFICITY: Target a clear market segment and use case
2. UNIQUENESS: Identify an innovative angle or approach
3. TIMELINESS: Consider current market trends and needs
4. FEASIBILITY: Ensure the idea is realistic to implement
5. SCALABILITY: Show potential for growth and expansion

Format your response as a 1-2 sentence pitch that includes:
- The specific problem being solved
- The unique solution approach
- The primary target audience
- A clear value proposition

Example: "A machine learning-powered platform that helps small e-commerce businesses reduce cart abandonment by analyzing customer behavior patterns and automatically personalizing the checkout experience in real-time, leading to 15-30% higher conversion rates."`;

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