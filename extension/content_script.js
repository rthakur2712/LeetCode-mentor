// === utility to extract question text (all visible text inside .elfjS) ===
function extractFullQuestion(timeout = 8000, interval = 200) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    // deep find container with case-insensitive fallback
    function getContainer() {
      return document.querySelector('.elfjS') || document.querySelector('[class~="elfjS" i]');
    }

    function recurse(node) {
      const pieces = [];

      if (node.nodeType === Node.TEXT_NODE) {
        const t = node.textContent.replace(/\s+/g, ' ').trim();
        if (t) pieces.push(t);
        return pieces;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return pieces;

      const tag = node.tagName.toUpperCase();
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(tag)) return pieces;

      if (tag === 'IMG') {
        const desc = node.alt?.trim() || node.src || '';
        pieces.push(desc ? `[image: ${desc}]` : '[image]');
        return pieces;
      }

      if (tag === 'PRE') {
        const inner = node.innerText.trim();
        if (inner) pieces.push('Example:\n' + inner);
        return pieces;
      }

      if (tag === 'CODE') {
        const inner = node.innerText.trim();
        if (inner) pieces.push('`' + inner + '`');
        return pieces;
      }

      if (['UL', 'OL'].includes(tag)) {
        node.querySelectorAll('li').forEach((li, idx) => {
          const liText = recurse(li).join(' ');
          if (liText) {
            const bullet = tag === 'OL' ? `${idx + 1}. ` : '- ';
            pieces.push(bullet + liText);
          }
        });
        return pieces;
      }

      if (/H[1-6]/.test(tag)) {
        const heading = node.innerText.trim();
        if (heading) pieces.push(heading.toUpperCase());
        return pieces;
      }

      // default: dive into children
      node.childNodes.forEach(child => {
        pieces.push(...recurse(child));
      });
      return pieces;
    }

    function attempt() {
      const container = getContainer();
      if (!container) {
        if (Date.now() - start > timeout) {
          reject(new Error('.elfjS container not found (timed out)'));
          return;
        }
        setTimeout(attempt, interval);
        return;
      }

      const rawPieces = recurse(container);
      const assembled = rawPieces
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n')
        .replace(/\n{2,}/g, '\n\n');

      if (!assembled) {
        // Found container but nothing extracted
        resolve(''); // still resolve with empty string
      } else {
        resolve(assembled);
      }
    }

    attempt();
  });
}

// === utility to extract user code from the editor ===
function extractUserCode(timeout = 5000, interval = 150) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function tryGet() {
      // 1. Try reading Monaco editor (LeetCode uses Monaco)
      // Monaco usually renders lines with .view-line; fallback to that if no API access
      const viewLines = document.querySelectorAll('.view-line');
      if (viewLines.length) {
        const code = [...viewLines].map(el => el.innerText).join('\n');
        return code;
      }

      // 2. Fallback: sometimes CodeMirror-like; try generic <textarea> if exposed
      const ta = document.querySelector('textarea');
      if (ta && ta.value) {
        return ta.value;
      }

      // Could extend to hook into window.monaco editor instances if available:
      // e.g., if window.monaco && window.monaco.editor, you could try to access editors via internal APIs.
      return null;
    }

    function attempt() {
      const code = tryGet();
      if (code !== null) {
        resolve(code);
        return;
      }
      if (Date.now() - start > timeout) {
        reject(new Error('Timed out extracting user code'));
        return;
      }
      setTimeout(attempt, interval);
    }

    attempt();
  });
}

// === combined usage ===
async function gatherLeetCodeContext() {
  try {
    const [userCode, question] = await Promise.all([
      extractUserCode().catch(e => {
        console.warn('code extraction failed:', e.message);
        return '';
      }),
      extractFullQuestion().catch(e => {
        console.warn('question extraction failed:', e.message);
        return '';
      })
    ]);

    const context = {
      userCode,
      question,
      url: location.href,
      timestamp: new Date().toISOString()
    };

    console.log('🧠 Extracted context:', context);
    // Optionally copy question to clipboard for debugging:
    if (question && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(question).catch(() => {});
    }

    return context; // you can then send this to your backend
  } catch (err) {
    console.error('Failed to gather context:', err);
    return null;
  }
}

// Trigger it:
// expose for the injected React UI to call
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GATHER_CONTEXT') {
    gatherLeetCodeContext()
      .then(context => sendResponse(context))
      .catch(error => sendResponse(null));
    return true; // Will respond asynchronously
  }
});

