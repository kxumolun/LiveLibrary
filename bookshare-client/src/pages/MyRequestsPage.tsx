import { useEffect, useState } from "react";
import api from "../api/axios";

interface BorrowRequest {
  id: string;
  status: string;
  durationDays: number;
  message: string | null;
  requestedAt: string;
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl: string | null;
    owner: { fullName: string };
  };
}

function RequestCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow overflow-hidden flex animate-pulse">
      <div className="w-24 h-32 bg-gray-200 flex-shrink-0" />
      <div className="p-4 flex-1 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    api.get("/borrows/my-requests").then((res) => {
      setRequests(res.data);
      setPageLoading(false);
    });
  }, []);

  const statusLabel: Record<string, string> = {
    PENDING: "Kutilmoqda",
    ACCEPTED: "Qabul qilindi",
    REJECTED: "Rad etildi",
  };

  const statusColor: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    ACCEPTED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Yuborgan so'rovlarim</h1>

      {pageLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <RequestCardSkeleton key={i} />)}
        </div>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">Hozircha so'rov yo'q</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl shadow overflow-hidden flex flex-col sm:flex-row">
              <div className="w-24 sm:w-24 aspect-[3/4] bg-gray-200 flex-shrink-0 overflow-hidden">
                {req.book.coverUrl ? (
                  <img src={req.book.coverUrl} alt={req.book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                )}
              </div>
              <div className="p-4 flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold break-words">{req.book.title}</h2>
                  <p className="text-gray-600 break-words">{req.book.author}</p>
                  <p className="text-sm text-gray-500 break-words">Egasi: {req.book.owner.fullName}</p>
                  <p className="text-sm text-gray-500">{req.durationDays} kun</p>
                </div>
                <span className={`text-sm px-3 py-1 rounded-full w-fit ${statusColor[req.status]}`}>
                  {statusLabel[req.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}