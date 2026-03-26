import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get('reason');
    if (reason === 'blocked') {
      setError('Akkountingiz bloklangan. Admin bilan bog‘laning.');
      window.history.replaceState({}, '', '/login');
      return;
    }
    if (reason === 'expired') {
      setError('Sessiya tugagan. Iltimos, qayta kiring.');
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const toastId = toast.loading('Kirilmoqda...');
    try {
      const res = await api.post('/auth/login', { email, password });
      toast.success('Muvaffaqiyatli!', { id: toastId });
      setAuth(res.data.user, res.data.token);
      navigate('/books');
    } catch {
      toast.error('Email yoki parol noto\'g\'ri', { id: toastId });
      setError('Email yoki parol noto\'g\'ri');
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight mb-2">Kirish</h1>
          <p className="text-sm text-surface-900/60 mb-6">
            Akkountingizga kiring va kitoblarni ijaraga oling.
          </p>
          {error && (
            <p className="text-red-600 text-sm mb-4 bg-red-50 px-4 py-2 rounded-xl">
              {error}
            </p>
          )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <input
            type="password"
            placeholder="Parol"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <button
            type="submit"
            className="btn-primary w-full"
          >
            Kirish
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Akkount yo'qmi?{' '}
          <Link to="/register" className="text-primary-700 font-semibold hover:underline">
            Ro'yxatdan o'ting
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}