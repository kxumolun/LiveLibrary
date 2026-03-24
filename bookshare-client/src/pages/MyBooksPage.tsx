import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import toast from "react-hot-toast";
import CoverImage from "../components/CoverImage";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
}

function MapPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onPick(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function BookRowSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
      <div className="flex">
        <div className="w-32 h-40 bg-gray-200 flex-shrink-0" />
        <div className="p-4 flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function MyBooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", author: "", description: "", city: "", language: "uz", condition: "GOOD", meetupLocation: "" });
  const [meetupCoords, setMeetupCoords] = useState<[number, number] | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number]>([41.2995, 69.2401]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editForm, setEditForm] = useState({ description: "", condition: "GOOD", meetupLocation: "", city: "" });
  const [editMeetupCoords, setEditMeetupCoords] = useState<[number, number] | null>(null);

  useEffect(() => {
    api.get("/books/my").then((res) => {
      setBooks(res.data);
      setPageLoading(false);
    });
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { timeout: 5000 },
    );
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
          break;
        }
      }
    };
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [showForm]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetupCoords) { toast.error("Uchrashuv joyini xaritadan belgilang!"); return; }
    setFormLoading(true);
    try {
      const res = await api.post("/books", { ...form, meetupLat: meetupCoords[0], meetupLng: meetupCoords[1] });
      let newBook = res.data;
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const coverRes = await api.post(`/books/${newBook.id}/cover`, formData, { headers: { "Content-Type": "multipart/form-data" } });
        newBook = { ...newBook, coverUrl: coverRes.data.coverUrl };
      }
      setBooks((prev) => [newBook, ...prev]);
      setShowForm(false);
      setForm({ title: "", author: "", description: "", city: "", language: "uz", condition: "GOOD", meetupLocation: "" });
      setCoverFile(null);
      setCoverPreview(null);
      setMeetupCoords(null);
      toast.success("Kitob qo'shildi!");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/books/${id}`);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    toast.success("Kitob o'chirildi!");
  };

  const handleEditSave = async (id: string) => {
    try {
      const data: any = { ...editForm };
      if (editMeetupCoords) { data.meetupLat = editMeetupCoords[0]; data.meetupLng = editMeetupCoords[1]; }
      const res = await api.patch(`/books/${id}`, data);
      setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, ...res.data } : b)));
      setEditingBook(null);
      setEditMeetupCoords(null);
      toast.success("Kitob yangilandi!");
    } catch {
      toast.error("Xato yuz berdi");
    }
  };

  const handleCoverUpload = async (bookId: string, file: File) => {
    setUploadingId(bookId);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await api.post(`/books/${bookId}/cover`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, coverUrl: res.data.coverUrl } : b)));
    } finally {
      setUploadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mening kitoblarim</h1>
          <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700">
            + Kitob qo'shish
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="bg-white rounded-xl shadow p-6 mb-8 space-y-4">
            <h2 className="text-xl font-bold">Yangi kitob</h2>
            <div
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 transition overflow-hidden"
              onClick={() => document.getElementById("cover-input")?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="preview" className="h-full object-contain" />
              ) : (
                <div className="text-center text-gray-400">
                  <div className="text-4xl mb-2">📷</div>
                  <p className="text-sm font-medium text-gray-500">Kitob muqovasini yuklang</p>
                  <p className="text-xs text-gray-400 mt-1">Ctrl+V — nusxa qo'ying</p>
                  <p className="text-xs text-gray-400">yoki</p>
                  <p className="text-xs text-blue-500 hover:underline cursor-pointer">Fayldan tanlang</p>
                </div>
              )}
            </div>
            <input id="cover-input" type="file" accept="image/*" className="hidden"
              onChange={(e) => { const file = e.target.files?.[0]; if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); } }}
            />
            <input placeholder="Kitob nomi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-4 py-2" required />
            <input placeholder="Muallif" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} className="w-full border rounded-lg px-4 py-2" required />
            <input placeholder="Shahar" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border rounded-lg px-4 py-2" />
            <div>
              <textarea placeholder="Tavsif" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded-lg px-4 py-2" rows={3} maxLength={1000} />
              <p className={`text-xs mt-1 text-right ${form.description.length > 900 ? "text-red-500" : "text-gray-400"}`}>{form.description.length}/1000</p>
            </div>
            <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full border rounded-lg px-4 py-2">
              <option value="uz">O'zbek</option>
              <option value="ru">Rus</option>
              <option value="en">Ingliz</option>
            </select>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="w-full border rounded-lg px-4 py-2">
              <option value="NEW">Yangi</option>
              <option value="GOOD">Yaxshi</option>
              <option value="FAIR">O'rtacha</option>
              <option value="WORN">Eskirgan</option>
            </select>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Uchrashuv joyi <span className="text-red-500">*</span></label>
              <input placeholder="Masalan: Chilonzor metro yonida" value={form.meetupLocation} onChange={(e) => setForm({ ...form, meetupLocation: e.target.value })} className="w-full border rounded-lg px-4 py-2 mb-2" />
              <p className="text-xs text-gray-500 mb-2">📍 Xaritadan uchrashuv joyini belgilang (uyingizni emas, umumiy joy tanlang)</p>
              <div className="rounded-xl overflow-hidden border" style={{ height: "250px" }}>
                <MapContainer key={`add-${userPosition[0]}-${userPosition[1]}`} center={userPosition} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapPicker onPick={(lat, lng) => setMeetupCoords([lat, lng])} />
                  <Marker position={userPosition}><Popup>Siz shu yerdasiz</Popup></Marker>
                  {meetupCoords && <Marker position={meetupCoords}><Popup>Uchrashuv joyi</Popup></Marker>}
                </MapContainer>
              </div>
              {meetupCoords ? (
                <p className="text-xs text-green-600 mt-1">✅ Uchrashuv joyi belgilandi</p>
              ) : (
                <p className="text-xs text-red-500 mt-1">⚠️ Xaritadan joy tanlang</p>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setCoverFile(null); setCoverPreview(null); setMeetupCoords(null); }} className="flex-1 border py-2 rounded-lg hover:bg-gray-50">Bekor qilish</button>
              <button type="submit" disabled={formLoading} className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{formLoading ? "Saqlanmoqda..." : "Saqlash"}</button>
            </div>
          </form>
        )}

        {pageLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <BookRowSkeleton key={i} />)}
          </div>
        ) : books.length === 0 ? (
          <p className="text-gray-500">Hozircha kitob yo'q</p>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <div key={book.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex">
                  <div
                    className="w-32 h-40 bg-gray-200 flex-shrink-0 relative cursor-pointer group"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleCoverUpload(book.id, file);
                      };
                      input.click();
                    }}
                  >
                    <CoverImage src={book.coverUrl} alt={book.title} fit="cover" />
                    {!book.coverUrl && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm text-center px-2">
                        📷 Rasm qo'shish
                      </div>
                    )}
                    {uploadingId === book.id && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-xs">Yuklanmoqda...</div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition" />
                  </div>
                  <div className="p-4 flex-1 flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-bold">{book.title}</h2>
                      <p className="text-gray-600">{book.author}</p>
                      <p className="text-sm text-gray-500">{book.city}</p>
                      {book.meetupLocation && <p className="text-xs text-blue-600 mt-1">📍 {book.meetupLocation}</p>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm px-3 py-1 rounded-full ${book.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {book.status === "AVAILABLE" ? "Mavjud" : "Ijarada"}
                      </span>
                      <button onClick={() => { setEditingBook(book); setEditMeetupCoords(null); setEditForm({ description: book.description || "", condition: book.condition || "GOOD", meetupLocation: book.meetupLocation || "", city: book.city || "" }); }} className="text-blue-500 hover:underline text-sm">Tahrirlash</button>
                      <button onClick={() => handleDelete(book.id)} className="text-red-500 hover:underline text-sm">O'chirish</button>
                    </div>
                  </div>
                </div>

                {editingBook?.id === book.id && (
                  <div className="p-4 border-t bg-gray-50 space-y-3">
                    <input placeholder="Shahar" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm" />
                    <div>
                      <textarea placeholder="Tavsif" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm" rows={2} maxLength={1000} />
                      <p className={`text-xs mt-1 text-right ${editForm.description.length > 900 ? "text-red-500" : "text-gray-400"}`}>{editForm.description.length}/1000</p>
                    </div>
                    <select value={editForm.condition} onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm">
                      <option value="NEW">Yangi</option>
                      <option value="GOOD">Yaxshi</option>
                      <option value="FAIR">O'rtacha</option>
                      <option value="WORN">Eskirgan</option>
                    </select>
                    <input placeholder="Uchrashuv joyi (matn)" value={editForm.meetupLocation} onChange={(e) => setEditForm({ ...editForm, meetupLocation: e.target.value })} className="w-full border rounded-lg px-4 py-2 text-sm" />
                    <div>
                      <p className="text-xs text-gray-500 mb-2">📍 Xaritadan uchrashuv joyini belgilang</p>
                      <div className="rounded-xl overflow-hidden border" style={{ height: "220px" }}>
                        <MapContainer key={`edit-${userPosition[0]}-${userPosition[1]}`} center={userPosition} zoom={14} style={{ height: "100%", width: "100%" }}>
                          <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <MapPicker onPick={(lat, lng) => setEditMeetupCoords([lat, lng])} />
                          <Marker position={userPosition}><Popup>Siz shu yerdasiz</Popup></Marker>
                          {editMeetupCoords && <Marker position={editMeetupCoords}><Popup>Yangi uchrashuv joyi</Popup></Marker>}
                        </MapContainer>
                      </div>
                      {editMeetupCoords ? (
                        <p className="text-xs text-green-600 mt-1">✅ Yangi uchrashuv joyi belgilandi</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">O'zgartirmasangiz eski joy qoladi</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingBook(null); setEditMeetupCoords(null); }} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-100">Bekor qilish</button>
                      <button onClick={() => handleEditSave(book.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Saqlash</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}