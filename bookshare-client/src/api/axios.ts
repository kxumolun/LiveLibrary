import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let handledAuthError = false;
const redirectToLoginWithReason = (reason: 'blocked' | 'expired') => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = `/login?reason=${reason}`;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const msg = error?.response?.data?.message;
    const text = Array.isArray(msg) ? msg.join(', ') : String(msg || '');

    if ((status === 401 || status === 403) && !handledAuthError) {
      if (text.toLowerCase().includes('blok')) {
        handledAuthError = true;
        toast.error('Akkount vaqtinchalik bloklangan');
        setTimeout(() => {
          redirectToLoginWithReason('blocked');
          handledAuthError = false;
        }, 200);
      } else if (status === 401) {
        handledAuthError = true;
        toast.error('Sessiya tugagan. Qayta kiring.');
        setTimeout(() => {
          redirectToLoginWithReason('expired');
          handledAuthError = false;
        }, 200);
      }
    }

    return Promise.reject(error);
  },
);

export default api;