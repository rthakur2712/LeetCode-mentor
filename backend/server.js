import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";


dotenv.config();

const app = express();
app.use(express.json());

// CORS: tighten in prod
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin denied'));
      }
    },
  })
);

// Basic rate limiter: per IP
const limiter = rateLimit({
  windowMs: 10 * 1000, // 10 sec
  max: 10, // max 10 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down.' },
});
app.use('/mentor', limiter);

// Simple in-memory cache for identical prompts (TTL 60s)
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Utility to sanitize/shorten history (rolling window)
function summarizeHistory(historyArray = []) {
  // naive: keep last 3 turns
  if (!Array.isArray(historyArray)) return '';
  const last = historyArray.slice(-3);
  return last.map((turn, i) => `Turn ${i + 1}: ${turn}`).join('\n');
}

// Prompt builder
function buildPrompt({ userCode, question, intent, history, language }) {
  const hist = summarizeHistory(history);
  if (intent === 'complete_code_for_vscode') {
    return `
You are a coding assistant. The user wants a complete, ready-to-run C++ solution for a LeetCode problem, including:
1. The class Solution
2. A main() function
3. Proper input/output handling using cin/cout
4. Any necessary includes and using namespace std

Problem description:
${question}

User's code (may be partial):
\`\`\`
${userCode}
\`\`\`

Generate the full C++ code, ready to copy-paste and run. Do NOT include explanations, only the code. Make sure main() reads input and prints output as expected for LeetCode problems.
`;
  } else if (intent === 'hint') {
    return `
You are a patient and effective coding mentor. The user is solving a LeetCode problem. 
Problem description:
${question}

User's code (${language || 'unknown language'}):
\`\`\`
${userCode}
\`\`\`

The user is stuck and wants a small hint to help debug or proceed. Do NOT give the full solution unless they explicitly ask for "solution". 
Your response should:
1. Briefly summarize what the code seems to be trying to do.
2. Give one specific, minimal actionable hint to move forward (e.g., what to check, a subtle edge case, a likely logic bug).
3. If needed, ask a clarifying question to narrow the issue.

Conversation history (for context): 
${hist || '(none)'}
`;
  } else if (intent === 'explain') {
    return `
You are reviewing the user's code for a LeetCode problem.

Problem description:
${question}

User's code (${language || 'unknown language'}):
\`\`\`
${userCode}
\`\`\`

Provide:
1. A concise summary of the time and space complexity and whether it's optimal.
2. Any logical issues or edge cases missed.
3. One suggestion to improve clarity or performance (no full rewrite unless user asks for "refactor").

Conversation history:
${hist || '(none)'}
`;
  } else if (intent === 'complexity') {
    return `
You are a time complexity analyzer. Analyze the following code and provide ONLY the time and space complexity in Big O notation.

User's code (${language || 'unknown language'}):
\`\`\`
${userCode}
\`\`\`

Respond with ONLY the complexity in this exact format:
Time Complexity: O(...)
Space Complexity: O(...)

No other text or explanations should be included.`;
  } else if (intent === 'solution') {
    return `
The user explicitly requested the full solution. Provide a clear, idiomatic implementation in ${language || 'the appropriate language'}.

Problem:
${question}

User's code:
\`\`\`
${userCode}
\`\`\`

Instructions:
1. Explain the core idea in 2–3 sentences.
2. Then give the full working solution with comments, clearly labeled as the full solution.
3. If there are variations or complexity trade-offs, briefly mention them.
`;
  } else {
    // generic fallback
    return `
Assist the user on this LeetCode problem.

Problem:
${question}

User code:
\`\`\`
${userCode}
\`\`\`

Intent was unspecified. Provide a helpful starting hint.
Conversation history:
${hist || '(none)'}
`;
  }
}

// Placeholder for calling Gemini. Replace URL/shape with actual Gemini API spec.
async function callGeminiAPI(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in environment');

  const payload = {
    prompt,
  };

  const ai = new GoogleGenAI({});
  
  
  const resp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    console.log(resp.text);
  

  const data = resp.text;
  // Extract text depending on actual response shape:
  const mentorText = data;
  return mentorText;
}

app.post('/mentor', async (req, res) => {
  try {
    const { userCode = '', question = '', intent = 'hint', history = [], language = '' } = req.body;
    console.log(req.body);

    // Basic validation
    if (!question.trim()) {
      return res.status(400).json({ error: 'Missing problem description/question' });
    }
    if (!userCode.trim()) {
      return res.status(400).json({ error: 'Missing user code' });
    }

    const cacheKey = JSON.stringify({ userCode, question, intent, language, history: history.slice(-3) }); // we stored this as the cache "key"
    const cached = cache.get(cacheKey); // now we are querying if this cache key has some value?, if yes then we don't call gemini and return the previous response itself
    if (cached) {
      return res.json({ mentorText: cached, fromCache: true });
    }
    // else we request gemini
    const prompt = buildPrompt({ userCode, question, intent, history, language });
    console.log("Prompt: ", prompt,"\n");
    const mentorText = await callGeminiAPI(prompt);

    // Cache and return, we set the newest response as the value for that particular key
    cache.set(cacheKey, mentorText);
    res.json({ mentorText, fromCache: false });
  } catch (err) {
    console.error('[/mentor] error:', err);
    res.status(500).json({ error: err.message || 'Internal error' });
  }
});

// Health check
app.get('/health', (_, res) => res.send({ status: 'ok', time: new Date().toISOString() }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Mentor backend listening on http://localhost:${port}`);
});
