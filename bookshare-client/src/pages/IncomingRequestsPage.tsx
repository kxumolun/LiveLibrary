import { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";
import CoverImage from "../components/CoverImage";

interface IncomingRequest {
  id: string;
  status: string;
  durationDays: number;
  message: string | null;
  requestedAt: string;
  book: {
    title: string;
    author: string;
    coverUrl: string | null;
  };
  requester: {
    fullName: string;
    avatarUrl: string | null;
    city: string | null;
  };
}

function RequestCardSkeleton() {
  return (
    <div className="card overflow-hidden flex animate-pulse">
      <div className="w-24 sm:w-28 aspect-[3/4] bg-gray-200 flex-shrink-0" />
      <div className="p-4 flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function IncomingRequestsPage() {
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const { setIncomingCount, setOwnerPendingCount } = useAuthStore();

  useEffect(() => {
    api.get("/borrows/incoming").then((res) => {
      setRequests(res.data);
      setPageLoading(false);
    });
  }, []);

  const handleRespond = async (id: string, accept: boolean) => {
    const toastId = toast.loading(accept ? "Qabul qilinmoqda..." : "Rad etilmoqda...");
    try {
      await api.patch(`/borrows/request/${id}/${accept ? "accept" : "reject"}`);
      toast.success(accept ? "So'rov qabul qilindi!" : "So'rov rad etildi", { id: toastId });
      const ownerRes = await api.get("/borrows/owner-borrows");
      const pending = ownerRes.data.filter((b: any) => b.status === "PENDING_HANDOVER" || b.status === "PENDING_RETURN").length;
      setOwnerPendingCount(pending);
      const res = await api.get("/borrows/incoming");
      setRequests(res.data);
      setIncomingCount(res.data.length);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Xato yuz berdi", { id: toastId });
      const res = await api.get("/borrows/incoming");
      setRequests(res.data);
      setIncomingCount(res.data.length);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-6 sm:py-8">
      <div className="container-app">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">
            Qabul kutayotgan so'rovlar
          </h1>

        {pageLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <p className="text-gray-500">Hozircha so'rov yo'q</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="card overflow-hidden flex flex-col sm:flex-row"
              >
                <div className="w-full sm:w-28 aspect-[16/10] sm:aspect-[3/4] flex-shrink-0">
                  <CoverImage src={req.book.coverUrl} alt={req.book.title} fit="cover" />
                </div>

                <div className="p-4 flex-1 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-extrabold truncate">
                      {req.book.title}
                    </h2>
                    <p className="text-surface-900/70 text-sm truncate">
                      {req.book.author}
                    </p>
                    <p className="text-sm text-surface-900/60 mt-2">
                      So'rovchi:{" "}
                      <span className="font-semibold text-surface-900">
                        {req.requester.fullName}
                      </span>
                      {req.requester.city && (
                        <span className="text-surface-900/60">
                          {" "}
                          — {req.requester.city}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-surface-900/60">
                      Muddat: <span className="font-semibold">{req.durationDays} kun</span>
                    </p>
                    {req.message && (
                      <p className="text-sm text-surface-900/70 mt-2 italic line-clamp-2">
                        “{req.message}”
                      </p>
                    )}
                  </div>

                  <div className="flex flex-row sm:flex-col gap-2 sm:min-w-40">
                    <button
                      onClick={() => handleRespond(req.id, true)}
                      className="flex-1 sm:flex-none btn-primary bg-green-600 hover:bg-green-700"
                    >
                      Qabul qilish
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, false)}
                      className="flex-1 sm:flex-none btn-primary bg-red-500 hover:bg-red-600"
                    >
                      Rad etish
                    </button>
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