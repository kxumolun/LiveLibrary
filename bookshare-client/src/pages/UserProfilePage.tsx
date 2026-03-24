import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api/axios';
import CoverImage from '../components/CoverImage';
import { meetupIcon } from '../utils/mapIcons';

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: string;
  city: string | null;
  condition: string;
  language: string;
  meetupLocation: string | null;
  meetupLat: number | null;
  meetupLng: number | null;
}

interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  createdAt: string;
  ownedBooks: Book[];
  stats: {
    givenCount: number;
    receivedCount: number;
    totalScore: number;
  };
  badge: {
    label: string;
    icon: string;
  };
}

const conditionLabel: Record<string, string> = {
  NEW: 'Yangi',
  GOOD: 'Yaxshi',
  FAIR: "O'rtacha",
  WORN: 'Eskirgan',
};

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="bg-white rounded-xl shadow p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow overflow-hidden flex">
            <div className="w-24 h-32 bg-gray-200 flex-shrink-0" />
            <div className="p-4 flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UserProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    api.get(`/users/${id}`).then((res) => {
      setProfile(res.data);
      setPageLoading(false);
    });
  }, [id]);

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="h-4 bg-gray-200 rounded w-16 mb-6 animate-pulse" />
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Foydalanuvchi topilmadi</p>
    </div>
  );

  const booksWithLocation = profile.ownedBooks.filter((b) => b.meetupLat && b.meetupLng);
  const mapCenter = booksWithLocation.length > 0
    ? [booksWithLocation[0].meetupLat!, booksWithLocation[0].meetupLng!] as [number, number]
    : [41.2995, 69.2401] as [number, number];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline text-sm mb-6 flex items-center gap-1"
        >
          ← Orqaga
        </button>

        {/* Profile card */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                profile.fullName[0]
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profile.fullName}</h1>
                <span className="text-lg" title={profile.badge.label}>{profile.badge.icon}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{profile.badge.label}</span>
              </div>
              {profile.city && <p className="text-gray-500 text-sm mt-1">📍 {profile.city}</p>}
              {profile.bio && <p className="text-gray-600 mt-2">{profile.bio}</p>}
              <p className="text-xs text-gray-400 mt-1">
                A'zo bo'lgan: {new Date(profile.createdAt).toLocaleDateString('uz-UZ')}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{profile.ownedBooks.length}</p>
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
          </div>
        </div>

        {/* Map toggle */}
        {booksWithLocation.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => setShowMap(!showMap)}
              className="bg-white border border-blue-200 text-blue-600 px-4 py-2 rounded-xl hover:bg-blue-50 text-sm font-medium"
            >
              🗺️ {showMap ? 'Xaritani yopish' : "Xaritada ko'rish"}
            </button>
            {showMap && (
              <div className="mt-3 rounded-xl overflow-hidden shadow" style={{ height: '300px' }}>
                <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {booksWithLocation.map((book) => (
                    <Marker key={book.id} position={[book.meetupLat!, book.meetupLng!]} icon={meetupIcon}>
                      <Popup>
                        <div className="min-w-40">
                          <p className="font-bold text-sm">{book.title}</p>
                          <p className="text-xs text-gray-500">{book.author}</p>
                          {book.meetupLocation && (
                            <p className="text-xs text-blue-600 mt-1">📍 {book.meetupLocation}</p>
                          )}
                          <button
                            onClick={() => navigate(`/books/${book.id}`)}
                            className="mt-2 w-full bg-blue-600 text-white text-xs py-1 rounded-lg"
                          >
                            Ko'rish
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
          </div>
        )}

        {/* Books */}
        <h2 className="text-xl font-bold mb-4">Kitoblari ({profile.ownedBooks.length})</h2>
        {profile.ownedBooks.length === 0 ? (
          <p className="text-gray-500">Hozircha kitob yo'q</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.ownedBooks.map((book) => (
              <div
                key={book.id}
                className="bg-white rounded-xl shadow overflow-hidden cursor-pointer hover:shadow-md transition"
                onClick={() => navigate(`/books/${book.id}`)}
              >
                <div className="flex">
                  <div className="w-24 h-32 bg-gray-200 flex-shrink-0">
                    <CoverImage src={book.coverUrl} alt={book.title} fit="cover" />
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-bold">{book.title}</h3>
                    <p className="text-sm text-gray-600">{book.author}</p>
                    <p className="text-xs text-gray-500 mt-1">{conditionLabel[book.condition]}</p>
                    {book.meetupLocation && (
                      <p className="text-xs text-blue-600 mt-1">📍 {book.meetupLocation}</p>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-2 inline-block ${
                      book.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {book.status === 'AVAILABLE' ? 'Mavjud' : 'Ijarada'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}