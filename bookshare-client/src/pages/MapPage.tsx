import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import CoverImage from "../components/CoverImage";
import { ownerIcon, userLocationIcon } from "../utils/mapIcons";


interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  status: string;
}

interface BookOwner {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  books: Book[];
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng]);
  return null;
}

function FixLeafletSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => {
      map.invalidateSize();
    }, 50);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

export default function MapPage() {
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [radius, setRadius] = useState(500);
  const [owners, setOwners] = useState<BookOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<BookOwner | null>(null);
  const [borrowBook, setBorrowBook] = useState<Book | null>(null);
  const [duration, setDuration] = useState(7);
  const [message, setMessage] = useState("");
  const [borrowLoading, setBorrowLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [requestedBooks, setRequestedBooks] = useState<string[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);
  const radiusOptions = [100, 300, 500, 1000, 2000, 5000];
  const [radiusSheetVisible, setRadiusSheetVisible] = useState(false);
  const [radiusSheetOpen, setRadiusSheetOpen] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        if (user) {
          await api.patch("/auth/profile", { latitude, longitude });
        }
        fetchOwners(latitude, longitude, radius);
        if (user) {
          api.get("/borrows/my-requests").then((res) => {
            const ids = res.data
              .filter((r: any) => r.status === "PENDING")
              .map((r: any) => r.bookId);
            setRequestedBooks(ids);
          });
        }
        setLoading(false);
      },
      () => {
        setLocationDenied(true);
        setPosition([41.2995, 69.2401]);
        fetchOwners(41.2995, 69.2401, radius);
        setLoading(false);
      },
      { timeout: 5000, enableHighAccuracy: false },
    );
  }, []);

  const fetchOwners = async (lat: number, lng: number, rad: number) => {
    const userId = user?.id ? `&userId=${user.id}` : "";
    const res = await api.get(`/users/map?lat=${lat}&lng=${lng}&radius=${rad}${userId}`);
    setOwners(res.data);
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    if (position) fetchOwners(position[0], position[1], newRadius);
  };

  const openRadiusSheet = () => {
    setRadiusSheetVisible(true);
    requestAnimationFrame(() => setRadiusSheetOpen(true));
  };
  const closeRadiusSheet = () => {
    setRadiusSheetOpen(false);
    window.setTimeout(() => setRadiusSheetVisible(false), 180);
  };

  const handleBorrow = async () => {
    if (!borrowBook) return;
    if (!user) { navigate("/login"); return; }
    setBorrowLoading(true);
    try {
      await api.post("/borrows/request", {
        bookId: borrowBook.id,
        durationDays: duration,
        message,
      });
      toast.success("So'rov yuborildi!");
      setRequestedBooks((prev) => [...prev, borrowBook.id]);
      setBorrowBook(null);
      setMessage("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xato yuz berdi");
    } finally {
      setBorrowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Joylashuv aniqlanmoqda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-app py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Atrofimdagi kitoblar
          </h1>

          <div className="flex items-center gap-3">
            <label className="text-sm text-surface-900/60 whitespace-nowrap">
              Radius
            </label>

            {/* Mobile: bottom-sheet */}
            <button
              type="button"
              onClick={openRadiusSheet}
              className="md:hidden btn-ghost border border-surface-200 bg-white"
              aria-label="Radius tanlash"
            >
              {radius >= 1000 ? `${radius / 1000} km` : `${radius} m`}
              <span className="text-surface-900/50">▾</span>
            </button>

            {/* Desktop: buttons */}
            <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
              {radiusOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => handleRadiusChange(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition ${
                    radius === r
                      ? "bg-primary-600 text-white"
                      : "bg-white border border-surface-200 text-surface-900/70 hover:bg-surface-100"
                  }`}
                >
                  {r >= 1000 ? `${r / 1000}km` : `${r}m`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {radiusSheetVisible && (
          <div className="md:hidden fixed inset-0 z-50">
            <button
              type="button"
              aria-label="Yopish"
              onClick={closeRadiusSheet}
              className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${
                radiusSheetOpen ? "opacity-100" : "opacity-0"
              }`}
            />
            <div
              className={`absolute inset-x-0 bottom-0 rounded-t-3xl bg-white shadow-soft ring-1 ring-surface-200/70 transition-transform duration-200 ${
                radiusSheetOpen ? "translate-y-0" : "translate-y-full"
              }`}
            >
              <div className="container-app py-4">
                <div className="mx-auto h-1.5 w-12 rounded-full bg-surface-200" />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-base font-extrabold tracking-tight">Radius tanlang</p>
                  <button onClick={closeRadiusSheet} className="btn-ghost">
                    Yopish
                  </button>
                </div>

                <div className="mt-3 grid gap-2 pb-2">
                  {radiusOptions.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        handleRadiusChange(r);
                        closeRadiusSheet();
                      }}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        radius === r
                          ? "bg-primary-600 text-white"
                          : "bg-surface-50 text-surface-900 hover:bg-surface-100"
                      }`}
                    >
                      <span>{r >= 1000 ? `${r / 1000} km` : `${r} m`}</span>
                      {radius === r && <span className="text-white/90">✓</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {locationDenied && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex justify-between items-center">
            <span>⚠️ Joylashuvingiz aniqlanmadi — Toshkent markazi ko'rsatilmoqda</span>
            <button
              onClick={() => {
                setLocationDenied(false);
                setLoading(true);
                navigator.geolocation.getCurrentPosition(
                  async (pos) => {
                    const { latitude, longitude } = pos.coords;
                    setPosition([latitude, longitude]);
                    if (user) await api.patch("/auth/profile", { latitude, longitude });
                    fetchOwners(latitude, longitude, radius);
                    setLoading(false);
                  },
                  () => {
                    setLocationDenied(true);
                    setLoading(false);
                  },
                  { timeout: 5000, enableHighAccuracy: false },
                );
              }}
              className="bg-yellow-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-yellow-600"
            >
              Qayta urinish
            </button>
          </div>
        )}

        <div className="w-full rounded-xl overflow-hidden shadow" style={{ height: "60vh" }}>
          {position && (
            <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
              <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <FixLeafletSize />
              <RecenterMap lat={position[0]} lng={position[1]} />
              <Circle
                center={position}
                radius={radius}
                pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.1 }}
              />
              <Marker position={position} icon={userLocationIcon}>
                <Popup>Siz shu yerdasiz</Popup>
              </Marker>
              {owners.map((owner) => (
                <Marker key={owner.id} position={[owner.latitude, owner.longitude]} icon={ownerIcon}>
                  <Popup>
                    <div className="min-w-48">
                      <div
                        className="flex items-center gap-2 mb-2 cursor-pointer hover:opacity-80"
                        onClick={() => window.location.href = `/users/${owner.id}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                          {owner.fullName[0]}
                        </div>
                        <span className="font-bold hover:underline">{owner.fullName}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">{owner.books.length} ta kitob</p>
                      <div className="space-y-1">
                        {owner.books.slice(0, 3).map((book) => (
                          <div key={book.id} className="flex items-center gap-2">
                            <span
                              className="text-xs hover:underline cursor-pointer"
                              onClick={() => window.location.href = `/books/${book.id}`}
                            >
                              {book.title}
                            </span>
                            <span className={`text-xs px-1 rounded ${
                              book.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}>
                              {book.status === "AVAILABLE" ? "Mavjud" : "Ijarada"}
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => setSelectedOwner(owner)}
                        className="mt-3 w-full bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700"
                      >
                        Kitoblarni ko'rish
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">{owners.length} ta foydalanuvchi topildi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {owners.map((owner) => (
              <div
                key={owner.id}
                className="bg-white rounded-xl shadow p-4 hover:shadow-md transition"
              >
                <div
                  className="flex items-center gap-3 mb-3 cursor-pointer"
                  onClick={() => navigate(`/users/${owner.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {owner.fullName[0]}
                  </div>
                  <div>
                    <p className="font-bold hover:underline">{owner.fullName}</p>
                    <p className="text-xs text-gray-500">{owner.city}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {owner.books.map((book) => (
                    <div
                      key={book.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 rounded-lg p-1"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
                      <div className="w-8 h-10 rounded overflow-hidden">
                        <CoverImage src={book.coverUrl} alt={book.title} fit="cover" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{book.title}</p>
                        <p className="text-xs text-gray-500">{book.author}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        book.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {book.status === "AVAILABLE" ? "Mavjud" : "Ijarada"}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedOwner(owner)}
                  className="mt-3 w-full border border-blue-200 text-blue-600 text-sm py-1.5 rounded-lg hover:bg-blue-50"
                >
                  Kitoblarni ko'rish
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Owner kitoblari modal */}
      {selectedOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80"
                  onClick={() => navigate(`/users/${selectedOwner.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {selectedOwner.fullName[0]}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg hover:underline">{selectedOwner.fullName}</h2>
                    <p className="text-sm text-gray-500">{selectedOwner.city}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOwner(null)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
              </div>
              <div className="space-y-3">
                {selectedOwner.books.map((book) => (
                  <div key={book.id} className="flex items-center gap-3 p-3 border rounded-xl">
                    <div
                      className="cursor-pointer"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
                      <div className="w-12 h-16 rounded overflow-hidden">
                        <CoverImage src={book.coverUrl} alt={book.title} fit="cover" />
                      </div>
                    </div>
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
                      <p className="font-bold hover:underline">{book.title}</p>
                      <p className="text-sm text-gray-500">{book.author}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        book.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {book.status === "AVAILABLE" ? "Mavjud" : "Ijarada"}
                      </span>
                    </div>
                    {book.status === "AVAILABLE" && (
                      <button
                        onClick={() => {
                          if (!user) { navigate("/login"); return; }
                          if (requestedBooks.includes(book.id)) return;
                          setBorrowBook(book);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-sm ${
                          requestedBooks.includes(book.id)
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                      >
                        {requestedBooks.includes(book.id) ? "So'rov yuborildi" : "Ijaraga olish"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Borrow modal */}
      {borrowBook && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">"{borrowBook.title}" kitobini ijaraga olish</h2>
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
                <button onClick={() => setBorrowBook(null)} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">
                  Bekor qilish
                </button>
                <button
                  onClick={handleBorrow}
                  disabled={borrowLoading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {borrowLoading ? "Yuborilmoqda..." : "So'rov yuborish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
