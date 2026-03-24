import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/authStore";

interface Conversation {
  borrowId: string;
  status: string;
  book: {
    id: string;
    title: string;
    coverUrl: string | null;
    owner: { id: string; fullName: string; avatarUrl: string | null };
  };
  other: { id: string; fullName: string; avatarUrl: string | null };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  } | null;
  unreadCount: number;
}

function ConversationSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4 animate-pulse">
      <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

function ConfirmModal({
  name,
  onConfirm,
  onCancel,
  loading,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-lg font-bold mb-2">Chatni o'chirish</h2>
        <p className="text-gray-600 text-sm mb-6">
          <span className="font-medium">{name}</span> bilan bo'lgan chatni o'chirmoqchimisiz?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-gray-300 py-2 rounded-xl text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "O'chirilmoqda..." : "O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<Conversation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/chat/conversations").then((res) => {
      setConversations(res.data);
      setPageLoading(false);
    });
  }, []);

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/chat/${confirmDelete.borrowId}`);
      setConversations((prev) => prev.filter((c) => c.borrowId !== confirmDelete.borrowId));
      toast.success("Chat o'chirildi");
      setConfirmDelete(null);
    } catch {
      toast.error("Xato yuz berdi");
    } finally {
      setDeleting(false);
    }
  };

  const statusLabel: Record<string, string> = {
    PENDING_HANDOVER: "Topshirish kutilmoqda",
    ACTIVE: "Faol",
    PENDING_RETURN: "Qaytarish kutilmoqda",
    RETURNED: "Tugagan",
    CANCELLED: "Bekor qilingan",
  };

  const statusColor: Record<string, string> = {
    PENDING_HANDOVER: "bg-yellow-100 text-yellow-700",
    ACTIVE: "bg-green-100 text-green-700",
    PENDING_RETURN: "bg-orange-100 text-orange-700",
    RETURNED: "bg-gray-100 text-gray-500",
    CANCELLED: "bg-red-100 text-red-500",
  };

  const canDelete = (status: string) =>
    status === "RETURNED" || status === "CANCELLED";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Xabarlar</h1>

        {pageLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <ConversationSkeleton key={i} />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-gray-500">Hozircha xabar yo'q</p>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.borrowId}
                className={`bg-white rounded-xl shadow p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition ${conv.unreadCount > 0 ? "border-l-4 border-blue-500" : ""}`}
                onClick={() => navigate(`/chat/${conv.borrowId}`)}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold overflow-hidden">
                    {conv.other.avatarUrl ? (
                      <img src={conv.other.avatarUrl} alt={conv.other.fullName} className="w-full h-full object-cover" />
                    ) : (
                      conv.other.fullName[0]
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <p className={`font-medium ${conv.unreadCount > 0 ? "text-blue-600" : "text-gray-800"}`}>
                      {conv.other.fullName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[conv.status]}`}>
                        {statusLabel[conv.status]}
                      </span>
                      {canDelete(conv.status) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(conv);
                          }}
                          className="text-gray-400 hover:text-red-500 transition p-1"
                          title="Chatni o'chirish"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mb-1">📚 {conv.book.title}</p>
                  {conv.lastMessage ? (
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? "font-medium text-gray-800" : "text-gray-500"}`}>
                        {conv.lastMessage.senderId === user?.id ? "Siz: " : ""}
                        {conv.lastMessage.content}
                      </p>
                      <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(conv.lastMessage.createdAt).toLocaleTimeString("uz-UZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Xabar yo'q</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          name={confirmDelete.other.fullName}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}   