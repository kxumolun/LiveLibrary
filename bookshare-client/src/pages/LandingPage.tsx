import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import api from "../api/axios";

type PublicStats = {
  activeBooks: number;
  users: number;
  completedBorrows: number;
};

const FALLBACK_STATS = {
  activeBooks: 500,
  users: 1200,
  completedBorrows: 300,
};

const REAL_STATS_THRESHOLD_RATIO = 0.95;

function AnimatedCount({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Math.max(0, Math.floor(value));
    const duration = 1200;

    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const next = Math.floor(from + (to - from) * eased);
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display.toLocaleString("uz-UZ")}</>;
}

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const supportUrl = (import.meta.env.VITE_SUPPORT_URL || "").trim();
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    const cacheKey = "landing:public-stats:v1";
    const cachedRaw = sessionStorage.getItem(cacheKey);
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { at: number; data: PublicStats };
        if (Date.now() - cached.at < 60_000) setStats(cached.data);
      } catch {}
    }
    api
      .get("/analytics/public-stats")
      .then((res) => {
        const data = res.data as PublicStats;
        setStats(data);
        sessionStorage.setItem(
          cacheKey,
          JSON.stringify({ at: Date.now(), data }),
        );
      })
      .catch(() => {});
  }, []);

  const statCards = useMemo(() => {
    const rows = [
      {
        key: "activeBooks",
        label: "Faol kitob",
        real: stats?.activeBooks ?? 0,
        fallback: FALLBACK_STATS.activeBooks,
      },
      {
        key: "users",
        label: "Foydalanuvchi",
        real: stats?.users ?? 0,
        fallback: FALLBACK_STATS.users,
      },
      {
        key: "completedBorrows",
        label: "Muvaffaqiyatli ijara",
        real: stats?.completedBorrows ?? 0,
        fallback: FALLBACK_STATS.completedBorrows,
      },
    ] as const;

    return rows.map((r) => {
      const threshold = Math.floor(r.fallback * REAL_STATS_THRESHOLD_RATIO);
      const showReal = r.real >= threshold;
      return {
        key: r.key,
        label: r.label,
        showReal,
        value: showReal ? r.real : r.fallback,
      };
    });
  }, [stats]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white py-16 sm:py-24">
        <div className="container-app text-center">
          <span className="inline-block bg-yellow-400/95 text-yellow-950 text-xs sm:text-sm font-semibold px-4 py-1 rounded-full mb-6">
            O'zbekistondagi birinchi kitob ijarasi platformasi
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight mb-5 tracking-tight">
            Kitoblarni <span className="text-yellow-400">ulash</span>,<br />
            bilimni <span className="text-yellow-400">o'rtoqlash</span>
          </h1>
          <p className="text-base sm:text-lg text-blue-100/90 max-w-2xl mx-auto mb-8 sm:mb-10">
            Uyingizda changyutayotgan kitoblarni boshqalarga bering, o'qimoqchi
            bo'lgan kitoblarni atrofingizdagi odamlardan ijaraga oling.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            {user ? (
              <>
                <Link
                  to="/my-books"
                  className="bg-yellow-400 text-yellow-950 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition"
                >
                  Mening kitoblarim
                </Link>
                <Link
                  to="/map"
                  className="border border-white/80 text-white font-bold px-8 py-3 rounded-xl hover:bg-white hover:text-[#1e3a5f] transition"
                >
                  Xarita
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/books"
                  className="bg-yellow-400 text-yellow-950 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition"
                >
                  Kitoblarni ko'rish
                </Link>
                <Link
                  to="/register"
                  className="border border-white/80 text-white font-bold px-8 py-3 rounded-xl hover:bg-white hover:text-[#1e3a5f] transition"
                >
                  Ro'yxatdan o'tish
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-[#f8fafc] py-12 sm:py-16">
        <div className="container-app grid grid-cols-3 gap-4 sm:gap-8 text-center">
          {statCards.map((stat) => (
            <div key={stat.key}>
              <p className="text-2xl sm:text-4xl font-extrabold text-[#1e3a5f]">
                <AnimatedCount value={stat.value} />
                {!stat.showReal && "+"}
              </p>
              <p className="text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20">
        <div className="container-app">
          <h2 className="text-3xl font-extrabold text-center text-[#1e3a5f] mb-12">
            Qanday ishlaydi?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "01",
                title: "Ro'yxatdan o'ting",
                desc: "Profil oching (ism, telefon) va xohlasangiz shaharni yozing.",
                icon: "👤",
              },
              {
                step: "02",
                title: "Kitob toping yoki joylashtiring",
                desc: "Kitoblarni qidiring yoki o'zingizning kitobingizni joylang.",
                icon: "📚",
              },
              {
                step: "03",
                title: "Ijaraga oling va o'qing",
                desc: "So'rov yuboring, kelishib oling va kitobni olib o'qing.",
                icon: "🤝",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl mb-4">{item.icon}</div>
                <span className="text-yellow-500 font-bold text-sm">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-[#1e3a5f] mt-1 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/60">
              <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                Ijara qanday bo'ladi?
              </h3>
              <ol className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">1.</span>
                  <span>
                    <span className="font-semibold">Oluvchi</span> kitobni
                    tanlaydi va “Ijaraga olish” so‘rovini yuboradi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">2.</span>
                  <span>
                    <span className="font-semibold">Ega</span> so‘rovni qabul
                    yoki rad qiladi. Qabul bo‘lsa, chat orqali uchrashuv
                    kelishiladi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">3.</span>
                  <span>
                    So'rov qabul qilingach, <span className="font-semibold">egada tasdiqlash kodi </span>
                     chiqadi. Uchrashuvda kodni egasi oluvchining telefonidagi
                    akkauntga o'zi kiritadi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">4.</span>
                  <span>
                    Kod to‘g‘ri bo‘lsa, kitob holati “Ijarada”ga o‘tadi va
                    muddat hisoblanadi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">5.</span>
                  <span>
                    Qaytarish paytida esa <span className="font-semibold">oluvchida tasdiqlash kodi </span>
                    chiqadi. Uchrashuvda egasi bu kodni oluvchining akkauntidan
                    o'zi kiritadi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">6.</span>
                  <span>
                    Kod tasdiqlansa, kitob holati “Qaytarilgan” bo‘ladi va
                    egasiga qaytadi.
                  </span>
                </li>
              </ol>
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="font-semibold">ℹ️ Muhim eslatma</p>
                <p className="mt-1">
                  Tasdiqlash kodini hech kimga aytmang. Kodni faqat uchrashuv
                  paytida, qarshi tomonning o'z telefonida o'zingiz kiriting.
                </p>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <Link to="/books" className="btn-primary">
                  Kitoblarni ko‘rish
                </Link>
                <Link to="/map" className="btn-ghost border border-surface-200">
                  Xaritadan qidirish
                </Link>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 ring-1 ring-slate-200/60">
              <h3 className="text-lg font-extrabold text-slate-900 mb-3">
                Kechiktirish bo‘lsa nima bo‘ladi?
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Muddat o'tsa, ijara holati <span className="font-semibold">muddati o'tgan </span>
                    bo‘ladi va ikkala tomonda ham ogohlantirish chiqadi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Chat ochiq qoladi — tomonlar tezroq uchrashib qaytarishni
                    yakunlashi mumkin.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Ega muddati o'tgan ijarada oluvchining telefonini ko'rib,
                    bevosita bog‘lana oladi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Uchrashgach, qaytarish tasdiqlash kodi tekshiriladi va kitob egasiga
                    rasmiy qaytgan deb belgilanadi.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70 p-5 sm:p-6">
            <p className="text-xs sm:text-sm font-bold tracking-wide text-amber-700 uppercase">
              Nega bu muhim?
            </p>
            <h3 className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">
              Nega men kitobimni boshqalarga berishim kerak?
            </h3>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Uyingizda shunchaki turgan kitob kimningdir ayni damdagi eng zarur
              yo'l ko'rsatkichiga aylanishi mumkin. Balki u inson hozir hayotidagi
              muhim qaror oldida turgandir va aynan sizdagi kitob unga yo'nalish
              berar.
            </p>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Kitob ulashish bilan siz nafaqat yaxshilik qilasiz, balki bilimni
              yoyishga ham hissa qo'shasiz. Bir kichik qadam bilan kimningdir
              dunyoqarashi yoki kelajagi yaxshi tomonga o'zgarishi mumkin.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 sm:p-6">
            <h3 className="text-base sm:text-lg font-extrabold text-rose-900">
              Muhim qoidalar: kitob omonat
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-rose-900/90 leading-relaxed">
              <li>• Kitobni buklash, yirtish, ichiga yozish yoki marker bilan chizish mumkin emas.</li>
              <li>• Sahifalarni burab belgilamang; zakladka (belgi qog'oz) ishlating.</li>
              <li>• Kitobni namlikdan, ovqat/ichimlikdan va bolalar qo'lidan ehtiyot qiling.</li>
              <li>• Muqova yoki sahifaga zarar yetgan bo'lsa, egasini darhol xabardor qiling.</li>
              <li>• Ijaraga olingan kitobni kelishilgan hududdan tashqariga (boshqa viloyatga) olib chiqish mumkin emas.</li>
              <li>• Kitobni belgilangan muddatda qaytaring; ulgurmasangiz oldindan sababini yozib egasi bilan kelishing.</li>
              <li>• Kitobni uchinchi shaxsga bermang — uni faqat ijaraga olgan akkaunt egasi ishlatadi.</li>
            </ul>
            <p className="mt-3 text-xs text-rose-800">
              Shu qoidalarga rioya qilish platformadagi ishonchni saqlaydi. Qoidabuzarlik takrorlansa akkauntga cheklov qo'yilishi mumkin.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f8fafc] py-14 sm:py-20">
        <div className="container-app">
          <h2 className="text-3xl font-extrabold text-center text-[#1e3a5f] mb-12">
            Nima uchun Jonli kutubxona?
          </h2>
          <p className="text-center text-slate-600 max-w-3xl mx-auto -mt-6 mb-10">
            Jonli kutubxona shunchaki kitob topish joyi emas. Bu yerda ishonch,
            tartib va bilim ulashish madaniyati bir tizimda ishlaydi.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "🗺️",
                title: "Xaritadan topish",
                desc: "Yaqin atrofdagi kitoblarni xaritada ko'rib, eng qulay uchrashuv nuqtasini tanlaysiz.",
              },
              {
                icon: "💬",
                title: "Xabar orqali kelishish",
                desc: "So'rov qabul qilingach yozishma ochiladi, vaqt va joyni aniq kelishib olasiz.",
              },
              {
                icon: "🔐",
                title: "Tasdiqlash kodi bilan xavfsiz topshirish",
                desc: "Topshirish va qaytarish maxsus kod orqali tasdiqlanadi, bu 'berdim-oldim' jarayonini adolatli qiladi.",
              },
              {
                icon: "⚡",
                title: "Tezkor so‘rov",
                desc: "Bir necha bosishda so'rov yuborasiz, javob kelishi bilan jarayonni davom ettirasiz.",
              },
              {
                icon: "⏱️",
                title: "Muddat nazorati",
                desc: "Qaytarish sanasi aniq ko'rsatiladi. Kechikish bo'lsa tizim ogohlantiradi va mas'uliyatni oshiradi.",
              },
              {
                icon: "📣",
                title: "Telegram eslatmalari",
                desc: "Muhim holatlarda Telegram orqali eslatma keladi, shuning uchun jarayonni unutib qo'ymaysiz.",
              },
              {
                icon: "📊",
                title: "Shaffof ko'rsatkichlar",
                desc: "Faol kitoblar, foydalanuvchilar va muvaffaqiyatli ijaralar soni ko'rinib turadi.",
              },
              {
                icon: "🤝",
                title: "Hamjamiyatga foyda",
                desc: "Uyda chang bosib turgan kitob boshqa odam uchun hayotni o'zgartiradigan manbaga aylanishi mumkin.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 bg-white rounded-xl p-6 shadow-sm ring-1 ring-slate-200/60"
              >
                <span className="text-3xl">{f.icon}</span>
                <div>
                  <h3 className="font-bold text-[#1e3a5f] text-lg">
                    {f.title}
                  </h3>
                  <p className="text-gray-500 mt-1">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="container-app max-w-4xl">
          <h2 className="text-3xl font-extrabold text-center text-[#1e3a5f] mb-3">
            Tez-tez so'raladigan savollar
          </h2>
          <p className="text-center text-slate-600 mb-10">
            Jonli kutubxona bo'yicha eng ko'p beriladigan savollarga qisqa javoblar.
          </p>

          <div className="space-y-3">
            {[
              {
                q: "Kitob olish pullikmi?",
                a: "Yo'q. Platformadan foydalanish bepul. Har bir ijara foydalanuvchilar o'rtasidagi kelishuv asosida amalga oshadi.",
              },
              {
                q: "Kitobni qanday olaman?",
                a: "Kitobni tanlaysiz, so'rov yuborasiz. Ega qabul qilsa, chatda uchrashuvni kelishasiz va tasdiqlash kodi bilan topshirish yakunlanadi.",
              },
              {
                q: "Tasdiqlash kodi nima uchun kerak?",
                a: "Topshirish va qaytarish haqiqatda bo'lganini ikki tomonda ham tasdiqlash uchun. Kodni hech kimga bermasdan, uchrashuvda o'zingiz kiriting.",
              },
              {
                q: "Muddatdan kechiksam nima bo'ladi?",
                a: "Ijara muddati o'tgan holatga o'tadi, sizga eslatma yuboriladi. Zarur bo'lsa, kechikish sababini egasiga yuborishingiz mumkin.",
              },
              {
                q: "Kitobga zarar yetsa-chi?",
                a: "Darhol egasini xabardor qiling. Kitob omonat hisoblanadi, ehtiyotkorlik va kelishuv bu yerda eng muhim tamoyil.",
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 bg-white p-4 open:shadow-sm"
              >
                <summary className="cursor-pointer list-none font-semibold text-slate-900 flex items-center justify-between gap-3">
                  <span>{item.q}</span>
                  <span className="text-slate-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Community Support */}
      <section className="py-14 sm:py-20 bg-[#f8fafc]">
        <div className="container-app">
          <h2 className="text-3xl font-extrabold text-center text-[#1e3a5f] mb-3">
            Hamjamiyatga hissa qo'shing
          </h2>
          <p className="text-center text-slate-600 max-w-3xl mx-auto mb-10">
            Jonli kutubxona foydalanuvchilar hisobiga o'sadi. Siz ham kichik
            qadamingiz bilan kimningdir o'qishiga sababchi bo'lishingiz mumkin.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-3xl mb-2">📚</p>
              <h3 className="text-lg font-extrabold text-slate-900">Kitob bilan hissa</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                O'qib bo'lgan foydali kitobingizni platformaga joylang. Sizga
                oddiy tuyulgan kitob boshqaga katta yo'l ochishi mumkin.
              </p>
              <div className="mt-4">
                <Link to={user ? "/my-books" : "/register"} className="btn-primary">
                  {user ? "Kitob qo'shish" : "Ro'yxatdan o'tish"}
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-3xl mb-2">🤝</p>
              <h3 className="text-lg font-extrabold text-slate-900">Madaniyatni qo'llab-quvvatlang</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Kitobni o'z vaqtida qaytarish, toza saqlash va kelishuvga amal
                qilish ham hamjamiyatga eng katta yordamdir.
              </p>
              <div className="mt-4">
                <Link to="/books" className="btn-ghost border border-surface-200">
                  Qoidalarga amal qilaman
                </Link>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-3xl mb-2">💡</p>
              <h3 className="text-lg font-extrabold text-slate-900">Taklif va support</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Xatolik yoki yaxshi g'oya bo'lsa, admin/support jamoasiga to'g'ridan-to'g'ri yozing.
                Sizning fikringiz platformani tezroq va qulayroq qiladi.
              </p>
              <div className="mt-4">
                {supportUrl ? (
                  <a
                    href={supportUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost border border-surface-200 inline-flex"
                  >
                    Admin bilan bog'lanish
                  </a>
                ) : (
                  <span className="inline-flex rounded-xl border border-surface-200 px-4 py-2 text-sm font-semibold text-surface-900/50 bg-surface-50 cursor-not-allowed">
                    Admin bilan bog'lanish (tez orada)
                  </span>
                )}
              </div>
              {!supportUrl && (
                <p className="mt-2 text-xs text-slate-500">
                  Eslatma: bu tugma ishlashi uchun frontend envga `VITE_SUPPORT_URL` qo'shiladi.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white py-14 sm:py-20 text-center">
        <div className="container-app">
          {user ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
                Menga kelgan so'rovlar
              </h2>
              <p className="text-blue-200 mb-8 text-lg">
                Sizga kelgan so‘rovlarni ko‘rib, qabul qilishingiz yoki rad etishingiz mumkin.
              </p>
              <Link
                to="/incoming"
                className="bg-yellow-400 text-yellow-900 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition"
              >
                Menga kelgan so'rovlar →
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
                Bugun boshlang!
              </h2>
              <p className="text-blue-200 mb-8 text-lg">
                Minglab kitob sevuvchilar allaqachon biz bilan.
              </p>
              <Link
                to="/register"
                className="bg-yellow-400 text-yellow-900 font-bold px-10 py-4 rounded-xl hover:bg-yellow-300 transition text-lg"
              >
                Bepul ro'yxatdan o'tish →
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        © 2026 Jonli kutubxona — Barcha huquqlar himoyalangan
      </footer>
    </div>
  );
}
