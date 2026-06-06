/**
 * api.js — GLPI REST API configuration & helpers
 * Base URL: http://localhost/glpi/apirest.php
 *
 * Les tokens sont lus depuis le fichier .env :
 *   VITE_APP_TOKEN=...
 *   VITE_SESSION_TOKEN=...
 */

const API_BASE = '/api';

// Tokens lus depuis les variables d'environnement (.env)
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;

/**
 * Default headers for every GLPI API request
 */
export const headers = {
  'Content-Type': 'application/json',
  'App-Token': APP_TOKEN,
  'Session-Token': SESSION_TOKEN,
};

/**
 * Generic GET helper
 * @param {string} endpoint - e.g. "Computer?range=0-50"
 * @returns {Promise<any>}
 */
export async function apiGet(endpoint) {
  const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${url} — ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Generic POST helper
 * @param {string} endpoint - e.g. "Ticket"
 * @param {object} body - JSON body
 * @returns {Promise<any>}
 */
export async function apiPost(endpoint, body) {
  const url = `${API_BASE}/${endpoint.replace(/^\//, '')}`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} — ${res.status}: ${text}`);
  }
  return res.json();
}

export default { apiGet, apiPost, headers, API_BASE };
