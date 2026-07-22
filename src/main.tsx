import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { crazyGamesService } from './services/crazyGamesService';

// Inicializar SDK da CrazyGames
crazyGamesService.init().catch(err => console.error("Falha ao inicializar SDK CrazyGames:", err));

// Safe global monkeypatch for requestPointerLock to handle security/DOM restrictions gracefully
if (typeof Element !== 'undefined' && Element.prototype.requestPointerLock) {
  const originalRequestPointerLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function (options?: any): Promise<void> {
    if (!this.isConnected) {
      console.warn("requestPointerLock: Element is not connected to DOM. Bypassing.");
      return Promise.resolve();
    }
    try {
      const result = originalRequestPointerLock.call(this, options);
      if (result && typeof (result as any).catch === 'function') {
        return (result as any).catch((err: any) => {
          console.warn("Caught pointer lock promise rejection:", err);
        });
      }
      return Promise.resolve();
    } catch (err: any) {
      console.warn("Caught synchronous requestPointerLock error:", err);
      return Promise.resolve();
    }
  };
}

const renderApp = () => {
  createRoot(document.getElementById('root')!).render(
    <App />
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

