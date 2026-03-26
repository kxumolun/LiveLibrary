import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";

export default function Navbar() {
  const {
    user,
    logout,
    incomingCount,
    setIncomingCount,
    ownerPendingCount,
    setOwnerPendingCount,
    myBorrowsCount,
    setMyBorrowsCount,
    unreadCount,
    setUnreadCount,
  } = useAuthStore();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopMenuOpen, setDesktopMenuOpen] = useState(false);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const hasSectionAlerts =
    unreadCount > 0 || incomingCount > 0 || ownerPendingCount > 0 || myBorrowsCount > 0;
  const adminEmails = useMemo(
    () =>
      (import.meta.env.VITE_ADMIN_EMAILS || "")
        .split(",")
        .map((x: string) => x.trim().toLowerCase())
        .filter(Boolean),
    [],
  );
  const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());

  const authedLinks = useMemo(
    (): { to: string; label: string; badge?: number }[] => {
      const links = [
        { to: "/books", label: "Kitoblar" },
        { to: "/map", label: "Xarita" },
        { to: "/my-books", label: "Kitoblarim" },
        { to: "/my-requests", label: "So'rovlarim" },
        { to: "/my-borrows", label: "Ijaralarim", badge: myBorrowsCount },
        { to: "/conversations", label: "Xabarlar", badge: unreadCount },
        { to: "/incoming", label: "Qabul kutayotgan so'rovlar", badge: incomingCount },
        { to: "/owner-borrows", label: "Ijaraga berganlarim", badge: ownerPendingCount },
      ];
      // Admin linkni ro'yxatning yuqorisiga chiqarib, mobile’da ham oson topilsin.
      if (isAdmin) links.splice(2, 0, { to: "/admin", label: "Admin panel" });
      return links;
    },
    [incomingCount, isAdmin, myBorrowsCount, ownerPendingCount, unreadCount],
  );

  const publicLinks = useMemo(
    (): { to: string; label: string; badge?: number }[] => [
      { to: "/books", label: "Kitoblar" },
      { to: "/map", label: "Xarita" },
    ],
    [],
  );

  useEffect(() => {
    if (!user) return;
    let busy = false;
    const fetchCounts = async () => {
      if (document.visibilityState !== "visible") return;
      if (busy) return;
      busy = true;
      try {
        const res = await api.get("/borrows/navbar-counts");
        setIncomingCount(res.data.incomingCount || 0);
        setOwnerPendingCount(res.data.ownerPendingCount || 0);
        setMyBorrowsCount(res.data.myPendingCount || 0);
        setUnreadCount(res.data.unreadCount || 0);
      } finally {
        busy = false;
      }
    };
    fetchCounts();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchCounts();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(fetchCounts, 20000);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  useEffect(() => {
    setMobileOpen(false);
    setDesktopMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!desktopMenuRef.current) return;
      if (desktopMenuRef.current.contains(e.target as Node)) return;
      setDesktopMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200/70 bg-white/80 backdrop-blur">
      <nav className="container-app flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-base sm:text-lg font-extrabold tracking-tight text-primary-700"
          >
            Jonli kutubxona
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {(user ? authedLinks : publicLinks).slice(0, 2).map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`relative rounded-xl px-3 py-2 text-sm font-medium transition ${
                  location.pathname === l.to
                    ? "bg-surface-100 text-surface-900"
                    : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <div className="relative" ref={desktopMenuRef}>
                <button
                  type="button"
                  className={`btn-ghost relative ${
                    desktopMenuOpen ? "bg-surface-100" : ""
                  }`}
                  onClick={() => setDesktopMenuOpen((v) => !v)}
                  aria-label="Bo'limlar"
                  aria-expanded={desktopMenuOpen}
                >
                  Bo'limlar
                  <span className="text-surface-900/50">▾</span>
                  {hasSectionAlerts && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </button>

                {desktopMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white shadow-soft ring-1 ring-surface-200/60 overflow-hidden">
                    <div className="p-2 grid gap-1">
                      {authedLinks.slice(2).map((l) => (
                        <Link
                          key={l.to}
                          to={l.to}
                          className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                            location.pathname === l.to
                              ? "bg-surface-100 text-surface-900"
                              : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                          }`}
                        >
                          <span>{l.label}</span>
                          {!!l.badge && l.badge > 0 && (
                            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                              {l.badge}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-surface-200/70 p-2 grid gap-1">
                      <Link
                        to="/profile"
                        className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                          location.pathname === "/profile"
                            ? "bg-surface-100 text-surface-900"
                            : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                        }`}
                      >
                        Profil: {user.fullName}
                      </Link>
                      <button
                        onClick={logout}
                        className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition"
                      >
                        Chiqish
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <Link
                to="/conversations"
                className={`relative rounded-xl px-3 py-2 text-sm font-medium transition ${
                  location.pathname === "/conversations"
                    ? "bg-surface-100 text-surface-900"
                    : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                }`}
              >
                Xabarlar
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
              <Link
                to="/profile"
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  location.pathname === "/profile"
                    ? "bg-surface-100 text-surface-900"
                    : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                }`}
              >
                {user.fullName}
              </Link>
              <button onClick={logout} className="btn-ghost">
                Chiqish
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                Kirish
              </Link>
              <Link to="/register" className="btn-primary">
                Ro'yxatdan o'tish
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="md:hidden btn-ghost"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Menyuni yopish" : "Menyuni ochish"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-surface-200/70 bg-white">
          <div className="container-app py-3">
            <div className="grid gap-1">
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      key="__admin"
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                        location.pathname === "/admin"
                          ? "bg-surface-100 text-surface-900"
                          : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                      }`}
                    >
                      <span>Admin panel</span>
                    </Link>
                  )}
                  {authedLinks
                    .filter((l) => !isAdmin || l.to !== "/admin")
                    .map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                          location.pathname === l.to
                            ? "bg-surface-100 text-surface-900"
                            : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                        }`}
                      >
                        <span>{l.label}</span>
                        {!!l.badge && l.badge > 0 && (
                          <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                            {l.badge}
                          </span>
                        )}
                      </Link>
                    ))}
                </>
              ) : (
                publicLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${
                      location.pathname === l.to
                        ? "bg-surface-100 text-surface-900"
                        : "text-surface-900/70 hover:bg-surface-100 hover:text-surface-900"
                    }`}
                  >
                    <span>{l.label}</span>
                    {!!l.badge && l.badge > 0 && (
                      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-5 text-white">
                        {l.badge}
                      </span>
                    )}
                  </Link>
                ))
              )}
            </div>

            <div className="mt-3 grid gap-2 border-t border-surface-200/70 pt-3">
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="btn-ghost justify-start"
                  >
                    Profil: {user.fullName}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="btn-ghost justify-start text-red-600"
                  >
                    Chiqish
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn-ghost justify-start"
                  >
                    Kirish
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="btn-primary"
                  >
                    Ro'yxatdan o'tish
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
