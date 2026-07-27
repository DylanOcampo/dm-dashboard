import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PlayerApp from './player/PlayerApp';

// Sitio estático (GitHub Pages + Capacitor): un path tipo "/play/<token>"
// rompería en un refresh directo, así que el link para jugadores usa un
// query param en la misma URL en vez de una ruta nueva.
const playToken = new URLSearchParams(window.location.search).get('play');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {playToken ? <PlayerApp token={playToken} /> : <App />}
  </React.StrictMode>
);
