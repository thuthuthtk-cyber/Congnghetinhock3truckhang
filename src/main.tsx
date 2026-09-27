// Safe window.fetch guard against getter-only property setter errors in iframe environment
(function () {
  try {
    let nativeFetch = window.fetch ? window.fetch.bind(window) : undefined;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() {
        return nativeFetch;
      },
      set(fn) {
        if (typeof fn === 'function') {
          nativeFetch = fn;
        }
      },
    });
  } catch (e) {
    // Ignore if window.fetch cannot be re-defined
  }
})();

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
