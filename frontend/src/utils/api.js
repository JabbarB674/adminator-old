export const API_BASE = process.env.REACT_APP_API_URL;

export function apiUrl(endpoint) {
  const clean = endpoint.replace(/^\/+/, "");
  return `${API_BASE}/${clean}`;
}
