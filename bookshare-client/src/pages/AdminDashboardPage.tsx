import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../api/axios";
import { ownerIcon } from "../utils/mapIcons";
import toast from "react-hot-toast";

type DashboardResponse = {
  summary: {
    usersCount: number;
    newUsers7d: number;
    booksCount: number;
    availableBooksCount: number;
    borrowRequestsCount: number;
    pendingRequestsCount: number;
    borrowsCount: number;
    activeBorrowsCount: number;
    estimatedVisits: number;
    realVisits?: number;
    uniqueVisitors7d?: number;
  };
  usersMap: Array<{
    id: string;
    fullName: string;
    city: string | null;
    latitude: number | null;
    longitude: number | null;
    booksCount: number;
    isBlocked?: boolean;
    telegramUsername?: string | null;
    telegramVerifiedAt?: string | null;
  }>;
  recentBooks: Array<{
    id: string;
    title: string;
    author: string;
    status: string;
    isHidden?: boolean;
    city: string | null;
    createdAt: string;
    owner: { fullName: string };
  }>;
  borrowsByStatus: Array<{ status: string; _count: { _all: number } }>;
  generatedAt: string;
};

type AdminUsersResponse = {
  items: Array<{
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
    city: string | null;
    createdAt: string;
    isBlocked?: boolean;
    blockedAt?: string | null;
    telegramChatId?: string | number | null;
    telegramUsername?: string | null;
    telegramVerifiedAt?: string | null;
  }>;
  total: number;
  take: number;
  skip: number;
};

type AdminBooksResponse = {
  items: Array<{
    id: string;
    title: string;
    author: string;
    status: string;
    city: string | null;
    createdAt: string;
    isHidden?: boolean;
    hiddenAt?: string | null;
    owner: { id: string; fullName: string; email: string };
  }>;
  total: number;
  take: number;
  skip: number;
};

function FixLeafletSize() {
  const map = useMap();
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 50);
    return () => window.clearTimeout(t);
  }, [map]);
  return null;
}

function useCountUp(target: number, duration = 1400, delay = 0) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    const tid = setTimeout(() => {
      let start: number | null = null;
      const tick = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        const e = 1 - Math.pow(1 - p, 4);
        setVal(Math.floor(e * target));
        if (p < 1) raf = requestAnimationFrame(tick);
        else setVal(target);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      clearTimeout(tid);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay]);
  return val;
}

function CountUp({ n, delay = 0 }: { n: number; delay?: number }) {
  const v = useCountUp(n, 1200, delay);
  return <>{v.toLocaleString()}</>;
}

const STATUS_META: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  ACTIVE: { label: "Faol", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  PENDING_HANDOVER: {
    label: "Topshirilmoqda",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  PENDING_RETURN: {
    label: "Qaytarilmoqda",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
  },
  RETURNED: {
    label: "Qaytarilgan",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.12)",
  },
  CANCELLED: { label: "Bekor", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  OVERDUE: { label: "Kechikkan", color: "#dc2626", bg: "rgba(220,38,38,0.12)" },
};

const BOOK_STATUS: Record<string, { label: string; dot: string }> = {
  AVAILABLE: { label: "Mavjud", dot: "#10b981" },
  BORROWED: { label: "Ijarada", dot: "#3b82f6" },
  UNAVAILABLE: { label: "Mavjud emas", dot: "#ef4444" },
};

function DonutChart({
  data,
}: {
  data: Array<{ status: string; _count: { _all: number } }>;
}) {
  const total = data.reduce((s, d) => s + d._count._all, 0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, []);

  if (total === 0)
    return (
      <p
        style={{
          color: "#9ca3af",
          fontSize: 14,
          textAlign: "center",
          padding: "32px 0",
        }}
      >
        Ma'lumot yo'q
      </p>
    );

  const R = 70,
    r = 45,
    cx = 90,
    cy = 90;
  const circumference = 2 * Math.PI * R;
  let cumulative = 0;
  const segments = data.map((d) => {
    const pct = d._count._all / total;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    const meta = STATUS_META[d.status] || {
      color: "#9ca3af",
      label: d.status,
      bg: "#f3f4f6",
    };
    return { ...d, pct, offset, dash, color: meta.color, label: meta.label };
  });

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        flexWrap: "wrap",
      }}
    >
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={180} height={180} viewBox="0 0 180 180">
          <circle
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={R - r}
          />
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={hovered === seg.status ? R - r + 4 : R - r}
              strokeDasharray={
                animated
                  ? `${seg.dash} ${circumference - seg.dash}`
                  : `0 ${circumference}`
              }
              strokeDashoffset={seg.offset}
              style={{
                transition:
                  "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1), stroke-width 0.2s",
                transformOrigin: `${cx}px ${cy}px`,
                transform: "rotate(-90deg)",
                cursor: "pointer",
                opacity: hovered && hovered !== seg.status ? 0.5 : 1,
              }}
              onMouseEnter={() => setHovered(seg.status)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            style={{ fontSize: 22, fontWeight: 800, fill: "#111827" }}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            style={{ fontSize: 11, fill: "#6b7280" }}
          >
            jami
          </text>
        </svg>
      </div>
      <div
        style={{
          flex: 1,
          minWidth: 160,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.status}
            onMouseEnter={() => setHovered(seg.status)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 10,
              background:
                hovered === seg.status
                  ? STATUS_META[seg.status]?.bg || "#f9fafb"
                  : "transparent",
              transition: "background 0.2s",
              cursor: "default",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: seg.color,
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 13, color: "#374151" }}>
              {seg.label}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
              {seg._count._all}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "#9ca3af",
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {(seg.pct * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ available, total }: { available: number; total: number }) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 400);
    return () => clearTimeout(t);
  }, []);
  const borrowed = total - available;
  const bars = [
    { label: "Mavjud", value: available, color: "#10b981", max: total },
    { label: "Ijarada", value: borrowed, color: "#3b82f6", max: total },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {bars.map((bar) => {
        const pct = total > 0 ? (bar.value / bar.max) * 100 : 0;
        return (
          <div key={bar.label}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 13, color: "#374151" }}>
                {bar.label}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#111827" }}>
                {bar.value}{" "}
                <span style={{ fontWeight: 400, color: "#9ca3af" }}>
                  / {total}
                </span>
              </span>
            </div>
            <div
              style={{
                height: 10,
                background: "#f3f4f6",
                borderRadius: 99,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: animated ? `${pct}%` : "0%",
                  background: bar.color,
                  borderRadius: 99,
                  transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
                }}
              />
            </div>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 8,
          padding: "10px 14px",
          background: "rgba(99,102,241,0.06)",
          borderRadius: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
          Mavjudlik foizi
        </span>
        <span style={{ fontSize: 18, fontWeight: 800, color: "#6366f1" }}>
          {total > 0 ? ((available / total) * 100).toFixed(0) : 0}%
        </span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
  delay,
}: {
  label: string;
  value: number;
  sub: string;
  icon: string;
  accent: string;
  delay: number;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 20,
        padding: "20px 22px",
        border: "1.5px solid",
        borderColor: hovered ? accent : "#f0f0f0",
        boxShadow: hovered
          ? `0 8px 32px ${accent}22`
          : "0 2px 8px rgba(0,0,0,0.04)",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        transform: hovered ? "translateY(-3px)" : "translateY(0)",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -16,
          right: -10,
          fontSize: 56,
          opacity: 0.08,
          userSelect: "none",
          transition: "opacity 0.25s",
          ...(hovered && { opacity: 0.15 }),
        }}
      >
        {icon}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${accent}18`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <p
        style={{
          fontSize: 30,
          fontWeight: 900,
          color: "#111827",
          lineHeight: 1,
          margin: "0 0 6px",
        }}
      >
        <CountUp n={value} delay={delay} />
      </p>
      <p style={{ fontSize: 12, color: accent, fontWeight: 600, margin: 0 }}>
        {sub}
      </p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"map" | "books" | "stats" | "users">("map");
  const [dashboardBusy, setDashboardBusy] = useState(false);

  const [usersRes, setUsersRes] = useState<AdminUsersResponse | null>(null);
  const [usersQ, setUsersQ] = useState("");
  const [usersBusy, setUsersBusy] = useState(false);
  const [usersErr, setUsersErr] = useState("");

  const [booksRes, setBooksRes] = useState<AdminBooksResponse | null>(null);
  const [booksQ, setBooksQ] = useState("");
  const [booksBusy, setBooksBusy] = useState(false);
  const [booksErr, setBooksErr] = useState("");

  const normalizeDashboard = (raw: any): DashboardResponse => ({
    ...raw,
    usersMap: raw?.usersMap || [],
    recentBooks: raw?.recentBooks || [],
    borrowsByStatus: raw?.borrowsByStatus || [],
  });

  const loadDashboard = async (params?: {
    includeMap?: boolean;
    includeRecent?: boolean;
    includeStats?: boolean;
  }) => {
    setDashboardBusy(true);
    try {
      const res = await api.get("/admin/dashboard", { params });
      setData((prev) => normalizeDashboard({ ...(prev || {}), ...res.data }));
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "Sizda admin ruxsati yo'q."
          : "Xatolik yuz berdi.",
      );
    } finally {
      setDashboardBusy(false);
    }
  };

  useEffect(() => {
    loadDashboard().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUsers = async (next?: { q?: string; skip?: number }) => {
    setUsersErr("");
    setUsersBusy(true);
    try {
      const q = (next?.q ?? usersQ).trim();
      const skip = next?.skip ?? 0;
      const res = await api.get("/admin/users", {
        params: { q: q || undefined, take: 30, skip },
      });
      setUsersRes(res.data);
    } catch (e: any) {
      setUsersErr(
        e?.response?.status === 403
          ? "Sizda admin ruxsati yo'q."
          : "Foydalanuvchilarni yuklashda xatolik.",
      );
    } finally {
      setUsersBusy(false);
    }
  };

  const loadBooks = async (next?: { q?: string; skip?: number }) => {
    setBooksErr("");
    setBooksBusy(true);
    try {
      const q = (next?.q ?? booksQ).trim();
      const skip = next?.skip ?? 0;
      const res = await api.get("/admin/books", {
        params: { q: q || undefined, take: 30, skip },
      });
      setBooksRes(res.data);
    } catch (e: any) {
      setBooksErr(
        e?.response?.status === 403
          ? "Sizda admin ruxsati yo'q."
          : "Kitoblarni yuklashda xatolik.",
      );
    } finally {
      setBooksBusy(false);
    }
  };

  useEffect(() => {
    if (tab === "users" && !usersRes && !usersBusy) loadUsers();
    if (tab === "books" && !booksRes && !booksBusy) loadBooks();
    if (tab === "map" && data && data.usersMap.length === 0 && !dashboardBusy) {
      loadDashboard({ includeMap: true });
    }
    if (tab === "books" && data && data.recentBooks.length === 0 && !dashboardBusy) {
      loadDashboard({ includeRecent: true });
    }
    if (tab === "stats" && data && data.borrowsByStatus.length === 0 && !dashboardBusy) {
      loadDashboard({ includeStats: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data, dashboardBusy]);

  useEffect(() => {
    if (tab !== "users") return;
    const t = window.setTimeout(() => {
      loadUsers({ q: usersQ, skip: 0 });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersQ, tab]);

  useEffect(() => {
    if (tab !== "books") return;
    const t = window.setTimeout(() => {
      loadBooks({ q: booksQ, skip: 0 });
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booksQ, tab]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!data?.usersMap?.length) return [41.2995, 69.2401];
    const first = data.usersMap.find((u) => u.latitude && u.longitude);
    return first?.latitude && first?.longitude
      ? [first.latitude, first.longitude]
      : [41.2995, 69.2401];
  }, [data]);

  if (loading)
    return (
      <div
        style={{
          minHeight: "calc(100vh - 4rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f9fafb",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              border: "3px solid #e5e7eb",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Yuklanmoqda...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );

  if (error || !data)
    return (
      <div
        style={{
          minHeight: "calc(100vh - 4rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#fff5f5",
            border: "1px solid #fecaca",
            borderRadius: 16,
            padding: "24px 32px",
            color: "#dc2626",
            fontSize: 15,
          }}
        >
          ⚠️ {error || "Ma'lumot topilmadi"}
        </div>
      </div>
    );

  const s = data.summary;
  const statCards = [
    {
      label: "Foydalanuvchilar",
      value: s.usersCount,
      sub: `+${s.newUsers7d} bu hafta`,
      icon: "👥",
      accent: "#6366f1",
    },
    {
      label: "Jami kitoblar",
      value: s.booksCount,
      sub: `${s.availableBooksCount} mavjud`,
      icon: "📚",
      accent: "#10b981",
    },
    {
      label: "Ijara so'rovlari",
      value: s.borrowRequestsCount,
      sub: `${s.pendingRequestsCount} kutilmoqda`,
      icon: "📨",
      accent: "#f59e0b",
    },
    {
      label: "Faol ijaralar",
      value: s.activeBorrowsCount,
      sub: `${s.borrowsCount} jami`,
      icon: "🔄",
      accent: "#3b82f6",
    },
    {
      label: "Tashriflar",
      value: s.realVisits || 0,
      sub: `${s.uniqueVisitors7d || 0} unik (7 kun)`,
      icon: "👁️",
      accent: "#8b5cf6",
    },
    {
      label: "Yangi (7 kun)",
      value: s.newUsers7d,
      sub: "So'nggi hafta",
      icon: "✨",
      accent: "#ec4899",
    },
  ];

  const tabs = [
    { id: "map", label: "🗺️ Xarita" },
    { id: "books", label: "📚 Kitoblar" },
    { id: "users", label: "👥 Userlar" },
    { id: "stats", label: "📊 Statistika" },
  ] as const;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 4rem)",
        background: "#f8f9fc",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes skeletonShimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .dash-card-enter { animation: fadeUp 0.5s cubic-bezier(0.4,0,0.2,1) both; }
        .leaflet-container { font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div
          className="dash-card-enter"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 32,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  borderRadius: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }}
              >
                ⚡
              </div>
              <div>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 900,
                    color: "#111827",
                    margin: 0,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Admin Panel
                </h1>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                  LiveLibrary boshqaruv markazi
                </p>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#fff",
              border: "1.5px solid #e5e7eb",
              borderRadius: 12,
              padding: "8px 14px",
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 0 3px rgba(16,185,129,0.2)",
                animation: "spin 2s linear infinite",
              }}
            />
            <span style={{ fontSize: 12, color: "#6b7280" }}>
              {new Date(data.generatedAt).toLocaleString("uz-UZ", {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Stat Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {statCards.map((card, i) => (
            <div
              key={card.label}
              className="dash-card-enter"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <StatCard {...card} delay={i * 80} />
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="dash-card-enter"
          style={{
            animationDelay: "400ms",
            background: "#fff",
            borderRadius: 24,
            border: "1.5px solid #f0f0f0",
            overflow: "hidden",
            boxShadow: "0 2px 16px rgba(0,0,0,0.05)",
          }}
        >
          {/* Tab Bar */}
          <div
            style={{
              display: "flex",
              borderBottom: "1.5px solid #f3f4f6",
              padding: "4px 20px 0",
              gap: 4,
            }}
          >
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "12px 18px",
                  fontSize: 14,
                  fontWeight: tab === t.id ? 700 : 500,
                  color: tab === t.id ? "#6366f1" : "#6b7280",
                  background: "none",
                  border: "none",
                  borderBottom:
                    tab === t.id
                      ? "2.5px solid #6366f1"
                      : "2.5px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  marginBottom: -1.5,
                  borderRadius: "6px 6px 0 0",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 24 }}>
            {/* MAP TAB */}
            {tab === "map" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#111827",
                        margin: "0 0 2px",
                      }}
                    >
                      Foydalanuvchilar xaritasi
                    </h2>
                    <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                      {
                        data.usersMap.filter((u) => u.latitude && u.longitude)
                          .length
                      }{" "}
                      ta joylashuv ko'rsatilmoqda
                    </p>
                  </div>
                  <div
                    style={{
                      background: "rgba(99,102,241,0.08)",
                      color: "#6366f1",
                      fontSize: 13,
                      fontWeight: 600,
                      padding: "6px 14px",
                      borderRadius: 99,
                    }}
                  >
                    📍{" "}
                    {
                      data.usersMap.filter((u) => u.latitude && u.longitude)
                        .length
                    }{" "}
                    user
                  </div>
                </div>
                <div
                  style={{
                    borderRadius: 16,
                    overflow: "hidden",
                    height: 480,
                    border: "1.5px solid #f0f0f0",
                    position: "relative",
                  }}
                >
                  {dashboardBusy && data.usersMap.length === 0 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255,255,255,0.72)",
                        backdropFilter: "blur(1px)",
                        zIndex: 500,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#6b7280",
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Xarita ma'lumotlari yuklanmoqda...
                    </div>
                  )}
                  <MapContainer
                    center={mapCenter}
                    zoom={11}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <FixLeafletSize />
                    {data.usersMap
                      .filter((u) => u.latitude && u.longitude)
                      .map((u) => (
                        <Marker
                          key={u.id}
                          position={[u.latitude!, u.longitude!]}
                          icon={ownerIcon}
                        >
                          <Popup>
                            <div style={{ minWidth: 150 }}>
                              <p
                                style={{
                                  fontWeight: 700,
                                  margin: "0 0 4px",
                                  fontSize: 14,
                                }}
                              >
                                {u.fullName}
                              </p>
                              <p
                                style={{
                                  margin: "0 0 4px",
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                📍 {u.city || "Shahar ko'rsatilmagan"}
                              </p>
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 12,
                                  color: "#6366f1",
                                  fontWeight: 600,
                                }}
                              >
                                📚 {u.booksCount} ta kitob
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                  </MapContainer>
                </div>
              </div>
            )}

            {/* BOOKS TAB */}
            {tab === "books" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 20,
                    marginBottom: 24,
                  }}
                >
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: 16,
                      padding: 20,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#374151",
                        marginBottom: 16,
                        margin: "0 0 16px",
                      }}
                    >
                      📊 Kitoblar holati
                    </h3>
                    <BarChart
                      available={s.availableBooksCount}
                      total={s.booksCount}
                    />
                  </div>
                  <div
                    style={{
                      background: "#f9fafb",
                      borderRadius: 16,
                      padding: 20,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#374151",
                        margin: "0 0 16px",
                      }}
                    >
                      📈 Umumiy ko'rsatkichlar
                    </h3>
                    {[
                      {
                        label: "Jami kitoblar",
                        value: s.booksCount,
                        color: "#6366f1",
                      },
                      {
                        label: "Mavjud",
                        value: s.availableBooksCount,
                        color: "#10b981",
                      },
                      {
                        label: "Ijarada",
                        value: s.booksCount - s.availableBooksCount,
                        color: "#3b82f6",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 0",
                          borderBottom: "1px solid #e5e7eb",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: item.color,
                            }}
                          />
                          <span style={{ fontSize: 13, color: "#374151" }}>
                            {item.label}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: item.color,
                          }}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: "#111827",
                    margin: "0 0 14px",
                  }}
                >
                  So'nggi qo'shilgan kitoblar
                </h3>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))",
                    gap: 12,
                  }}
                >
                  {data.recentBooks.map((b, i) => {
                    const st = BOOK_STATUS[b.status] || {
                      label: b.status,
                      dot: "#9ca3af",
                    };
                    return (
                      <div
                        key={b.id}
                        className="dash-card-enter"
                        style={{
                          animationDelay: `${i * 50}ms`,
                          background: "#fff",
                          border: "1.5px solid #f0f0f0",
                          borderRadius: 16,
                          padding: "14px 16px",
                          transition: "box-shadow 0.2s, border-color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            "0 4px 20px rgba(0,0,0,0.08)";
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.borderColor = "#e0e7ff";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.boxShadow =
                            "none";
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.borderColor = "#f0f0f0";
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ flex: 1, marginRight: 8 }}>
                            <p
                              style={{
                                fontWeight: 700,
                                fontSize: 14,
                                color: "#111827",
                                margin: "0 0 2px",
                                lineHeight: 1.3,
                              }}
                            >
                              {b.title}
                            </p>
                            <p
                              style={{
                                fontSize: 12,
                                color: "#6b7280",
                                margin: 0,
                              }}
                            >
                              {b.author}
                            </p>
                          </div>
                          <span
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              color: st.dot,
                              background: `${st.dot}15`,
                              padding: "3px 8px",
                              borderRadius: 99,
                              flexShrink: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: st.dot,
                                display: "inline-block",
                              }}
                            />
                            {st.label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 11,
                            color: "#9ca3af",
                          }}
                        >
                          <span>👤 {b.owner.fullName}</span>
                          {b.city && <span>📍 {b.city}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 26 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 800,
                          color: "#111827",
                          margin: "0 0 2px",
                        }}
                      >
                        Moderatsiya (kitoblar)
                      </h3>
                      <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                        Hide/unhide qilish uchun qulay ro'yxat
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <input
                        value={booksQ}
                        onChange={(e) => setBooksQ(e.target.value)}
                        placeholder="Qidirish: nom, muallif, owner..."
                        style={{
                          height: 38,
                          minWidth: 240,
                          padding: "0 12px",
                          borderRadius: 12,
                          border: "1.5px solid #e5e7eb",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => loadBooks({ q: booksQ, skip: 0 })}
                        disabled={booksBusy}
                        style={{
                          height: 38,
                          padding: "0 14px",
                          borderRadius: 12,
                          border: "1.5px solid #e5e7eb",
                          background: "#fff",
                          cursor: booksBusy ? "not-allowed" : "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {booksBusy ? "Yuklanmoqda..." : "Qidirish"}
                      </button>
                    </div>
                  </div>

                  {booksErr && (
                    <div
                      style={{
                        background: "#fff5f5",
                        border: "1px solid #fecaca",
                        borderRadius: 14,
                        padding: "12px 14px",
                        color: "#dc2626",
                        fontSize: 13,
                        marginBottom: 12,
                      }}
                    >
                      ⚠️ {booksErr}
                    </div>
                  )}

                  <div
                    style={{
                      background: "#fff",
                      border: "1.5px solid #f0f0f0",
                      borderRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ overflowX: "auto" }}>
                    <div style={{ minWidth: 760 }}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr",
                        gap: 12,
                        padding: "12px 14px",
                        background: "#f9fafb",
                        borderBottom: "1px solid #f3f4f6",
                        fontSize: 12,
                        color: "#6b7280",
                        fontWeight: 700,
                      }}
                    >
                      <div>Kitob</div>
                      <div>Owner</div>
                      <div>Holat</div>
                      <div>Action</div>
                    </div>

                    {booksBusy && (booksRes?.items?.length || 0) === 0 && (
                      <TableSkeleton rows={5} columns={4} />
                    )}
                    {(booksRes?.items || []).map((b) => (
                      <div
                        key={b.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 0.9fr 0.9fr",
                          gap: 12,
                          padding: "12px 14px",
                          borderBottom: "1px solid #f3f4f6",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#111827",
                              lineHeight: 1.2,
                            }}
                          >
                            {b.title}
                          </div>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>
                            {b.author}
                            {b.city ? ` • ${b.city}` : ""}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: "#374151" }}>
                          <div style={{ fontWeight: 700 }}>{b.owner.fullName}</div>
                          <div style={{ color: "#9ca3af" }}>{b.owner.email}</div>
                        </div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          {b.isHidden ? "Yashirilgan" : "Ko'rinadi"}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            onClick={async () => {
                              try {
                                setBooksBusy(true);
                                const toastId = toast.loading(
                                  b.isHidden ? "Kitob ochilmoqda..." : "Kitob yashirilmoqda...",
                                );
                                if (b.isHidden) await api.patch(`/admin/books/${b.id}/unhide`);
                                else await api.patch(`/admin/books/${b.id}/hide`);
                                await loadBooks({ q: booksQ, skip: booksRes?.skip ?? 0 });
                                toast.success("Bajarildi", { id: toastId });
                              } catch {
                                setBooksErr("Action bajarilmadi. Migration tushganini tekshiring.");
                                toast.error("Action bajarilmadi");
                              } finally {
                                setBooksBusy(false);
                              }
                            }}
                            disabled={booksBusy}
                            style={{
                              height: 34,
                              padding: "0 12px",
                              borderRadius: 10,
                              border: "1.5px solid",
                              borderColor: b.isHidden ? "#d1fae5" : "#fee2e2",
                              background: b.isHidden ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                              color: b.isHidden ? "#065f46" : "#991b1b",
                              fontWeight: 800,
                              cursor: booksBusy ? "not-allowed" : "pointer",
                            }}
                          >
                            {b.isHidden ? "Unhide" : "Hide"}
                          </button>
                          <button
                            onClick={async () => {
                              const yes = window.confirm(
                                "Rostdan ham bu kitobni o'chirmoqchimisiz?",
                              );
                              if (!yes) return;
                              try {
                                setBooksBusy(true);
                                const toastId = toast.loading("Kitob o'chirilmoqda...");
                                await api.delete(`/admin/books/${b.id}`);
                                await loadBooks({ q: booksQ, skip: booksRes?.skip ?? 0 });
                                toast.success("Kitob o'chirildi", { id: toastId });
                              } catch {
                                setBooksErr("Delete bajarilmadi.");
                                toast.error("Delete bajarilmadi");
                              } finally {
                                setBooksBusy(false);
                              }
                            }}
                            disabled={booksBusy}
                            style={{
                              height: 34,
                              padding: "0 12px",
                              borderRadius: 10,
                              border: "1.5px solid #fecaca",
                              background: "rgba(239,68,68,0.12)",
                              color: "#991b1b",
                              fontWeight: 800,
                              cursor: booksBusy ? "not-allowed" : "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}

                    {!booksBusy && (booksRes?.items?.length || 0) === 0 && (
                      <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>
                        Hech narsa topilmadi.
                      </div>
                    )}
                    </div>
                    </div>
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#6b7280" }}>
                      Jami: {booksRes?.total || 0} ta
                    </div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                    Sahifa{" "}
                    {Math.floor((booksRes?.skip || 0) / (booksRes?.take || 30)) + 1} /{" "}
                    {Math.max(
                      1,
                      Math.ceil((booksRes?.total || 0) / (booksRes?.take || 30)),
                    )}
                  </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        disabled={booksBusy || (booksRes?.skip || 0) <= 0}
                        onClick={() =>
                          loadBooks({
                            q: booksQ,
                            skip: Math.max((booksRes?.skip || 0) - (booksRes?.take || 30), 0),
                          })
                        }
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1.5px solid #e5e7eb",
                          background: "#fff",
                          cursor: booksBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        Oldingi
                      </button>
                      <button
                        disabled={
                          booksBusy ||
                          (booksRes?.skip || 0) + (booksRes?.take || 30) >=
                            (booksRes?.total || 0)
                        }
                        onClick={() =>
                          loadBooks({
                            q: booksQ,
                            skip: (booksRes?.skip || 0) + (booksRes?.take || 30),
                          })
                        }
                        style={{
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1.5px solid #e5e7eb",
                          background: "#fff",
                          cursor: booksBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        Keyingi
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* USERS TAB */}
            {tab === "users" && (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <h2
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: "#111827",
                        margin: "0 0 2px",
                      }}
                    >
                      Foydalanuvchilar boshqaruvi
                    </h2>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      value={usersQ}
                      onChange={(e) => setUsersQ(e.target.value)}
                      placeholder="Qidirish: ism, email, city, @username..."
                      style={{
                        height: 38,
                        minWidth: 260,
                        padding: "0 12px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        outline: "none",
                      }}
                    />
                    <button
                      onClick={() => loadUsers({ q: usersQ, skip: 0 })}
                      disabled={usersBusy}
                      style={{
                        height: 38,
                        padding: "0 14px",
                        borderRadius: 12,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        cursor: usersBusy ? "not-allowed" : "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {usersBusy ? "Yuklanmoqda..." : "Qidirish"}
                    </button>
                  </div>
                </div>

                {usersErr && (
                  <div
                    style={{
                      background: "#fff5f5",
                      border: "1px solid #fecaca",
                      borderRadius: 14,
                      padding: "12px 14px",
                      color: "#dc2626",
                      fontSize: 13,
                      marginBottom: 12,
                    }}
                  >
                    ⚠️ {usersErr}
                  </div>
                )}

                <div
                  style={{
                    background: "#fff",
                    border: "1.5px solid #f0f0f0",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ overflowX: "auto" }}>
                  <div style={{ minWidth: 760 }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 0.8fr 0.8fr",
                      gap: 12,
                      padding: "12px 14px",
                      background: "#f9fafb",
                      borderBottom: "1px solid #f3f4f6",
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: 700,
                    }}
                  >
                    <div>User</div>
                    <div>Aloqa</div>
                    <div>Status</div>
                    <div>Action</div>
                  </div>

                  {usersBusy && (usersRes?.items?.length || 0) === 0 && (
                    <TableSkeleton rows={5} columns={4} />
                  )}
                  {(usersRes?.items || []).map((u) => (
                    <div
                      key={u.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr 0.8fr 0.8fr",
                        gap: 12,
                        padding: "12px 14px",
                        borderBottom: "1px solid #f3f4f6",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>
                          {u.fullName}
                        </div>
                        <div style={{ fontSize: 12, color: "#9ca3af" }}>
                          {u.email}
                          {u.city ? ` • ${u.city}` : ""}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#374151" }}>
                        <div style={{ fontWeight: 700 }}>
                          {u.telegramUsername ? `@${u.telegramUsername}` : "—"}
                        </div>
                        <div style={{ color: "#6b7280" }}>
                          {u.phone || "Telefon yo'q"}
                        </div>
                        <div style={{ color: "#6b7280" }}>
                          Chat ID: {u.telegramChatId ?? "—"}
                        </div>
                        <div style={{ color: "#9ca3af" }}>
                          {u.telegramVerifiedAt
                            ? new Date(u.telegramVerifiedAt).toLocaleString("uz-UZ")
                            : "Tasdiqlanmagan"}
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>
                        {u.isBlocked ? "Bloklangan" : "Faol"}
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={async () => {
                            try {
                              setUsersBusy(true);
                              const toastId = toast.loading(
                                u.isBlocked ? "User ochilmoqda..." : "User bloklanmoqda...",
                              );
                              if (u.isBlocked)
                                await api.patch(`/admin/users/${u.id}/unblock`);
                              else await api.patch(`/admin/users/${u.id}/block`);
                              await loadUsers({ q: usersQ, skip: usersRes?.skip ?? 0 });
                              toast.success("Bajarildi", { id: toastId });
                            } catch {
                              setUsersErr("Action bajarilmadi. Migration tushganini tekshiring.");
                              toast.error("Action bajarilmadi");
                            } finally {
                              setUsersBusy(false);
                            }
                          }}
                          disabled={usersBusy}
                          style={{
                            height: 34,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1.5px solid",
                            borderColor: u.isBlocked ? "#d1fae5" : "#fee2e2",
                            background: u.isBlocked
                              ? "rgba(16,185,129,0.08)"
                              : "rgba(239,68,68,0.08)",
                            color: u.isBlocked ? "#065f46" : "#991b1b",
                            fontWeight: 800,
                            cursor: usersBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          {u.isBlocked ? "Unblock" : "Block"}
                        </button>
                        <button
                          onClick={async () => {
                            const yes = window.confirm(
                              "Rostdan ham bu userni o'chirmoqchimisiz? Bog'liq ma'lumotlar ham o'chiriladi.",
                            );
                            if (!yes) return;
                            try {
                              setUsersBusy(true);
                              const toastId = toast.loading("User o'chirilmoqda...");
                              await api.delete(`/admin/users/${u.id}`);
                              await loadUsers({ q: usersQ, skip: usersRes?.skip ?? 0 });
                              toast.success("User o'chirildi", { id: toastId });
                            } catch (e: any) {
                              const msg =
                                e?.response?.data?.message || "Delete bajarilmadi.";
                              setUsersErr(typeof msg === "string" ? msg : "Delete bajarilmadi.");
                              toast.error(typeof msg === "string" ? msg : "Delete bajarilmadi.");
                            } finally {
                              setUsersBusy(false);
                            }
                          }}
                          disabled={usersBusy}
                          style={{
                            height: 34,
                            padding: "0 12px",
                            borderRadius: 10,
                            border: "1.5px solid #fecaca",
                            background: "rgba(239,68,68,0.12)",
                            color: "#991b1b",
                            fontWeight: 800,
                            cursor: usersBusy ? "not-allowed" : "pointer",
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}

                  {!usersBusy && (usersRes?.items?.length || 0) === 0 && (
                    <div style={{ padding: 16, color: "#9ca3af", fontSize: 13 }}>
                      Hech narsa topilmadi.
                    </div>
                  )}
                  </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Jami: {usersRes?.total || 0} ta
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>
                    Sahifa{" "}
                    {Math.floor((usersRes?.skip || 0) / (usersRes?.take || 30)) + 1} /{" "}
                    {Math.max(
                      1,
                      Math.ceil((usersRes?.total || 0) / (usersRes?.take || 30)),
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      disabled={usersBusy || (usersRes?.skip || 0) <= 0}
                      onClick={() =>
                        loadUsers({
                          q: usersQ,
                          skip: Math.max((usersRes?.skip || 0) - (usersRes?.take || 30), 0),
                        })
                      }
                      style={{
                        height: 34,
                        padding: "0 10px",
                        borderRadius: 10,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        cursor: usersBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      Oldingi
                    </button>
                    <button
                      disabled={
                        usersBusy ||
                        (usersRes?.skip || 0) + (usersRes?.take || 30) >=
                          (usersRes?.total || 0)
                      }
                      onClick={() =>
                        loadUsers({
                          q: usersQ,
                          skip: (usersRes?.skip || 0) + (usersRes?.take || 30),
                        })
                      }
                      style={{
                        height: 34,
                        padding: "0 10px",
                        borderRadius: 10,
                        border: "1.5px solid #e5e7eb",
                        background: "#fff",
                        cursor: usersBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      Keyingi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* STATS TAB */}
            {tab === "stats" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 24,
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                      margin: "0 0 20px",
                    }}
                  >
                    Ijara holatlari
                  </h3>
                  <DonutChart data={data.borrowsByStatus} />
                </div>

                <div>
                  <h3
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#111827",
                      margin: "0 0 20px",
                    }}
                  >
                    Faollik ko'rsatkichlari
                  </h3>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        label: "So'rov qabul qilish foizi",
                        value: s.borrowsCount,
                        total: s.borrowRequestsCount,
                        color: "#10b981",
                      },
                      {
                        label: "Kitob mavjudlik foizi",
                        value: s.availableBooksCount,
                        total: s.booksCount,
                        color: "#6366f1",
                      },
                      {
                        label: "Faol ijara foizi",
                        value: s.activeBorrowsCount,
                        total: s.borrowsCount,
                        color: "#f59e0b",
                      },
                    ].map((item, i) => {
                      const pct =
                        item.total > 0
                          ? Math.round((item.value / item.total) * 100)
                          : 0;
                      return (
                        <ProgressRow
                          key={i}
                          label={item.label}
                          pct={pct}
                          color={item.color}
                          value={item.value}
                          total={item.total}
                          delay={i * 150}
                        />
                      );
                    })}
                  </div>

                  <div
                    style={{
                      marginTop: 24,
                      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                      borderRadius: 18,
                      padding: "20px 22px",
                      color: "#fff",
                    }}
                  >
                    <p
                      style={{ fontSize: 12, opacity: 0.8, margin: "0 0 6px" }}
                    >
                      Umumiy platforma faolligi
                    </p>
                    <p
                      style={{
                        fontSize: 32,
                        fontWeight: 900,
                        margin: "0 0 4px",
                      }}
                    >
                      <CountUp n={s.realVisits || 0} delay={200} />
                    </p>
                    <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
                      real tashriflar soni
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressRow({
  label,
  pct,
  color,
  value,
  total,
  delay,
}: {
  label: string;
  pct: number;
  color: string;
  value: number;
  total: number;
  delay: number;
}) {
  const [anim, setAnim] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnim(true), delay + 300);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div
      style={{ background: "#f9fafb", borderRadius: 14, padding: "14px 16px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#9ca3af" }}>
            {value}/{total}
          </span>
          <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
        </div>
      </div>
      <div
        style={{
          height: 8,
          background: "#e5e7eb",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: anim ? `${pct}%` : "0%",
            background: color,
            borderRadius: 99,
            transition: "width 1.2s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
    </div>
  );
}

function TableSkeleton({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 12,
            padding: "12px 14px",
            borderBottom: "1px solid #f3f4f6",
          }}
        >
          {Array.from({ length: columns }).map((__, ci) => (
            <div
              key={ci}
              style={{
                height: 14,
                borderRadius: 8,
                background:
                  "linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%)",
                backgroundSize: "200% 100%",
                animation: "skeletonShimmer 1.2s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ))}
    </>
  );
}
