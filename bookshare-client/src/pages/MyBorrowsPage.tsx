import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import PremiumSelect from "../components/PremiumSelect";

interface Borrow {
  id: string;
  status: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  handoverOtp: string | null;
  returnOtp: string | null;
  overdueReason: string | null;
  overdueReasonSentAt: string | null;
  extensionStatus: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  extensionReason: string | null;
  extensionDays: number | null;
  extensionRequestedAt: string | null;
  extensionRespondedAt: string | null;
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
  const [reasonInputs, setReasonInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [extendModalBorrowId, setExtendModalBorrowId] = useState<string | null>(null);
  const [extendReason, setExtendReason] = useState("");
  const [extendDays, setExtendDays] = useState(3);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBorrows = () => {
      if (document.visibilityState !== "visible") return;
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
    const interval = setInterval(fetchBorrows, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const nearDue = borrows.find((b) => {
      if (b.status !== "ACTIVE") return false;
      if (b.extensionStatus === "PENDING") return false;
      const remainMs = new Date(b.dueAt).getTime() - Date.now();
      return remainMs > 0 && remainMs <= 48 * 60 * 60 * 1000;
    });
    if (!nearDue) return;
    const key = `borrow:extend-prompt:${nearDue.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setExtendModalBorrowId(nearDue.id);
  }, [borrows]);

  const handleConfirmHandover = async (id: string) => {
    const otp = otpInputs[id];
    if (!otp) { toast.error("Tasdiqlash kodini kiriting"); return; }
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

  const handleSubmitOverdueReason = async (id: string) => {
    const reason = (reasonInputs[id] || "").trim();
    if (reason.length < 10) {
      toast.error("Sababni kamida 10 ta belgi bilan yozing");
      return;
    }
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/borrows/${id}/overdue-reason`, { reason });
      toast.success("Sabab egasiga yuborildi");
      setBorrows((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, overdueReason: reason, overdueReasonSentAt: new Date().toISOString() }
            : b
        )
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Sabab yuborilmadi");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleRequestExtension = async (id: string) => {
    const reason = extendReason.trim();
    if (reason.length < 10) {
      toast.error("Sababni kamida 10 ta belgi bilan yozing");
      return;
    }
    setLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await api.patch(`/borrows/${id}/request-extension`, {
        reason,
        extraDays: extendDays,
      });
      toast.success("Uzatish so'rovi yuborildi");
      setBorrows((prev) =>
        prev.map((b) =>
          b.id === id
            ? {
                ...b,
                extensionStatus: "PENDING",
                extensionReason: reason,
                extensionDays: extendDays,
                extensionRequestedAt: new Date().toISOString(),
              }
            : b
        )
      );
      setExtendModalBorrowId(null);
      setExtendReason("");
      setExtendDays(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "So'rov yuborilmadi");
    } finally {
      setLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const isDueSoon = (borrow: Borrow) => {
    if (borrow.status !== "ACTIVE") return false;
    const remainMs = new Date(borrow.dueAt).getTime() - Date.now();
    return remainMs > 0 && remainMs <= 48 * 60 * 60 * 1000;
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
                <div className="flex flex-col sm:flex-row">
                  <div className="w-24 sm:w-24 aspect-[3/4] bg-gray-200 flex-shrink-0 overflow-hidden">
                    {borrow.book.coverUrl ? (
                      <img src={borrow.book.coverUrl} alt={borrow.book.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                    )}
                  </div>
                  <div className="p-4 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
                      <div className="min-w-0">
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
                        <p className="text-xs text-yellow-600">Uchrashuvda kitob egasi aytgan tasdiqlash kodini kiriting:</p>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                          ℹ️ Kodni boshqa odamlarga aytmang. Tasdiqlashni o'zingiz bajaring.
                        </p>
                        <div className="flex gap-2">
                          <input
                            placeholder="Tasdiqlash kodini kiriting"
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
                        {isDueSoon(borrow) && borrow.extensionStatus !== "PENDING" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700 font-medium">
                              ⏰ Qaytarish muddati yaqinlashmoqda
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              O'qib tugatmagan bo'lsangiz, sabab yozib muddatni uzaytirish so'rovini yuboring.
                            </p>
                            <button
                              onClick={() => setExtendModalBorrowId(borrow.id)}
                              className="mt-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-blue-700"
                            >
                              Muddatni uzaytirish so'rovi
                            </button>
                          </div>
                        )}

                        {borrow.extensionStatus === "PENDING" && (
                          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                            <p className="text-sm text-indigo-700 font-medium">
                              Uzaytirish so'rovi yuborilgan
                            </p>
                            <p className="text-xs text-indigo-600 mt-1">
                              {borrow.extensionDays} kun so'ralgan. Owner javobini kuting.
                            </p>
                          </div>
                        )}
                        {borrow.extensionStatus === "ACCEPTED" && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-700 font-medium">
                              ✅ Muddat uzaytirildi
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              So'rovingiz qabul qilindi: {borrow.extensionDays} kun.
                            </p>
                          </div>
                        )}
                        {borrow.extensionStatus === "REJECTED" && (
                          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                            <p className="text-sm text-rose-700 font-medium">
                              ❌ Uzaytirish so'rovi rad etildi
                            </p>
                            <p className="text-xs text-rose-600 mt-1">
                              Iltimos, kitobni belgilangan muddatda qaytaring.
                            </p>
                          </div>
                        )}

                        {borrow.status === "OVERDUE" && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-700 font-medium">⚠️ Qaytarish muddati o'tib ketdi!</p>
                            <p className="text-xs text-red-600 mt-1">Iltimos, kitobni tezda qaytaring.</p>
                            <div className="mt-3 space-y-2">
                              <label className="text-xs text-red-700 font-medium">
                                Kechikish sababini egasiga yuboring
                              </label>
                              <textarea
                                rows={2}
                                placeholder="Masalan: safardaman, falon sanada qaytaraman..."
                                value={reasonInputs[borrow.id] ?? borrow.overdueReason ?? ""}
                                onChange={(e) =>
                                  setReasonInputs((prev) => ({ ...prev, [borrow.id]: e.target.value }))
                                }
                                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm"
                              />
                              <button
                                onClick={() => handleSubmitOverdueReason(borrow.id)}
                                disabled={loading[borrow.id]}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                              >
                                {loading[borrow.id] ? "Yuborilmoqda..." : "Sababni yuborish"}
                              </button>
                            </div>
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
                        <p className="text-sm text-orange-700 font-medium mb-1">Sizning qaytarish tasdiqlash kodingiz:</p>
                        <p className="text-2xl font-mono font-bold text-orange-800 tracking-widest">{borrow.returnOtp}</p>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1 mt-2">
                          ℹ️ Bu kodni xabarda yubormang. Uchrashuvda egasi kodni sizning telefoningizdan kiritsin.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {extendModalBorrowId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-5">
            <h3 className="text-lg font-extrabold text-slate-900">
              Muddatni uzaytirish so'rovi
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              O'qib tugatmagan bo'lsangiz, sababini yozing. Owner ko'rib qabul yoki rad qiladi.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-sm text-slate-700">Necha kunga?</label>
                <div className="mt-1">
                  <PremiumSelect
                    value={extendDays}
                    onChange={(v) => setExtendDays(v)}
                    options={[
                      { value: 3, label: "3 kun" },
                      { value: 5, label: "5 kun" },
                      { value: 7, label: "7 kun" },
                      { value: 10, label: "10 kun" },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-700">Sabab</label>
                <textarea
                  rows={3}
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  placeholder="Masalan: safardaman, falon sanada topshiraman..."
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setExtendModalBorrowId(null);
                    setExtendReason("");
                    setExtendDays(3);
                  }}
                  className="flex-1 border rounded-lg py-2 hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={() => handleRequestExtension(extendModalBorrowId)}
                  disabled={loading[extendModalBorrowId]}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading[extendModalBorrowId] ? "Yuborilmoqda..." : "So'rov yuborish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}