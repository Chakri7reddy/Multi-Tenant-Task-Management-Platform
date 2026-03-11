import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

function getAccessToken() {
  return localStorage.getItem('accessToken');
}
function getRefreshToken() {
  return localStorage.getItem('refreshToken');
}
function setTokens(access, refresh) {
  if (access) localStorage.setItem('accessToken', access);
  if (refresh) localStorage.setItem('refreshToken', refresh);
}
function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) delete config.headers['Content-Type'];
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry && getRefreshToken()) {
      original._retry = true;
      refreshPromise = refreshPromise || api.post('/auth/refresh', { refreshToken: getRefreshToken() });
      try {
        const { data } = await refreshPromise;
        refreshPromise = null;
        setTokens(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshPromise = null;
        clearTokens();
        window.location.href = '/';
        return Promise.reject(e);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { getAccessToken, getRefreshToken, setTokens, clearTokens };
