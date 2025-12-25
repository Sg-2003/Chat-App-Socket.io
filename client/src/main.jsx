import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import {AuthProvider} from "../context/AuthContext.jsx"
import { ChatProvider } from '../context/ChatContext.jsx'

const rootEl = document.getElementById('root');
console.log("Boot: main.jsx - root element exists:", !!rootEl);

if (!rootEl) {
  console.error('Root element #root not found');
  const pre = document.createElement('pre');
  pre.style.color = 'red';
  pre.style.padding = '16px';
  pre.textContent = 'Root element #root not found. Check that index.html contains <div id="root"></div> and Vite is serving the correct index.';
  document.body.appendChild(pre);
} else {
  const root = createRoot(rootEl);

  try {
    root.render(
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  } catch (err) {
    console.error("Render error in main.jsx:", err);
    const pre = document.createElement('pre');
    pre.style.color = 'red';
    pre.style.padding = '16px';
    pre.textContent = 'Render error: ' + (err && err.stack ? err.stack : err);
    document.body.appendChild(pre);
  }
}