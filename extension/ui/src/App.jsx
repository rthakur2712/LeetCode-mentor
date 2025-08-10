import { useState } from 'react';
import ReactMarkdown from 'react-markdown';



const BACKEND_URL = 'http://localhost:3000/mentor'; // adjust to your deployed backend

function App() {
  const [intent, setIntent] = useState(''); // 'hint' | 'explain' | 'solution'
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // map UI labels to backend intent keys
  const intentMap = {
    Hint: 'hint',
    Explanation: 'explain',
    Solution: 'solution',
  };

  const handleClick = async (label) => {
    const mappedIntent = intentMap[label];
    setIntent(mappedIntent);
    setError(null);
    setAnswer('');
    setLoading(true);
    
    try {
      // Send message to content script to gather context
      const context = await new Promise((resolve, reject) => {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (!tabs[0]?.id) {
            reject(new Error('No active tab found'));
            return;
          }
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
      if( typeof data.mentorText === 'string' ){
        setAnswer(data.mentorText);
      }
      else{
        setAnswer("Not a string\n");
      }
      // setAnswer(data.mentorText || 'No answer returned');
    } catch (e) {
      console.error(e);
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 w-full bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-2">LeetCode Mentor</h2>
      <div className="flex gap-2 mb-3">
        <button
          type='button'
          className={`flex-1 px-3 py-2 rounded border ${
            intent === 'hint' ? 'bg-indigo-600 text-white' : 'bg-black-200'
          }`}
          onClick={() => handleClick('Hint')}
          disabled={loading}
        >
          Hint
        </button>
        <button
          type='button'
          className={`flex-1 px-3 py-2 rounded border ${
            intent === 'explain' ? 'bg-indigo-600 text-white' : 'bg-black-200'
          }`}
          onClick={() => handleClick('Explanation')}
          disabled={loading}
        >
          Explanation
        </button>
        <button
          type='button'
          className={`flex-1 px-3 py-2 rounded border ${
            intent === 'solution' ? 'bg-indigo-600 text-white' : 'bg-black-200'
          }`}
          onClick={() => handleClick('Solution')}
          disabled={loading}
        >
          Solution
        </button>
      </div>

      {loading && <div className="text-sm text-black-500 mb-2">Thinking...</div>}

      {error && <div className="text-sm text-red-600 mb-2">Error: {error}</div>}

      {answer && (
        <div className="bg-gray-50 p-2 rounded border text-sm">
          <strong>Mentor:</strong>
          <div className="mt-2 max-h-64 overflow-y-auto prose prose-sm">
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
