import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "../api/axios";
import { useAuthStore } from "../store/authStore";

interface Message {
  id: string;
  borrowId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null };
}

interface BorrowInfo {
  status: string;
  borrower: { id: string; fullName: string; avatarUrl: string | null };
  book: {
    title: string;
    owner: { id: string; fullName: string; avatarUrl: string | null };
  };
}

export default function ChatPage() {
  const { borrowId } = useParams<{ borrowId: string }>();
  const { user, token, setUnreadCount } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [borrowInfo, setBorrowInfo] = useState<BorrowInfo | null>(null);
  const [input, setInput] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [closed, setClosed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/chat/messages/${borrowId}`).then((res) => {
      setMessages(res.data.messages);
      setBorrowInfo(res.data.borrow);
      if (
        res.data.borrow.status === "RETURNED" ||
        res.data.borrow.status === "CANCELLED"
      ) {
        setClosed(true);
      }
    });

    const base = (import.meta.env.VITE_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");
    const s = io(`${base}/chat`, { auth: { token } });
    setSocket(s);

    s.on("new_message", (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      s.emit("mark_read", { borrowId });
      api.get("/chat/unread").then((res) => setUnreadCount(res.data));
    });

    s.on("message_read", (data: { messageIds: string[]; readAt: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m.id)
            ? { ...m, isRead: true, readAt: data.readAt }
            : m,
        ),
      );
    });

    s.on("chat_error", () => setClosed(true));

    s.emit("mark_read", { borrowId });
    api.get("/chat/unread").then((res) => setUnreadCount(res.data));

    return () => {
      s.disconnect();
    };
  }, [borrowId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !socket || closed) return;
    const other = borrowInfo
      ? borrowInfo.book.owner.id === user?.id
        ? borrowInfo.borrower
        : borrowInfo.book.owner
      : null;
    if (!other) return;
    socket.emit("send_message", {
      borrowId,
      receiverId: other.id,
      content: input.trim(),
    });
    setInput("");
  };

  const other = borrowInfo
    ? borrowInfo.book.owner.id === user?.id
      ? borrowInfo.borrower
      : borrowInfo.book.owner
    : null;

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("uz-UZ", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow px-8 py-4 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Orqaga
        </button>
        {other && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
              {other.avatarUrl ? (
                <img
                  src={other.avatarUrl}
                  alt={other.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                other.fullName[0]
              )}
            </div>
            <div>
              <p className="font-bold text-sm">{other.fullName}</p>
              <p className="text-xs text-gray-500">{borrowInfo?.book.title}</p>
            </div>
          </div>
        )}
        {closed && (
          <span className="ml-auto text-xs bg-red-100 text-red-500 px-3 py-1 rounded-full">
            Chat yopilgan
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3 max-w-2xl w-full mx-auto">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 text-sm mt-8">
            Hozircha xabar yo'q
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                  isMe
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-white shadow text-gray-800 rounded-bl-none"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <p
                    className={`text-xs ${
                      isMe ? "text-blue-200" : "text-gray-400"
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                  {isMe && (
                    <span className="flex items-center gap-0.5">
                      {msg.isRead ? (
                        <>
                          <span className="text-xs text-blue-200">✓✓</span>
                          {msg.readAt && (
                            <span className="text-[10px] text-blue-200">
                              {formatTime(msg.readAt)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-blue-300">✓</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          {closed ? (
            <p className="flex-1 text-center text-gray-400 text-sm py-2">
              Bu ijara tugagan — xabar yuborib bo'lmaydi
            </p>
          ) : (
            <>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Xabar yozing..."
                className="flex-1 border rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                Yuborish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
