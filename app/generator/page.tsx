"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function GeneratorPage() {
  const router = useRouter();
  const [idea, setIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedIds, setGeneratedIds] = useState<{ preview?: string; dynamic?: string }>({});

  const addLog = (message: string) => {
    console.log(`[Generator] ${message}`);
    setLogs((prev) => [...prev, message]);
  };

  const generateIdea = async () => {
    setIsGeneratingIdea(true);
    addLog("Generating business idea...");

    try {
      const response = await fetch("/api/generator/idea", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIdea(data.idea);
      addLog("Business idea generated!");

      // Automatically trigger the landing page generation
      handleGenerate(data.idea);
    } catch (error) {
      addLog(`Error generating idea: ${error}`);
      setIsGeneratingIdea(false);
    }
  };

  const handleGenerate = async (ideaToUse = idea) => {
    setIsGenerating(true);
    setLogs([]);
    setGeneratedIds({}); // Reset IDs
    addLog("Starting generation process...");

    try {
      addLog("Sending request to /api/generator...");
      const response = await fetch("/api/generator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idea: ideaToUse }),
      });

      if (!response.ok) {
        addLog(`Server error: ${response.status} ${response.statusText}`);
        setIsGenerating(false);
        return;
      }

      if (!response.body) {
        addLog("No response body received");
        setIsGenerating(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      let buffer = "";

      addLog("Starting to read response stream...");

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value);
          buffer += chunk;
          let lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            if (line.startsWith("data:")) {
              const dataStr = line.replace("data:", "").trim();
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              if (dataStr === "[ping]") {
                continue;
              }
              try {
                const json = JSON.parse(dataStr);
                if (json.log) {
                  addLog(json.log);
                }
                if (json.generatedId || json.dynamicId) {
                  setGeneratedIds({
                    preview: json.generatedId,
                    dynamic: json.dynamicId
                  });
                  addLog("✨ Landing page generated successfully!");
                  addLog("Redirecting to dynamic version...");
                  // Automatically redirect to the dynamic version
                  if (json.dynamicId) {
                    router.push(`/dynamic-lp/${json.dynamicId}`);
                  }
                }
              } catch (err) {
                addLog(`Error parsing chunk: ${err}`);
              }
            }
          }
        }
      }
    } catch (err: any) {
      addLog(`Client error: ${err.message}`);
    }
    setIsGenerating(false);
    setIsGeneratingIdea(false);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Generate Your Landing Page</h1>

      <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
        <label className="block font-medium mb-2" htmlFor="idea">
          Business Idea:
        </label>
        <div className="flex flex-col gap-4">
          <textarea
            id="idea"
            rows={5}
            className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 rounded-lg mb-4 text-slate-900 dark:text-white"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Enter your business idea..."
          />
          <div className="flex gap-4">
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || isGeneratingIdea || !idea.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-60 transition-colors"
            >
              {isGenerating ? "Generating..." : "Generate landing page"}
            </button>
            <button
              onClick={generateIdea}
              disabled={isGenerating || isGeneratingIdea}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-60 transition-colors"
            >
              {isGeneratingIdea ? "Thinking..." : "🤖 Generate idea"}
            </button>
          </div>
        </div>
      </div>

      {/* Generated URLs section */}
      {(generatedIds.preview || generatedIds.dynamic) && (
        <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">Your Generated Landing Pages</h2>
          <div className="flex flex-col gap-4">
            {generatedIds.preview && (
              <button
                onClick={() => router.push(`/preview/${generatedIds.preview}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Preview Version
              </button>
            )}
            {generatedIds.dynamic && (
              <button
                onClick={() => router.push(`/dynamic-lp/${generatedIds.dynamic}`)}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                View Dynamic Version
              </button>
            )}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-2">Generation Progress</h2>
        <div className="border border-slate-200 dark:border-slate-700 bg-slate-900 text-slate-300 p-4 h-48 overflow-auto rounded-lg font-mono text-sm">
          {logs.map((log, idx) => (
            <div key={idx} className="py-0.5">
              {log}
            </div>
          ))}
          {(isGenerating || isGeneratingIdea) && (
            <div className="py-0.5 animate-pulse">
              Processing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 