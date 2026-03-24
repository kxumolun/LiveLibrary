import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";

interface Borrow {
  id: string;
  status: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  handoverOtp: string | null;
  returnOtp: string | null;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    city: string | null;
    owner: {
      fullName: string;
      avatarUrl: string | null;
    };
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

export default function MyBorrowsPage() {
  const [borrows, setBorrows] = useState<Borrow[]>([]);
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBorrows = () => {
      api.get("/borrows/my-borrows").then((res) => {
        setBorrows((prev) => {
          res.data.forEach((newB: Borrow) => {
            const oldB = prev.find((b) => b.id === newB.id);
            if (oldB?.status === "PENDING_HANDOVER" && newB.status === "CANCELLED") {
              toast.error(`"${newB.book.title}" — kitob topshirish muddati tugadi`);
            }
            if (oldB?.status === "ACTIVE" && newB.status === "OVERDUE") {
              toast.error(`"${newB.book.title}" — qaytarish muddati o'tib ketdi!`);
            }
          });
          return res.data;
        });
        setPageLoading(false);
      });
    };

    fetchBorrows();
    const interval = setInterval(fetchBorrows, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmHandover = async (id: string) => {
    const otp = otpInputs[id];
    if (!otp) { toast.error("OTP kodni kiriting"); return; }
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/borrows/${id}/handover`, { otp });
      toast.success("Kitob qabul qilindi!");
      setBorrows((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: "ACTIVE", handoverOtp: null } : b))
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xato yuz berdi");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleInitiateReturn = async (id: string) => {
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.patch(`/borrows/${id}/initiate-return`);
      toast.success("Qaytarish so'rovi yuborildi!");
      setBorrows((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: "PENDING_RETURN", returnOtp: res.data.returnOtp } : b
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xato yuz berdi");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("uz-UZ", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

  const statusLabel: Record<string, string> = {
    PENDING_HANDOVER: "Kitob kutilmoqda",
    ACTIVE: "Faol",
    OVERDUE: "Muddati o'tgan",
    PENDING_RETURN: "Qaytarish jarayonida",
    RETURNED: "Qaytarilgan",
    CANCELLED: "Bekor qilindi",
  };

  const statusColor: Record<string, string> = {
    PENDING_HANDOVER: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-blue-100 text-blue-700",
    OVERDUE: "bg-red-100 text-red-700",
    PENDING_RETURN: "bg-orange-100 text-orange-700",
    RETURNED: "bg-gray-100 text-gray-500",
    CANCELLED: "bg-red-100 text-red-500",
  };

  const isChatActive = (status: string) =>
    ["PENDING_HANDOVER", "ACTIVE", "OVERDUE", "PENDING_RETURN"].includes(status);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Mening ijaralarim</h1>

        {pageLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <BorrowCardSkeleton key={i} />)}
          </div>
        ) : borrows.length === 0 ? (
          <p className="text-gray-500">Hozircha ijara yo'q</p>
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
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h2 className="text-lg font-bold">{borrow.book.title}</h2>
                        <p className="text-gray-600">{borrow.book.author}</p>
                        <p className="text-sm text-gray-500 mt-1">Egasi: {borrow.book.owner.fullName}</p>
                        <p className="text-sm text-gray-500">Olingan: {formatDate(borrow.borrowedAt)}</p>
                        <p className={`text-sm ${borrow.status === "OVERDUE" ? "text-red-500 font-medium" : "text-gray-500"}`}>
                          Qaytarish: {formatDate(borrow.dueAt)}
                          {borrow.status === "OVERDUE" && " ⚠️"}
                        </p>
                        {borrow.returnedAt && (
                          <p className="text-sm text-green-600">Qaytarildi: {formatDate(borrow.returnedAt)}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`text-xs px-3 py-1 rounded-full ${statusColor[borrow.status] || "bg-gray-100 text-gray-500"}`}>
                          {statusLabel[borrow.status] || borrow.status}
                        </span>
                        {isChatActive(borrow.status) ? (
                          <button
                            onClick={() => navigate(`/chat/${borrow.id}`)}
                            className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full hover:bg-blue-100 transition"
                          >
                            💬 Chat
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-400 px-3 py-1 rounded-full cursor-not-allowed">
                            💬 Chat yopiq
                          </span>
                        )}
                      </div>
                    </div>

                    {borrow.status === "PENDING_HANDOVER" && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2 mt-2">
                        <p className="text-sm text-yellow-700 font-medium">Kitobni qabul qilish</p>
                        <p className="text-xs text-yellow-600">Kitob egasining kodini kiriting:</p>
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
                            onClick={() => handleConfirmHandover(borrow.id)}
                            disabled={loading[borrow.id]}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {loading[borrow.id] ? "..." : "Qabul qilish"}
                          </button>
                        </div>
                      </div>
                    )}

                    {(borrow.status === "ACTIVE" || borrow.status === "OVERDUE") && (
                      <div className="mt-2 space-y-2">
                        {borrow.status === "OVERDUE" && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700 font-medium">⚠️ Qaytarish muddati o'tib ketdi!</p>
                            <p className="text-xs text-red-600 mt-1">Iltimos, kitobni tezda qaytaring.</p>
                          </div>
                        )}
                        <button
                          onClick={() => handleInitiateReturn(borrow.id)}
                          disabled={loading[borrow.id]}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                        >
                          {loading[borrow.id] ? "Yuklanmoqda..." : "Qaytarish"}
                        </button>
                      </div>
                    )}

                    {borrow.status === "PENDING_RETURN" && borrow.returnOtp && (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                        <p className="text-sm text-orange-700 font-medium mb-1">Sizning qaytarish kodingiz:</p>
                        <p className="text-2xl font-mono font-bold text-orange-800 tracking-widest">{borrow.returnOtp}</p>
                        <p className="text-xs text-orange-600 mt-1">Bu kodni kitob egasiga bering — u tasdiqlash uchun ishlatadi</p>
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