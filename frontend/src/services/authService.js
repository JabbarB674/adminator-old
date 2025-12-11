const TOKEN_KEY = "jwt";
const USER_KEY = "user";
const ACCOUNT_KEY = "account";

export const authService = {
  decodeJwt(token) {
    try {
      const payloadPart = token.split(".")[1];
      const decoded = atob(payloadPart);
      return JSON.parse(decoded);
    } catch (err) {
      console.error("Failed to decode JWT:", err);
      return null;
    }
  },

  isTokenExpired(token) {
    const payload = this.decodeJwt(token);
    if (!payload || !payload.exp) return true;

    const nowSeconds = Date.now() / 1000;
    return payload.exp < nowSeconds;
  },

  isAuthenticated() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    if (this.isTokenExpired(token)) {
      this.logout();
      return false;
    }
    return true;
  },

  saveAuth(data) {
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }

    if (data.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    if (data.account) {
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(data.account));
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCOUNT_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getAccount() {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async refreshProfile() {
    const token = this.getToken();
    if (!token) return null;

    try {
        const { apiUrl } = require('../utils/api');
        const res = await fetch(apiUrl('/refresh-profile'), {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            this.saveAuth(data);
            return data;
        }
    } catch (err) {
        console.error('Failed to refresh profile:', err);
    }
    return null;
  }
};
