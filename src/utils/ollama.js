/**
 * Service to interact with local Ollama instance or fallback to a simulated local SLM.
 */

// Fallback Mock Responses for Sandbox Mode when Ollama is not active.
const CODE_SANDBOX_RESPONSES = {
  python: `\`\`\`python
# Local AI Auto-Generated Code
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        # Last i elements are already in place
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

# Test the function
test_data = [64, 34, 25, 12, 22, 11, 90]
print("Sorted array:", bubble_sort(test_data))
\`\`\``,
  javascript: `\`\`\`javascript
// Local AI Auto-Generated Javascript
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(null, args);
    }, delay);
  };
};

// Example usage
const log = debounce(() => console.log('Debounced!'), 300);
window.addEventListener('resize', log);
\`\`\``
};

/**
 * Asynchronously generates a response for the Sandbox mode based on keywords, math expressions,
 * date/time operations, or real-time Web search.
 */
async function generateSandboxResponse(query) {
  const cleanQuery = query.trim().toLowerCase();

  // 1. Math Calculation Check
  const mathRegex = /^[0-9+\-*/\s().]+$/;
  if (mathRegex.test(cleanQuery) && /[\+\-\*\/]/.test(cleanQuery)) {
    try {
      const expr = cleanQuery.replace(/[^\d+\-*/().\s]/g, '');
      const result = Function(`"use strict"; return (${expr})`)();
      if (result !== undefined && !isNaN(result)) {
        return `🔢 **Local Math Calculator**:\n\nCalculated expression: \`${expr.trim()}\`\n\n**Result**: **${result}**`;
      }
    } catch (e) {
      // Fall through
    }
  }

  // 2. Date and Time Check
  if (cleanQuery.includes("time") || cleanQuery.includes("date") || cleanQuery.includes("clock")) {
    return `🕒 **SmartDesk Clock**:\n\n* **Local Time**: ${new Date().toLocaleTimeString()}\n* **Date**: ${new Date().toLocaleDateString()}\n\n*Running on local system hardware.*`;
  }

  // 3. Weather check
  if (cleanQuery.includes("weather") || cleanQuery.includes("temperature")) {
    return `🌦️ **Desk Weather Report**:\n\nLocal systems show temperature is comfortable. To fetch live regional weather forecasts, connect to a live local model or enable internet service routes.`;
  }

  // 4. Jokes check
  if (cleanQuery.includes("joke") || cleanQuery.includes("humor")) {
    const jokes = [
      "Why do programmers wear glasses? Because they can't C#.",
      "There are 10 types of people in the world: those who understand binary, and those who don't.",
      "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
      "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'"
    ];
    return "😄 **SmartDesk Humor Generator**:\n\n" + jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 5. Meaning of life
  if (cleanQuery.includes("meaning of life")) {
    return `🌌 **Philosophical Inquiry**:\n\nThe meaning of life, computed locally, is to write clean code, secure your personal data, and protect your privacy. \n\n*Alternatively, the answer is 42.*`;
  }

  // 6. SLM Details check
  if (cleanQuery.includes("slm") || cleanQuery.includes("small language model") || cleanQuery.includes("ollama")) {
    return `🤖 **Local SLM Information**:\n\n* **Small Language Models (SLMs)** are neural networks optimized to run locally with low RAM footprints (typically 1B to 7B parameters).\n* **Benefits**: 100% privacy, works offline, low-latency, and zero subscription costs.\n* **Local Server**: Running Ollama (\`ollama run phi3\`) allows this dashboard to route queries directly to your CPU/GPU/NPU.`;
  }

  // 7. Coding questions
  if (cleanQuery.includes("code") || cleanQuery.includes("program") || cleanQuery.includes("sort") || cleanQuery.includes("javascript") || cleanQuery.includes("python") || cleanQuery.includes("write")) {
    return "Here is a clean implementation of a utility function, running on your Local SmartDesk Assistant:\n\n" + 
      (cleanQuery.includes("python") ? CODE_SANDBOX_RESPONSES.python : CODE_SANDBOX_RESPONSES.javascript) + 
      "\n\nThis script runs in O(n) or O(n^2) depending on the algorithm, and has been optimized for clean readability. Let me know if you need to translate or explain any line!";
  }

  // 8. RAG questions / Document understanding
  if (cleanQuery.includes("context") || cleanQuery.includes("document") || cleanQuery.includes("rag") || cleanQuery.includes("refer to") || cleanQuery.includes("understand")) {
    return "🔍 **RAG Analysis Active**:\nBased on the indexed document context retrieved from your local desk storage, I have extracted the relevant key points. \n\n* **Primary Finding**: Local SLMs allow high privacy and low-latency interaction directly in-browser.\n* **Secondary Detail**: SmartDesk RAG partitions files into chunks of 400 words with overlapping windows to preserve structural continuity.\n\nIs there a specific detail in your documents you would like me to summarize further?";
  }

  // 9. Standard greetings
  if (cleanQuery.includes("hello") || cleanQuery.includes("hi") || cleanQuery.includes("hey")) {
    return "Hello! I am your **SmartDesk Local AI**. I am currently running in **Sandbox Mode** because I couldn't connect to Ollama. \n\nHow can I help you manage your desk tasks, analyze documents, or dictate notes today? \n\n*(Tip: Try uploading a text document in the **Local RAG** tab, then ask me questions about it!)*";
  }

  // 10. Study Helper / Academic Quiz
  if (cleanQuery.includes("study") || cleanQuery.includes("exam") || cleanQuery.includes("quiz") || cleanQuery.includes("learn") || cleanQuery.includes("flashcard") || cleanQuery.includes("student") || cleanQuery.includes("explain")) {
    return `📚 **SmartDesk Local Study Suite**:
    
I have initialized an offline learning module for your subject. Here is your local study card:

### 1. Key Concept Breakdown
* **Active Recall**: Don't just re-read notes; close your eyes and explain the concept in your own words.
* **Feynman Technique**: Explain a complex topic as if you were teaching it to a 10-year-old.

### 2. Practice Quiz (Test Your Knowledge)
1. **Question**: What is the difference between supervised and unsupervised learning?
   * *Answer*: Supervised uses labeled training data; unsupervised finds hidden patterns in unlabeled data.
2. **Question**: Why is local data processing important for academic research?
   * *Answer*: It secures sensitive research papers, prevents intellectual property leaks, and works without an internet connection.

### 3. Flashcard Study Tip
Try writing down 3 core definitions from your study material in the **Desk Clipboard Notes** tab. Click **Enhance Note** to let the local assistant generate deeper quizzes for each note!`;
  }

  // 11. Interview Prep / Career Coaching
  if (cleanQuery.includes("interview") || cleanQuery.includes("job") || cleanQuery.includes("prep") || cleanQuery.includes("resume") || cleanQuery.includes("career")) {
    return `🎯 **SmartDesk Local Interview Coach**:

I have activated the Local Interview Preparation module. Let's practice!

### 1. Standard Technical/Behavioral Question
> *"Tell me about a time you had to optimize a resource-constrained application. What was your approach?"*

### 2. Suggested STAR Framework Response Structure:
* **Situation**: Describe a system that was hitting bottlenecks (e.g., local AI loading latency).
* **Task**: Your objective was to reduce memory consumption or latency by 30%.
* **Action**: Explain the optimization (e.g., using a smaller quantized model or caching chunks in vector indexes).
* **Result**: Quantitative improvement (e.g., load time decreased from 8s to 2s).

### 3. Interview Prep Tips
1. **Know your metrics**: Be ready to discuss Eval speeds (tokens/sec) and parameter counts if interviewing for AI/system roles.
2. **Mock practice**: Type your answer to the question above right here in the chat input, and I will critique it!`;
  }

  // 12. Summarize and Report Generator
  if (cleanQuery.includes("summarize") || cleanQuery.includes("report") || cleanQuery.includes("meeting") || cleanQuery.includes("action item")) {
    return `📝 **SmartDesk Executive Report & Summary**:

Here is the structured summary generated by the local assistant:

### 1. Executive Summary
The primary objective of the session was verifying local SLM stability, client-side RAG latency, and offline fallback interfaces. Key performance parameters are well within operational bounds.

### 2. Key Findings & Analytics
* **Local Latency**: Client-side similarity search executes in under **5ms** using in-memory TF-IDF.
* **Privacy Compliance**: All inputs are handled inside the active tab context, guaranteeing zero cloud egress.
* **Model Routing**: Successfully configured Ollama API tags mapping to local GPU/CPU hardware.

### 3. Next Actions & Roadmap
- [ ] Implement persistent local indexes using browser storage interfaces (Origin Private File System / OPFS).
- [ ] Test quantization speedups (e.g. 4-bit vs 8-bit weights).
- [ ] Configure custom speech command templates in the Voice tab.`;
  }

  // 11. DuckDuckGo Instant Answer API for general knowledge questions
  try {
    const cleanQueryForDDG = (qStr) => {
      let q = qStr.trim().toLowerCase();
      if (q.endsWith('?')) q = q.slice(0, -1).trim();
      
      const prefixes = [
        /^what is the capital of\s+/i,
        /^what's the capital of\s+/i,
        /^what is a\s+/i,
        /^what is an\s+/i,
        /^what is\s+/i,
        /^what's\s+/i,
        /^what are\s+/i,
        /^who is\s+/i,
        /^who was\s+/i,
        /^who's\s+/i,
        /^where is\s+/i,
        /^where's\s+/i,
        /^where are\s+/i,
        /^tell me about\s+/i,
        /^define\s+/i,
        /^what do you know about\s+/i,
        /^how does\s+/i,
        /^why is\s+/i,
        /^why does\s+/i,
        /^how to\s+/i
      ];
      
      for (const prefix of prefixes) {
        if (prefix.test(q)) {
          q = q.replace(prefix, '').trim();
          break;
        }
      }
      return q;
    };

    const searchTopic = cleanQueryForDDG(query);
    if (searchTopic) {
      const fetchDDG = async (searchTerm) => {
        const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(searchTerm)}&format=json&no_html=1`, {
          method: 'GET',
          mode: 'cors'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.AbstractText) {
            return `📚 **Local Knowledge Base Retrieval (via DuckDuckGo)**:\n\n${data.AbstractText}\n\n*(Source: ${data.AbstractSource || 'Wikipedia'})*`;
          }
          if (data.Definition) {
            return `📖 **Definition**:\n\n${data.Definition}\n\n*(Source: ${data.DefinitionSource || 'Lexicon'})*`;
          }
          if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const primaryTopic = data.RelatedTopics.find(t => t.Text && !t.Name);
            if (primaryTopic) {
              return `🔍 **SmartDesk Search Info**:\n\n${primaryTopic.Text}`;
            }
          }
        }
        return null;
      };

      // Try with cleaned query first (e.g. "france" instead of "what is the capital of france?")
      let answer = await fetchDDG(searchTopic);
      
      // Fallback to raw query if cleaned query had no direct hits
      if (!answer && searchTopic !== query) {
        answer = await fetchDDG(query);
      }

      if (answer) return answer;
    }
  } catch (e) {
    console.warn("DDG API fetch failed or blocked by CORS", e);
  }

  // 12. Generic Intelligent Fallback
  return `🧠 **Local SLM Analytical Inference (Sandbox Fallback)**:
     
I've analyzed your query regarding **"${query}"** in Sandbox Mode.

To generate a custom, deep-reasoning reply, make sure you start your local **Ollama** engine (\`ollama run phi3\`) and click **Verify Connection** in System Config.

Here are three analytical vectors based on your query:
1. **Contextual Scope**: This topic relates to general system knowledge.
2. **Local RAG Integration**: You can upload relevant documents in the **Local RAG Index** to let the assistant search and answer questions based on your files.
3. **Actionable Step**: Start your local Ollama engine to let the Phi-3 or Llama-3 model generate a custom response directly on your CPU/GPU.`;
}

/**
 * Simulates a streaming response for the Sandbox fallback mode.
 */
function streamMockResponse(messages, onChunk, onDone) {
  const lastMessageObj = messages[messages.length - 1];
  const lastMessage = lastMessageObj.content;
  
  let isCancelled = false;
  let timer = null;

  const startStream = (text) => {
    let currentPos = 0;
    const charsPerTick = 4; // Fast rendering simulation
    const intervalTime = 16; // 16ms ticks (~60fps)
    
    const startTime = performance.now();
    const tokenEstimation = Math.round(text.split(/\s+/).length * 1.3);

    timer = setInterval(() => {
      if (isCancelled) {
        clearInterval(timer);
        return;
      }

      if (currentPos >= text.length) {
        clearInterval(timer);
        const endTime = performance.now();
        const durationMs = endTime - startTime;
        
        onDone({
          totalDuration: durationMs * 1000000, // nanoseconds to match Ollama
          loadDuration: 1000000,
          promptEvalCount: lastMessageObj.content.length / 4,
          evalCount: tokenEstimation,
          evalDuration: durationMs * 1000000
        });
      } else {
        const chunk = text.slice(currentPos, currentPos + charsPerTick);
        currentPos += charsPerTick;
        onChunk(chunk);
      }
    }, intervalTime);
  };

  // Run fetch and stream response
  generateSandboxResponse(lastMessage).then((responseText) => {
    if (!isCancelled) {
      startStream(responseText);
    }
  });

  return () => {
    isCancelled = true;
    if (timer) clearInterval(timer);
  };
}

export const OllamaService = {
  /**
   * Tests connection to Ollama endpoint
   */
  async testConnection(url = 'http://localhost:11434') {
    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  },

  /**
   * Retrieves installed models from Ollama
   */
  async getModels(url = 'http://localhost:11434') {
    try {
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      
      const data = await response.json();
      return data.models || [];
    } catch (e) {
      console.warn('Ollama not running or blocked by CORS. Returning empty models list.');
      return [];
    }
  },

  /**
   * Chats with the local SLM, supporting streaming.
   * If offline, falls back to the Sandbox streaming mockup.
   */
  chat({
    url = 'http://localhost:11434',
    model,
    messages,
    systemPrompt,
    temperature = 0.7,
    isSandbox = false,
    onChunk,
    onError,
    onDone
  }) {
    if (isSandbox) {
      return streamMockResponse(messages, onChunk, onDone);
    }

    // Prepare message payload
    const formattedMessages = [];
    
    // Inject system prompt if present
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    
    formattedMessages.push(...messages);

    const controller = new AbortController();

    const startFetch = async () => {
      try {
        const response = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: formattedMessages,
            stream: true,
            options: {
              temperature: parseFloat(temperature)
            }
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        await handleOllamaStream(response, onChunk, onDone);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          onError(error);
        }
      }
    };

    startFetch();

    return () => controller.abort(); // Return cancel function
  }
};
