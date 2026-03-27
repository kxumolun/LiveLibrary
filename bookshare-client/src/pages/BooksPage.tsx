import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";
import CoverImage from "../components/CoverImage";

interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  city: string | null;
  status: string;
  language: string;
  coverUrl: string | null;
  meetupLat: number | null;
  meetupLng: number | null;
  owner: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

// Skeleton komponenti
function BookCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse flex flex-col">
      <div className="w-full aspect-[16/10] sm:aspect-[16/11] md:aspect-[16/10] lg:aspect-[16/9] bg-gray-200" />
      <div className="p-4 flex flex-col flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
        <div className="flex justify-between mt-3">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-6 bg-gray-200 rounded-full w-16" />
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-full mt-auto" />
      </div>
    </div>
  );
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [duration, setDuration] = useState(7);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true); // ← alohida skeleton loading
  const user = useAuthStore((s) => s.user);
  const [requestedBooks, setRequestedBooks] = useState<string[]>([]);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => {}, // rad etilsa ham davom etadi
      { timeout: 5000, maximumAge: 60000 }, // ← 5 sekunddan keyin voz kechadi
    );
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const fetchData = async () => {
      const key = `books:list:${debouncedSearch}`;
      const cachedRaw = sessionStorage.getItem(key);
      let usedCache = false;
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as { at: number; data: Book[] };
          if (Date.now() - cached.at < 60_000) {
            setBooks(cached.data);
            setBooksLoading(false);
            usedCache = true;
          }
      } catch (e) {
        if (import.meta.env.DEV) console.debug("books cache parse failed", e);
      }
      }
      if (!usedCache) setBooksLoading(true);
      try {
        const [booksRes, requestsRes] = await Promise.all([
          api.get(`/books${debouncedSearch ? `?search=${debouncedSearch}` : ""}`),
          user ? api.get("/borrows/my-requests") : Promise.resolve({ data: [] }),
        ]);
        setBooks(booksRes.data);
        sessionStorage.setItem(
          key,
          JSON.stringify({ at: Date.now(), data: booksRes.data }),
        );
        setRequestedBooks([]);
        if (user) {
          type PendingRequest = { status: string; bookId: string };
          const pending = requestsRes.data as PendingRequest[];
          const ids = pending
            .filter((r) => r.status === "PENDING")
            .map((r) => r.bookId);
          setRequestedBooks(ids);
        }
      } finally {
        setBooksLoading(false); // ← skeleton tugaydi
      }
    };
    fetchData();
  }, [user, debouncedSearch]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedBook(null);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  const filteredBooks = books.filter((book) => book.owner.id !== user?.id);

  const handleBorrow = async () => {
    if (!selectedBook) return;
    setLoading(true);
    try {
      await api.post("/borrows/request", {
        bookId: selectedBook.id,
        durationDays: duration,
        message,
      });
      setRequestedBooks((prev) => [...prev, selectedBook.id]);
      setSelectedBook(null);
      setMessage("");
      toast.success("So'rov yuborildi!");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (msg === "Siz allaqachon so'rov yuborgansiz") {
        setRequestedBooks((prev) => [...prev, selectedBook!.id]);
        setSelectedBook(null);
        setMessage("");
        toast("So'rov allaqachon yuborilgan!", { icon: "ℹ️" });
      } else {
        toast.error("Xato yuz berdi");
        setSelectedBook(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-8">
      <div className="container-app">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Kitoblar
          </h1>
          <p className="text-sm text-surface-900/60 mt-1">
            Qidiring, toping va ijaraga oling.
          </p>
        </div>

        <div className="relative mb-6">
        <input
          type="text"
          placeholder="Kitob nomi yoki muallif bo'yicha qidiring..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-11"
        />
        <span className="absolute left-4 top-3.5 text-gray-400">🔍</span>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* SKELETON */}
        {booksLoading ? (
          Array.from({ length: 6 }).map((_, i) => <BookCardSkeleton key={i} />)
        ) : filteredBooks.length === 0 ? (
          <p className="text-gray-500 col-span-full">Kitoblar topilmadi</p>
        ) : (
          filteredBooks.map((book) => (
            <div
              key={book.id}
              className="card overflow-hidden cursor-pointer hover:shadow-md transition flex flex-col"
              onClick={() => navigate(`/books/${book.id}`)}
            >
              <div className="w-full aspect-[16/10] sm:aspect-[16/11] md:aspect-[16/10] lg:aspect-[16/9] relative">
                <CoverImage src={book.coverUrl} alt={book.title} fit="cover" />
                <div
                  className="absolute top-3 left-3 flex items-center bg-black bg-opacity-40 rounded-full cursor-pointer hover:bg-opacity-60 transition-all duration-300 overflow-hidden group px-1 py-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/users/${book.owner.id}`);
                  }}
                >
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                    {book.owner.fullName[0]}
                  </div>
                  <span className="text-white text-xs max-w-0 group-hover:max-w-xs overflow-hidden transition-all duration-500 whitespace-nowrap group-hover:ml-1.5 group-hover:pr-1">
                    {book.owner.fullName}
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col flex-1">
                <h2 className="text-lg font-bold">{book.title}</h2>
                <p className="text-gray-600 text-sm">{book.author}</p>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {book.description}
                </p>
                <div className="flex justify-between items-center mt-3">
                  <span className="text-sm text-gray-500">
                    {book.city}
                    {userLocation && book.meetupLat && book.meetupLng && (
                      <span className="ml-2 text-blue-500">
                        📍{" "}
                        {distanceKm(
                          userLocation.lat,
                          userLocation.lng,
                          book.meetupLat,
                          book.meetupLng,
                        )}{" "}
                        km
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${
                      book.status === "AVAILABLE"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {book.status === "AVAILABLE" ? "Mavjud" : "Ijarada"}
                  </span>
                </div>

                <div className="mt-auto pt-3">
                  {book.status === "AVAILABLE" &&
                    book.owner.id !== user?.id &&
                    user && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (requestedBooks.includes(book.id)) return;
                          setSelectedBook(book);
                        }}
                        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                          requestedBooks.includes(book.id)
                            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                            : "bg-primary-600 text-white hover:bg-primary-700"
                        }`}
                      >
                        {requestedBooks.includes(book.id)
                          ? "So'rov yuborildi"
                          : "Ijaraga olish"}
                      </button>
                    )}
                  {!user && book.status === "AVAILABLE" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/login");
                      }}
                      className="w-full py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 text-sm font-semibold transition"
                    >
                      Ijaraga olish
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedBook && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md p-5 sm:p-7 max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              "{selectedBook.title}" kitobini ijaraga olish
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600">
                  Necha kun? (1-90)
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">
                  Xabar (ixtiyoriy)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="input mt-1"
                  rows={3}
                  placeholder="Kitob egasiga xabar..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedBook(null)}
                  className="flex-1 btn-ghost border border-surface-200"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleBorrow}
                  disabled={loading}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {loading ? "Yuborilmoqda..." : "So'rov yuborish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
