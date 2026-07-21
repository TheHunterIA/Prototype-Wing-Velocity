import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { crazyGamesService } from './services/crazyGamesService';

// Inicializar SDK da CrazyGames
crazyGamesService.init().catch(err => console.error("Falha ao inicializar SDK CrazyGames:", err));

// Safe global monkeypatch for requestPointerLock to handle "Target Element removed from DOM" errors gracefully
if (typeof Element !== 'undefined' && Element.prototype.requestPointerLock) {
  const originalRequestPointerLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (options?: any) {
    if (!this.isConnected) {
      console.warn("requestPointerLock: Element is not connected to DOM. Bypassing.");
      return Promise.resolve();
    }
    try {
      const result = originalRequestPointerLock.call(this, options);
      if (result instanceof Promise) {
        return result.catch((err: any) => {
          const errMsg = err?.message || '';
          if (errMsg.includes("removed from DOM") || errMsg.includes("pointer lock") || err?.name === "DOMException") {
            console.warn("Caught pointer lock promise rejection (element removed or request denied):", err);
            return;
          }
          throw err;
        });
      }
      return result;
    } catch (err: any) {
      const errMsg = err?.message || '';
      if (errMsg.includes("removed from DOM") || errMsg.includes("pointer lock")) {
        console.warn("Caught synchronous requestPointerLock error:", err);
        return;
      }
      throw err;
    }
  };
}

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

// Preload critical background image
const img = new Image();
img.src = '/loading_bg.webp';

let rendered = false;
const handleLoad = () => {
  if (!rendered) {
    rendered = true;
    renderApp();
  }
};

img.onload = handleLoad;
img.onerror = handleLoad;

// Safety timeout: render after 2 seconds even if image fails or is slow to respond
setTimeout(handleLoad, 2000);

