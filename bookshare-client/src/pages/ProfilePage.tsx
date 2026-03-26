import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface Profile {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  createdAt: string;
  telegramUsername?: string | null;
  telegramChatId?: string | number | null;
  telegramVerifiedAt?: string | null;
  booksCount?: number;
  ownedBooks?: { id: string }[];
  stats?: {
    givenCount: number;
    receivedCount: number;
    totalScore: number;
  };
  badge?: {
    label: string;
    icon: string;
  };
}

const badgeInfo = [
  { icon: '🥉', label: 'Yangi', min: 0, max: 2, desc: "Platformaga yangi qo'shilgan foydalanuvchi" },
  { icon: '🥈', label: 'Ishonchli', min: 3, max: 9, desc: "3 va undan ko'p muvaffaqiyatli almashuvlar" },
  { icon: '🥇', label: 'Faol', min: 10, max: null, desc: "10 va undan ko'p muvaffaqiyatli almashuvlar" },
];

type ProfileStep = { key: string; label: string; done: boolean };

function getProfileCompleteness(profile: Profile) {
  const steps: ProfileStep[] = [
    { key: 'fullName', label: "To'liq ism kiritilgan", done: !!profile.fullName?.trim() },
    { key: 'avatar', label: 'Profil rasmi qo‘yilgan', done: !!profile.avatarUrl },
    { key: 'phone', label: 'Telefon raqami kiritilgan', done: !!profile.phone?.trim() },
    { key: 'city', label: 'Shahar tanlangan', done: !!profile.city?.trim() },
    { key: 'bio', label: "Qisqa bio yozilgan", done: !!profile.bio?.trim() },
    { key: 'telegram', label: 'Telegram ulangan', done: !!profile.telegramVerifiedAt },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);
  return { steps, doneCount, total: steps.length, percent };
}

function getCompletenessTone(percent: number) {
  if (percent < 50) {
    return {
      ring: 'ring-red-200',
      progress: 'bg-red-500',
      badge: 'bg-red-50 text-red-700 border-red-200',
      hint: "Profil juda bo‘sh. Ishonchni oshirish uchun to‘ldiring.",
    };
  }
  if (percent < 80) {
    return {
      ring: 'ring-amber-200',
      progress: 'bg-amber-500',
      badge: 'bg-amber-50 text-amber-700 border-amber-200',
      hint: 'Yaxshi ketayapti. Yana bir nechta qadam qoldi.',
    };
  }
  return {
    ring: 'ring-green-200',
    progress: 'bg-green-500',
    badge: 'bg-green-50 text-green-700 border-green-200',
    hint: 'Zo‘r! Profilingiz deyarli to‘liq.',
  };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, setAuth, token } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', bio: '', city: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [showProfileTips, setShowProfileTips] = useState(false);
  const [tgPendingId, setTgPendingId] = useState<string | null>(null);
  const [tgBotLink, setTgBotLink] = useState<string | null>(null);
  const [tgCode, setTgCode] = useState('');
  const [tgBusy, setTgBusy] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    Promise.all([
      api.get('/auth/me'),
      api.get(`/users/${user.id}/summary`),
    ]).then(([meRes, userRes]) => {
      setProfile({
        ...meRes.data,
        stats: userRes.data.stats,
        badge: userRes.data.badge,
        booksCount: userRes.data.booksCount,
      });
      setForm({
        fullName: meRes.data.fullName || '',
        bio: meRes.data.bio || '',
        city: meRes.data.city || '',
        phone: meRes.data.phone || '',
      });
    });
  }, []);

  const handleAvatarUpload = async (file: File) => {
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile((prev) => prev ? { ...prev, avatarUrl: res.data.avatarUrl } : prev);
      if (token) setAuth({ ...user!, avatarUrl: res.data.avatarUrl }, token);
      toast.success('Rasm yuklandi!');
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', form);
      setProfile((prev) => prev ? { ...prev, ...res.data } : prev);
      if (token) setAuth({ ...user!, ...res.data }, token);
      setEditing(false);
      toast.success('Profil yangilandi!');
    } catch {
      toast.error('Xato yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  const initTelegramLink = async () => {
    setTgBusy(true);
    try {
      const res = await api.post('/auth/telegram/link/init');
      setTgPendingId(res.data.pendingId);
      setTgBotLink(res.data.botLink);
      toast.success('Botga kiring va kodni oling');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Telegram ulashni boshlashda xatolik');
    } finally {
      setTgBusy(false);
    }
  };

  const verifyTelegramLink = async () => {
    if (!tgPendingId) return;
    setTgBusy(true);
    try {
      await api.post('/auth/telegram/link/verify', {
        pendingId: tgPendingId,
        code: tgCode.trim(),
      });
      const meRes = await api.get('/auth/me');
      setProfile((prev) => (prev ? { ...prev, ...meRes.data } : prev));
      setTgPendingId(null);
      setTgBotLink(null);
      setTgCode('');
      toast.success('Telegram muvaffaqiyatli ulandi');
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Kodni tasdiqlashda xatolik';
      if (
        typeof msg === 'string' &&
        (msg.includes('Tasdiqlash topilmadi') || msg.includes('muddati tugadi'))
      ) {
        setTgPendingId(null);
        setTgBotLink(null);
      }
      toast.error(msg);
    } finally {
      setTgBusy(false);
    }
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Yuklanmoqda...</p>
    </div>
  );

  const completeness = getProfileCompleteness(profile);
  const tone = getCompletenessTone(completeness.percent);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mening profilim</h1>

        <div className="bg-white rounded-xl shadow p-6 mb-4">
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-6">
            <div
              className="relative w-20 h-20 rounded-full cursor-pointer group flex-shrink-0"
              onClick={() => document.getElementById('avatar-input')?.click()}
            >
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold">
                  {profile.fullName[0]}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
                <span className="text-white text-xs opacity-0 group-hover:opacity-100">
                  {avatarUploading ? '⏳' : '📷'}
                </span>
              </div>
            </div>
            <input
              id="avatar-input"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAvatarUpload(file); }}
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{profile.fullName}</h2>
                {profile.badge && (
                  <span className="text-lg">{profile.badge.icon}</span>
                )}
                {profile.badge && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                    {profile.badge.label}
                  </span>
                )}
              </div>
              <p className="text-gray-500 text-sm">{profile.email}</p>
              <p className="text-xs text-gray-400 mt-1">
                A'zo bo'lgan: {new Date(profile.createdAt).toLocaleDateString('uz-UZ')}
              </p>
              <p
                className="text-xs text-blue-500 mt-1 cursor-pointer hover:underline"
                onClick={() => document.getElementById('avatar-input')?.click()}
              >
                {avatarUploading ? 'Yuklanmoqda...' : "Rasmni o'zgartirish"}
              </p>
            </div>
          </div>

          {/* Profile completeness */}
          <div className={`mb-6 rounded-xl border p-4 ${tone.badge}`}>
            <button
              type="button"
              onClick={() => setShowProfileTips((v) => !v)}
              className="w-full flex items-start justify-between gap-3 text-left"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide">Profil to‘liqligi</p>
                <p className="text-sm mt-1">{tone.hint}</p>
              </div>
              <div className={`h-14 w-14 rounded-full bg-white grid place-items-center ring-4 ${tone.ring}`}>
                <span className="text-sm font-extrabold">{completeness.percent}%</span>
              </div>
            </button>
            <div className="mt-3 h-2 w-full rounded-full bg-white/80 overflow-hidden">
              <div
                className={`h-full ${tone.progress} transition-all duration-300`}
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <p className="text-xs mt-2">
              {completeness.doneCount}/{completeness.total} qadam bajarilgan
            </p>

            {showProfileTips && (
              <div className="mt-3 rounded-lg bg-white/80 p-3 space-y-2">
                <p className="text-xs font-semibold">100% qilish uchun:</p>
                {completeness.steps.map((s) => (
                  <div key={s.key} className="flex items-center gap-2 text-sm">
                    <span>{s.done ? '✅' : '⬜'}</span>
                    <span className={s.done ? 'text-gray-500 line-through' : 'text-gray-700'}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stats */}
          {profile.stats && (
            <div className="grid grid-cols-4 gap-4 mb-6 pb-6 border-b">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{profile.booksCount ?? 0}</p>
                <p className="text-xs text-gray-500">Kitob</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{profile.stats.givenCount}</p>
                <p className="text-xs text-gray-500">Bergan</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-500">{profile.stats.receivedCount}</p>
                <p className="text-xs text-gray-500">Olgan</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{profile.stats.totalScore}</p>
                <p className="text-xs text-gray-500">Jami</p>
              </div>
            </div>
          )}

          {!editing ? (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">To'liq ism</p>
                <p className="font-medium">{profile.fullName}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Telefon</p>
                <p className="font-medium">{profile.phone || '—'}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Telefon raqamingizni faqat ijarada siz bilan kelishadigan odam ko‘radi.
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Shahar</p>
                <p className="font-medium">{profile.city || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Bio</p>
                <p className="font-medium">{profile.bio || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">Telegram</p>
                <p className="font-medium">
                  {profile.telegramVerifiedAt
                    ? `Ulangan (${profile.telegramUsername ? `@${profile.telegramUsername}` : 'username yo‘q'})`
                    : 'Ulanmagan'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Chat ID: {profile.telegramChatId ?? '—'}
                </p>
                {profile.telegramVerifiedAt ? (
                  <p className="text-xs text-gray-400 mt-1">
                    Tasdiqlangan vaqt: {new Date(profile.telegramVerifiedAt).toLocaleString('uz-UZ')}
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {!tgPendingId ? (
                      <button
                        onClick={initTelegramLink}
                        disabled={tgBusy}
                        className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        {tgBusy ? 'Yuklanmoqda...' : 'Telegramni ulash'}
                      </button>
                    ) : (
                      <>
                        {tgBotLink && (
                          <a
                            href={tgBotLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-block text-sm text-blue-600 hover:underline"
                          >
                            Botga o‘tish
                          </a>
                        )}
                        <div className="flex gap-2">
                          <input
                            value={tgCode}
                            onChange={(e) => setTgCode(e.target.value)}
                            placeholder="6 xonali kod"
                            className="w-full border rounded-lg px-3 py-2 text-sm"
                          />
                          <button
                            onClick={verifyTelegramLink}
                            disabled={tgBusy}
                            className="px-3 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {tgBusy ? 'Tasdiqlanmoqda...' : 'Tasdiqlash'}
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setTgPendingId(null);
                            setTgBotLink(null);
                            setTgCode('');
                          }}
                          className="text-xs text-gray-500 hover:underline"
                        >
                          Qaytadan ulashni boshlash
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700"
              >
                Tahrirlash
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">To'liq ism</label>
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Telefon</label>
                <input
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">Faqat ijara tomonlari ko'ra oladi</p>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Shahar</label>
                <input placeholder="Masalan: Toshkent" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Bio</label>
                <textarea
                  placeholder="O'zingiz haqida qisqacha..."
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  rows={3}
                  maxLength={300}
                />
                <p className={`text-xs mt-1 text-right ${form.bio.length > 250 ? 'text-red-500' : 'text-gray-400'}`}>
                  {form.bio.length}/300
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">Bekor qilish</button>
                <button onClick={handleSave} disabled={saving} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Badge info */}
        <div className="bg-white rounded-xl shadow p-4">
          <button
            onClick={() => setShowBadgeInfo(!showBadgeInfo)}
            className="w-full flex justify-between items-center text-sm font-medium text-gray-700"
          >
            <span>🏅 Badge tizimi haqida</span>
            <span>{showBadgeInfo ? '▲' : '▼'}</span>
          </button>
          {showBadgeInfo && (
            <div className="mt-4 space-y-3">
              {badgeInfo.map((b) => (
                <div key={b.label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-2xl">{b.icon}</span>
                  <div>
                    <p className="font-medium text-sm">
                      {b.label}
                      <span className="text-xs text-gray-400 ml-2">
                        ({b.max ? `${b.min}–${b.max} ta` : `${b.min}+ ta`} almashuvlar)
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">{b.desc}</p>
                  </div>
                  {profile.badge?.label === b.label && (
                    <span className="ml-auto text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Sizniki</span>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">
                * Almashuv soni = muvaffaqiyatli bergan + olgan kitoblar soni
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}