import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import CoverImage from "../components/CoverImage";
import { meetupIcon, userLocationIcon } from "../utils/mapIcons";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  city: string | null;
  status: string;
  language: string;
  condition: string;
  coverUrl: string | null;
  meetupLocation: string | null;
  meetupLat: number | null;
  meetupLng: number | null;
  availableFrom: string | null;
  owner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    city: string | null;
  };
}

const conditionLabel: Record<string, string> = {
  NEW: 'Yangi',
  GOOD: 'Yaxshi',
  FAIR: "O'rtacha",
  WORN: 'Eskirgan',
};

const languageLabel: Record<string, string> = {
  uz: "O'zbek",
  ru: 'Rus',
  en: 'Ingliz',
};

export default function BookDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [book, setBook] = useState<Book | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [duration, setDuration] = useState(7);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [requested, setRequested] = useState(false);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    api.get(`/books/${id}`).then((res) => setBook(res.data));
    if (user) {
      api.get('/borrows/my-requests').then((res) => {
        const found = res.data.find((r: any) => r.bookId === id && r.status === 'PENDING');
        if (found) setRequested(true);
      });
    }
  }, [id, user]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 5000, maximumAge: 60000 },
    );
  }, []);

  const handleBorrow = async () => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    try {
      await api.post('/borrows/request', {
        bookId: id,
        durationDays: duration,
        message,
      });
      toast.success("So'rov yuborildi!");
      setRequested(true);
      setShowModal(false);
      setMessage('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Xato yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  if (!book) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Yuklanmoqda...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline text-sm mb-6 flex items-center gap-1"
        >
          ← Orqaga
        </button>

        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="md:flex">
            {/* Cover */}
            <div className="md:w-64 w-full aspect-[3/4] md:aspect-auto md:h-80 flex-shrink-0">
              <CoverImage src={book.coverUrl} alt={book.title} fit="contain" />
            </div>

            {/* Info */}
            <div className="p-6 flex-1">
              <div
                className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80"
                onClick={() => navigate(`/users/${book.owner.id}`)}
              >
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {book.owner.fullName[0]}
                </div>
                <span className="text-sm text-gray-600 hover:underline">{book.owner.fullName}</span>
                {book.owner.city && <span className="text-sm text-gray-400">• {book.owner.city}</span>}
              </div>

              <h1 className="text-2xl font-bold mb-1">{book.title}</h1>
              <p className="text-gray-600 mb-4">{book.author}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Holati</p>
                  <p className="text-sm font-medium">{conditionLabel[book.condition] || book.condition}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Tili</p>
                  <p className="text-sm font-medium">{languageLabel[book.language] || book.language}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Shahar</p>
                  <p className="text-sm font-medium">{book.city || '—'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className={`text-sm font-medium ${book.status === 'AVAILABLE' ? 'text-green-600' : 'text-red-500'}`}>
                    {book.status === 'AVAILABLE' ? 'Mavjud' : 'Ijarada'}
                  </p>
                </div>
              </div>

              {book.meetupLocation && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500">Uchrashuv joyi</p>
                  <p className="text-sm font-medium text-blue-700">📍 {book.meetupLocation}</p>
                </div>
              )}

              {book.status === 'AVAILABLE' && book.owner.id !== user?.id && (
                <button
                  onClick={() => {
                    if (!user) { navigate('/login'); return; }
                    if (requested) return;
                    setShowModal(true);
                  }}
                  className={`w-full py-3 rounded-xl font-medium ${
                    requested
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {requested ? "So'rov yuborildi" : 'Ijaraga olish'}
                </button>
              )}

              {book.status !== 'AVAILABLE' && book.availableFrom && (
                <p className="text-sm text-gray-500 mt-2">
                  Bo'shash sanasi: {new Date(book.availableFrom).toLocaleDateString('uz-UZ')}
                </p>
              )}
            </div>
          </div>

          {/* Meetup xarita */}
          {book.meetupLat && book.meetupLng && (
            <div className="p-6 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">📍 Uchrashuv joyi xaritada</p>
              <div className="rounded-xl overflow-hidden border" style={{ height: '220px' }}>
                <MapContainer
                  center={[book.meetupLat, book.meetupLng]}
                  zoom={15}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {userPosition && (
                    <Marker position={userPosition} icon={userLocationIcon}>
                      <Popup>Siz shu yerdasiz</Popup>
                    </Marker>
                  )}
                  <Marker position={[book.meetupLat, book.meetupLng]} icon={meetupIcon} />
                </MapContainer>
              </div>
            </div>
          )}

          {/* Description */}
          {book.description && (
            <div className="p-6 border-t">
              <h2 className="font-bold mb-2">Tavsif</h2>
              <p className="text-gray-600 leading-relaxed">{book.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Borrow modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">"{book.title}" kitobini ijaraga olish</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">Necha kun? (1-90)</label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full border rounded-lg px-4 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Xabar (ixtiyoriy)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2 mt-1"
                  rows={3}
                  placeholder="Kitob egasiga xabar..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 border py-2 rounded-lg hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleBorrow}
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Yuborilmoqda...' : "So'rov yuborish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}