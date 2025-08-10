import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // if you’re using Tailwind or styles

// ensure container exists
const id = 'mentor-panel-root';
let container = document.getElementById(id);
if (!container) {
  container = document.createElement('div');
  container.id = id;
  Object.assign(container.style, {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: '999999',
    width: '420px',
    maxHeight: '90vh',
  });
  document.body.appendChild(container);
}

createRoot(container).render(<App />);
