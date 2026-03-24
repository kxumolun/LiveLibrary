import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

interface Borrow {
  id: string;
  status: string;
  borrowedAt: string;
  dueAt: string;
  handoverOtp: string | null;
  handoverExpiry: string | null;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
  };
  borrower: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    city: string | null;
    phone: string | null;
  };
}

function BorrowCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
      <div className="flex">
        <div className="w-24 h-32 bg-gray-200 flex-shrink-0" />
        <div className="p-4 flex-1 space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="h-3 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    </div>
  );
}

function Timer({ expiry, onExpire }: { expiry: string; onExpire?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("");
  const expiredRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiry).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Muddat tugadi");
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire?.();
        }
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  return (
    <span className={`text-sm font-mono font-bold ${timeLeft === "Muddat tugadi" ? "text-red-500" : "text-orange-500"}`}>
      ⏱ {timeLeft}
    </span>
  );
}

export default function OwnerBorrowsPage() {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const setOwnerPendingCount = useAuthStore((s) => s.setOwnerPendingCount);
  const navigate = useNavigate();

  const fetchBorrows = useCallback(() => {
    api.get("/borrows/owner-borrows").then((res) => {
      setBorrows(res.data);
      const pending = res.data.filter(
        (b: any) => b.status === "PENDING_HANDOVER" || b.status === "PENDING_RETURN"
      ).length;
      setOwnerPendingCount(pending);
      setPageLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchBorrows();
    const interval = setInterval(fetchBorrows, 10000);
    return () => clearInterval(interval);
  }, [fetchBorrows]);

  const handleConfirmReturn = async (borrowId: string) => {
    const otp = otpInputs[borrowId];
    if (!otp) { toast.error("OTP kodni kiriting"); return; }
    setLoading((prev) => ({ ...prev, [borrowId]: true }));
    try {
      await api.patch(`/borrows/${borrowId}/confirm-return`, { otp });
      toast.success("Kitob qaytarildi!");
      setBorrows((prev) => {
        const updated = prev.filter((b) => b.id !== borrowId);
        const pending = updated.filter(
          (b) => b.status === "PENDING_HANDOVER" || b.status === "PENDING_RETURN"
        ).length;
        setOwnerPendingCount(pending);
        return updated;
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xato yuz berdi");
    } finally {
      setLoading((prev) => ({ ...prev, [borrowId]: false }));
    }
  };

  const statusLabel: Record<string, string> = {
    PENDING_HANDOVER: "Topshirish kutilmoqda",
    ACTIVE: "Faol ijara",
    OVERDUE: "Muddati o'tgan",
    PENDING_RETURN: "Qaytarish kutilmoqda",
  };

  const statusColor: Record<string, string> = {
    PENDING_HANDOVER: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    OVERDUE: "bg-red-100 text-red-700",
    PENDING_RETURN: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mening ijaraga berganlarim</h1>

        {pageLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <BorrowCardSkeleton key={i} />)}
          </div>
        ) : borrows.length === 0 ? (
          <p className="text-gray-500">Hozircha faol ijara yo'q</p>
        ) : (
          <div className="space-y-4">
            {borrows.map((borrow) => (
              <div key={borrow.id} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="flex">
                  <div className="w-24 h-32 bg-gray-200 flex-shrink-0">
                    {borrow.book.coverUrl ? (
                      <img src={borrow.book.coverUrl} alt={borrow.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h2 className="text-lg font-bold">{borrow.book.title}</h2>
                        <p className="text-gray-600 text-sm">{borrow.book.author}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Oluvchi: <span className="font-medium">{borrow.borrower.fullName}</span>
                          {borrow.borrower.city && ` — ${borrow.borrower.city}`}
                        </p>
                        {/* OVERDUE bo'lganda telefon ko'rinadi */}
                        {borrow.status === "OVERDUE" && borrow.borrower.phone && (
                          <p className="text-sm text-red-600 mt-1 font-medium">
                            📞 {borrow.borrower.phone}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Qaytarish: {new Date(borrow.dueAt).toLocaleDateString("uz-UZ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${statusColor[borrow.status]}`}>
                          {statusLabel[borrow.status]}
                        </span>
                        {(borrow.status === "PENDING_HANDOVER" ||
                          borrow.status === "ACTIVE" ||
                          borrow.status === "OVERDUE" ||
                          borrow.status === "PENDING_RETURN") && (
                          <button
                            onClick={() => navigate(`/chat/${borrow.id}`)}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition"
                          >
                            💬 Chat
                          </button>
                        )}
                      </div>
                    </div>

                    {borrow.status === "PENDING_HANDOVER" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-yellow-700 font-medium">Sizning tasdiqlash kodingiz:</p>
                          {borrow.handoverExpiry && (
                            <Timer
                              expiry={borrow.handoverExpiry}
                              onExpire={() => {
                                toast.error("Kitob topshirish muddati tugadi — ijara bekor qilindi");
                                fetchBorrows();
                              }}
                            />
                          )}
                        </div>
                        <p className="text-2xl font-mono font-bold text-yellow-800 tracking-widest">
                          {borrow.handoverOtp}
                        </p>
                        <p className="text-xs text-yellow-600">Bu kodni oluvchiga bering — u o'z akkountida kiritadi</p>
                      </div>
                    )}

                    {borrow.status === "ACTIVE" && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-700">
                          Kitob ijarada — qaytarish sanasi:{" "}
                          <span className="font-medium">{new Date(borrow.dueAt).toLocaleDateString("uz-UZ")}</span>
                        </p>
                      </div>
                    )}

                    {borrow.status === "OVERDUE" && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                        <p className="text-sm text-red-700 font-medium">⚠️ Qaytarish muddati o'tib ketdi!</p>
                        <p className="text-xs text-red-600">
                          Kitob {new Date(borrow.dueAt).toLocaleDateString("uz-UZ")} da qaytarilishi kerak edi.
                        </p>
                        {borrow.borrower.phone && (
                          <p className="text-xs text-red-600">
                            Oluvchi bilan bog'laning:{" "}
                            <a href={`tel:${borrow.borrower.phone}`} className="font-bold underline">
                              {borrow.borrower.phone}
                            </a>
                          </p>
                        )}
                      </div>
                    )}

                    {borrow.status === "PENDING_RETURN" && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-2">
                        <p className="text-sm text-orange-700 font-medium">Oluvchi kitobni qaytarmoqchi</p>
                        <p className="text-xs text-orange-600">Oluvchining kodini kiriting:</p>
                        <div className="flex gap-2">
                          <input
                            placeholder="OTP kodni kiriting"
                            value={otpInputs[borrow.id] || ""}
                            onChange={(e) =>
                              setOtpInputs((prev) => ({ ...prev, [borrow.id]: e.target.value.toUpperCase() }))
                            }
                            className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono uppercase"
                            maxLength={6}
                          />
                          <button
                            onClick={() => handleConfirmReturn(borrow.id)}
                            disabled={loading[borrow.id]}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            Tasdiqlash
                          </button>
                        </div>
                      </div>
                    )}
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