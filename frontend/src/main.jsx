import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initBackground } from './utils/background'

const Root = () => {
  useEffect(() => {
    const cleanup = initBackground();
    
    // Splash screen handling
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
          splash.style.display = 'none';
        }, 800);
      }, 2000);
    }

    return () => cleanup && cleanup();
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
