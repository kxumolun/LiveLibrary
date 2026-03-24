import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim()) {
      setError("Telefon raqami majburiy");
      return;
    }
    setLoading(true);
    setError('');
    const toastId = toast.loading('Ro\'yxatdan o\'tilmoqda...');
    try {
      const res = await api.post('/auth/register', form);
      toast.success('Profil yaratildi!', { id: toastId });
      setAuth(res.data.user, res.data.token);
      navigate('/books');
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Ro'yxatdan o'tishda xato";
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="w-full max-w-md px-4 sm:px-0">
        <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">Ro'yxatdan o'tish</h1>
        <p className="text-sm text-surface-900/60 mb-6">
          Bir necha daqiqada profil yarating.
        </p>
        {error && (
          <p className="text-red-600 text-sm mb-4 bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-600 block mb-1">To'liq ism</label>
            <input
              type="text"
              placeholder="Ism Familiya"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Telefon raqami <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="+998 90 123 45 67"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Faqat ijara tomonlari ko'ra oladi
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">
              Shahar <span className="text-gray-400">(ixtiyoriy)</span>
            </label>
            <input
              type="text"
              placeholder="Toshkent"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Parol</label>
            <input
              type="password"
              placeholder="Kamida 6 ta belgi"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Yuklanmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Akkount bormi?{' '}
          <Link to="/login" className="text-primary-700 font-semibold hover:underline">
            Kirish
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}