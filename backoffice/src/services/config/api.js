export const API_BASE = '/api';

export function buildUrl(path) {
  if (!path) return API_BASE;
  return API_BASE.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
}

export default {
  API_BASE,
  buildUrl,
};
