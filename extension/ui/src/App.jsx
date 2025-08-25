
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';



const BACKEND_URL = 'http://localhost:3000/mentor';


function App() {
  const [intent, setIntent] = useState(''); 
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mockMode, setMockMode] = useState(false);
  const [cachedResponses, setCachedResponses] = useState({});
  const [currentProblem, setCurrentProblem] = useState('');
  const [isFromCache, setIsFromCache] = useState(false);

  // Load cached responses from Chrome storage
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['leetcode_mentor_cache'], (result) => {
        if (result.leetcode_mentor_cache) {
          setCachedResponses(result.leetcode_mentor_cache);
        }
      });
    }
  }, []);

  // Save response to cache
  const saveToCache = (problemKey, intentType, response) => {
    const newCache = {
      ...cachedResponses,
      [problemKey]: {
        ...cachedResponses[problemKey],
        [intentType]: response
      }
    };
    setCachedResponses(newCache);
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ leetcode_mentor_cache: newCache });
    }
  };

  // Get cached response
  const getCachedResponse = (problemKey, intentType) => {
    return cachedResponses[problemKey]?.[intentType];
  };

  // Generate problem key from URL
  const getProblemKey = (url) => {
    const match = url.match(/leetcode\.com\/problems\/([^/?]+)/);
    return match ? match[1] : url;
  };

  // map UI labels to backend intent keys
  const intentMap = {
    Hint: 'hint',
    Explanation: 'explain',
    Solution: 'solution',
  };


  const mockResponses = {
    hint: `Here is a hint for your problem:\n\nTry to use a hash map to store the frequency of each element.\n\n\n` +
      '```cpp\n// Example\nstd::unordered_map<int, int> freq;\nfor (int num : nums) {\n    freq[num]++;\n}\n```',
    explain: `Explanation:\n\nA hash map allows you to count occurrences efficiently.\n\nFor example, in C++:\n\n` +
      '```cpp\nstd::unordered_map<int, int> freq;\nfor (int num : nums) {\n    freq[num]++;\n}\n// Now freq contains the count of each number\n```',
    solution: `Here is a possible solution:\n\n` +
      '```cpp\nclass Solution {\npublic:\n    int majorityElement(vector<int>& nums) {\n        unordered_map<int, int> freq;\n        for (int num : nums) freq[num]++;\n        for (auto& [num, count] : freq) {\n            if (count > nums.size() / 2) return num;\n        }\n        return -1;\n    }\n};\n```',
  };

  const handleClick = async (label, forceRefetch = false) => {
    const mappedIntent = intentMap[label];
    setIntent(mappedIntent);
    setError(null);
    setAnswer('');
    setLoading(true);

    if (mockMode) {
      setTimeout(() => {
        setAnswer(mockResponses[mappedIntent]);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Get current tab URL to identify the problem
      const tabs = await new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (!tabs[0]?.id) {
            reject(new Error('No active tab found'));
            return;
          }
          resolve(tabs);
        });
      });
      
      const currentUrl = tabs[0].url;
      const problemKey = getProblemKey(currentUrl);
      setCurrentProblem(problemKey);

      // Check if we have cached response (skip if force refetch)
      if (!forceRefetch) {
        const cachedResponse = getCachedResponse(problemKey, mappedIntent);
        if (cachedResponse) {
          setAnswer(cachedResponse);
          setIsFromCache(true);
          setLoading(false);
          return;
        }
      }

      setIsFromCache(false);

      // Send message to content script to gather context
      const context = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'GATHER_CONTEXT'}, function(response) {
          if (chrome.runtime.lastError) {
            reject(new Error('Failed to communicate with content script'));
            return;
          }
          if (!response) {
            reject(new Error('No response from content script'));
            return;
          }
          resolve(response);
        });
      });
      
      if (!context) throw new Error('Failed to extract context');
      

      const payload = {
        userCode: context.userCode || '',
        question: context.question || '',
        intent: mappedIntent,
        history: [], // you can persist and load this from localStorage or chrome.storage later
        language: 'C++', // optionally detect from page
      };
      

      const resp = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Backend error: ${t}`);
      }
      
      const data = await resp.json();
      const mentorResponse = (typeof data.mentorText === 'string') ? data.mentorText : "Not a string\n";
      
      // Save to cache
      saveToCache(problemKey, mappedIntent, mentorResponse);
      setAnswer(mentorResponse);
      
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-6 w-full bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="inline-block"><circle cx="12" cy="12" r="12" fill="#6366F1"/><text x="50%" y="55%" textAnchor="middle" fill="white" fontSize="14" fontFamily="Arial" dy=".3em">LC</text></svg>
        LeetCode Mentor
      </h2>
      <div className="flex gap-3 mb-4">
        {['Hint', 'Explanation', 'Solution'].map(label => {
          const isCached = currentProblem && getCachedResponse(currentProblem, intentMap[label]);
          return (
            <div key={label} className="flex-1 flex gap-1">
              <button
                type='button'
                className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-colors duration-200 shadow-sm relative ${
                  intent === intentMap[label] ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
                onClick={() => handleClick(label)}
                disabled={loading}
              >
                {label}
                {isCached && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" title="Cached response available"></span>
                )}
              </button>
              {isCached && (
                <button
                  type='button'
                  className="px-2 py-2 rounded-lg border bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors duration-200 shadow-sm"
                  onClick={() => handleClick(label, true)}
                  disabled={loading}
                  title="Refetch from AI (ignore cache)"
                >
                  🔄
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-gray-600 font-medium">Mock Data:</label>
        <input type="checkbox" checked={mockMode} onChange={e => setMockMode(e.target.checked)} />
        <span className="text-xs text-gray-400">(Toggle to test frontend without backend)</span>
      </div>

      {loading && <div className="text-sm text-indigo-500 mb-2 animate-pulse">Thinking...</div>}

      {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}

      {answer && (
        <div className="bg-white p-3 rounded-lg border text-sm shadow-inner">
          <div className="flex items-center justify-between mb-2">
            <strong className="text-indigo-700">Mentor:</strong>
            <div className="flex gap-2">
              {isFromCache && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  📋 From Cache
                </span>
              )}
              {!isFromCache && !mockMode && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  🤖 Fresh from AI
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto prose prose-sm">
            <ReactMarkdown
              children={answer}
              components={{
                code({node, inline, className, children, ...props}) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match ? match[1] : 'cpp'}
                      PreTag="div"
                      customStyle={{ borderRadius: '0.5rem', fontSize: '0.95em', margin: '0.5em 0' }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props} style={{ background: '#f3f4f6', borderRadius: '0.3em', padding: '0.2em 0.4em' }}>
                      {children}
                    </code>
                  );
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
