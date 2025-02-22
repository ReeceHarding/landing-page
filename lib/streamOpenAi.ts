import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * SSE formatting
 */
export function sseFormat(dataObj: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(dataObj);
  return `data: ${jsonStr}\n\n`;
}

export function encoder(data: string): Uint8Array {
  return new TextEncoder().encode(data);
}

/**
 * Returns a ReadableStream that streams partial tokens from OpenAI's ChatCompletion with streaming=true
 * @param messages The array of ChatCompletion messages
 * @param onLog Callback for logging
 */
export function streamChatCompletion(messages: ChatCompletionMessageParam[], onLog?: (msg: string) => void): ReadableStream {
  let accumulatedText = "";
  return new ReadableStream({
    async start(controller) {
      if (!OPENAI_API_KEY) {
        onLog?.("No OPENAI_API_KEY found. Please provide it in your env.");
        controller.close();
        return;
      }
      try {
        onLog?.("Initiating streaming fetch to OpenAI...");
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages,
            temperature: 0.7,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          onLog?.(`OpenAI error. Status: ${response.status}, body: ${errorText}`);
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          onLog?.("No reader available from OpenAI response.");
          controller.close();
          return;
        }

        // Keep-alive pings
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder("data: [ping]\n\n"));
        }, 15000);

        const decoder = new TextDecoder("utf-8");
        let done = false;
        while (!done) {
          const { value, done: doneReading } = await reader.read();
          done = doneReading;
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            for (let line of lines) {
              line = line.trim();
              if (!line) continue;
              if (line.startsWith("data:")) {
                const dataPart = line.replace("data:", "").trim();
                if (dataPart === "[DONE]") {
                  onLog?.("OpenAI streaming ended.");
                  // Try to parse the accumulated text as JSON
                  try {
                    const jsonStr = accumulatedText.trim();
                    // Log the accumulated text for debugging
                    onLog?.(`Accumulated text: ${jsonStr}`);
                    JSON.parse(jsonStr); // Just validate it's valid JSON
                    // Send the accumulated text to the client
                    controller.enqueue(encoder(sseFormat({ content: jsonStr })));
                  } catch (err) {
                    onLog?.(`Error parsing accumulated text: ${err}`);
                    // Send a fallback JSON if parsing fails
                    const fallbackJson = JSON.stringify({
                      heroTitle: "AI Developer Filter",
                      heroDescription: "A powerful tool to help companies find the right AI developers",
                      ctaTitle: "Start Filtering Today",
                      ctaDescription: "Find the perfect AI developer for your team",
                      features: [
                        "Smart candidate filtering",
                        "AI skill assessment",
                        "Experience verification",
                        "Cultural fit analysis"
                      ]
                    });
                    controller.enqueue(encoder(sseFormat({ content: fallbackJson })));
                  }
                  done = true;
                  break;
                }
                try {
                  const json = JSON.parse(dataPart);
                  // If there's partial text
                  const deltaText = json.choices?.[0]?.delta?.content || "";
                  if (deltaText) {
                    accumulatedText += deltaText;
                    // Log partial content for debugging
                    onLog?.(`Received chunk: ${deltaText}`);
                  }
                } catch (err) {
                  // Ignore parse errors for partial chunks
                }
              }
            }
          }
        }
        clearInterval(keepAlive);
        onLog?.("Completed reading from OpenAI. Closing stream...");
        controller.close();

      } catch (err: any) {
        onLog?.("Error streaming from OpenAI: " + err.message);
        controller.close();
      }
    },
    cancel() {
      onLog?.("Stream canceled by client or server.");
    },
  });
} 