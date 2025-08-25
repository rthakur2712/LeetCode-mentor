
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';



const BACKEND_URL = 'http://localhost:3000/mentor'; // adjust to your deployed backend


function App() {
  const [intent, setIntent] = useState(''); // 'hint' | 'explain' | 'solution'
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mockMode, setMockMode] = useState(false);

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

  const handleClick = async (label) => {
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
      // ...existing code...
      // (backend fetch logic remains unchanged)
      // ...existing code...
    } catch (e) {
      // ...existing code...
    } finally {
      // ...existing code...
    }
  };


  return (
    <div className="p-6 w-full bg-gradient-to-br from-indigo-100 to-white rounded-xl shadow-lg border border-gray-200">
      <h2 className="text-2xl font-bold mb-4 text-indigo-700 flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="inline-block"><circle cx="12" cy="12" r="12" fill="#6366F1"/><text x="50%" y="55%" textAnchor="middle" fill="white" fontSize="14" fontFamily="Arial" dy=".3em">LC</text></svg>
        LeetCode Mentor
      </h2>
      <div className="flex gap-3 mb-4">
        {['Hint', 'Explanation', 'Solution'].map(label => (
          <button
            key={label}
            type='button'
            className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-colors duration-200 shadow-sm ${
              intent === intentMap[label] ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
            }`}
            onClick={() => handleClick(label)}
            disabled={loading}
          >
            {label}
          </button>
        ))}
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
          <strong className="text-indigo-700">Mentor:</strong>
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
