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
    confirmPassword: '',
    phone: '',
    city: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const [step, setStep] = useState<'form' | 'code'>('form');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [botLink, setBotLink] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const normalizePhone = (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('998')) cleaned = `+${cleaned}`;
    if (!cleaned.startsWith('+') && cleaned.length > 0) cleaned = `+${cleaned}`;
    return cleaned;
  };

  const validateForm = () => {
    const errors: Partial<Record<keyof typeof form, string>> = {};
    const fullName = form.fullName.trim().replace(/\s+/g, ' ');
    const email = form.email.trim().toLowerCase();
    const phone = normalizePhone(form.phone.trim());
    const password = form.password;
    const city = form.city.trim();

    if (!fullName || fullName.length < 2 || fullName.length > 60) {
      errors.fullName = "Ism 2-60 belgi oralig'ida bo'lishi kerak";
    } else if (!/^[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёʻ’'`\-\s]+$/.test(fullName)) {
      errors.fullName = "Ismda faqat harflar va bo'shliq bo'lishi mumkin";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Email noto'g'ri formatda";
    }
    if (!/^\+998\d{9}$/.test(phone)) {
      errors.phone = "Telefon formati: +998901234567";
    }
    if (city.length > 80) {
      errors.city = "Shahar nomi 80 belgidan oshmasin";
    }
    if (password.length < 8 || password.length > 72) {
      errors.password = "Parol 8-72 belgi bo'lishi kerak";
    } else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
      errors.password = "Parolda kamida 1 ta harf va 1 ta raqam bo'lishi kerak";
    }
    if (form.confirmPassword !== password) {
      errors.confirmPassword = 'Parollar mos emas';
    }

    setFieldErrors(errors);
    return { ok: Object.keys(errors).length === 0, fullName, email, phone, city };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checked = validateForm();
    if (!checked.ok) {
      setError("Iltimos, formadagi xatolarni to'g'rilang");
      return;
    }
    setLoading(true);
    setError('');
    const toastId = toast.loading('Ro\'yxatdan o\'tilmoqda...');
    try {
      const payload = {
        fullName: checked.fullName,
        email: checked.email,
        password: form.password,
        phone: checked.phone,
        city: checked.city || undefined,
      };
      const res = await api.post('/auth/register/telegram/init', payload);
      toast.success('Telegram tasdiqlashi boshlandi!', { id: toastId });
      setPendingId(res.data.pendingId);
      setBotLink(res.data.botLink);
      setStep('code');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Ro'yxatdan o'tishda xato";
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
          {step === 'form' && (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight mb-2">Ro'yxatdan o'tish</h1>
              <p className="text-sm text-surface-900/60 mb-6">
                Bir necha daqiqada o'z profil yarating. Telegram orqali tasdiqlash orqali tez va xavfsiz ro'yxatdan o'ting.
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
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    className="input"
                    required
                  />
                  {fieldErrors.fullName && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.fullName}</p>
                  )}
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
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">
                    Telefon raqami <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+998 90 123 45 67"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: normalizePhone(e.target.value) })
                    }
                    className="input"
                    required
                  />
                  {fieldErrors.phone && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Telegram botga kirganda telefon raqamingizni yuborasiz.
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
                  {fieldErrors.city && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.city}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Parol</label>
                  <input
                    type="password"
                    placeholder="8+ belgi, harf va raqam"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input"
                    required
                    minLength={8}
                  />
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Parolni tasdiqlash</label>
                  <input
                    type="password"
                    placeholder="Parolni qayta kiriting"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="input"
                    required
                  />
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-600 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {loading ? "Telegramga yuborilmoqda..." : "Ro'yxatdan o'tish"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                Akkount bormi?{' '}
                <Link to="/login" className="text-primary-700 font-semibold hover:underline">
                  Kirish
                </Link>
              </p>
            </>
          )}

          {step === 'code' && (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight mb-2">Telegram tasdiqlashi</h1>
              <p className="text-sm text-surface-900/60 mb-4">
                Botga kiring, telefon raqamingizni yuboring va sizga kelgan kodni kiriting.
              </p>

              <div className="space-y-3">
                <a
                  href={botLink || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary w-full justify-center no-underline"
                >
                  Telegram botni ochish
                </a>

                <div>
                  <label className="text-sm text-gray-600 block mb-1">Tasdiqlash kodi</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Masalan: 123456"
                    value={code}
                    onChange={(e) => {
                      const next = e.target.value.replace(/[^\d]/g, '').slice(0, 6);
                      setCode(next);
                      setCodeError('');
                    }}
                    className="input"
                  />
                  {codeError && <p className="text-xs text-red-600 mt-1">{codeError}</p>}
                </div>

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-xl">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  disabled={loading || !pendingId}
                  onClick={async () => {
                    if (!pendingId) return;
                    if (!/^\d{6}$/.test(code.trim())) {
                      setCodeError("Kod 6 ta raqam bo'lishi kerak");
                      return;
                    }
                    setError('');
                    setLoading(true);
                    const toastId = toast.loading('Kod tekshirilmoqda...');
                    try {
                      const res = await api.post('/auth/register/telegram/verify', {
                        pendingId,
                        code: code.trim(),
                      });
                      toast.success('Tasdiqlandi!', { id: toastId });
                      setAuth(res.data.user, res.data.token);
                      navigate('/books');
                    } catch (err: unknown) {
                      const msg =
                        (err as { response?: { data?: { message?: string } } })?.response?.data
                          ?.message || 'Kod xato yoki muddati tugagan';
                      toast.error(msg, { id: toastId });
                      setError(msg);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  Tasdiqlash
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('form');
                    setCode('');
                    setError('');
                    setPendingId(null);
                    setBotLink(null);
                  }}
                  className="btn-ghost w-full"
                >
                  Ortga
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}