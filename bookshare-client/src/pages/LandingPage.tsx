import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function LandingPage() {
  const user = useAuthStore((s) => s.user);
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
          {[
            { number: "500+", label: "Faol kitob" },
            { number: "1200+", label: "Foydalanuvchi" },
            { number: "300+", label: "Muvaffaqiyatli ijara" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-2xl sm:text-4xl font-extrabold text-[#1e3a5f]">
                {stat.number}
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
                Ijara qanday bo‘ladi?
              </h3>
              <ol className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">1.</span>
                  <span>
                    <span className="font-semibold">Kitobni tanlang</span> va
                    “Ijaraga olish”ni bosing.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">2.</span>
                  <span>
                    Egasi ko‘radi va javob beradi. Qabul bo‘lsa, xabar orqali
                    gaplashasiz.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">3.</span>
                  <span>
                    Qayerda uchrashishni kelishasiz va kitobni olib ketasiz.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold text-primary-700">4.</span>
                  <span>Muddat tugagach, kitobni qaytarasiz.</span>
                </li>
              </ol>
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
                Xarita bo‘yicha tiplar
              </h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    <span className="font-semibold">Radius</span>ni (100m–5km)
                    o‘zgartirib, yaqin kitoblarni tez toping.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Pin ustiga bosing — egasi va{" "}
                    <span className="font-semibold">mavjud</span> kitoblar
                    ro‘yxati chiqadi.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    Joylashuvni yoqmasangiz ham ishlaydi: xarita baribir
                    ochiladi (masalan, Toshkent).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary-700 font-bold">•</span>
                  <span>
                    “Kitoblarni ko‘rish”ni bosib, o‘sha odamdagi kitoblarni bir
                    joyda ko‘ring.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-[#f8fafc] py-14 sm:py-20">
        <div className="container-app">
          <h2 className="text-3xl font-extrabold text-center text-[#1e3a5f] mb-12">
            Nima uchun Jonli kutubxona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: "🗺️",
                title: "Xaritadan topish",
                desc: "Yaqin atrofdagi kitob egalari va mavjud kitoblarni pinlar orqali ko‘ring.",
              },
              {
                icon: "💬",
                title: "Xabar orqali kelishish",
                desc: "So‘rovdan keyin yozishma ochiladi — uchrashuv va vaqtni kelishib olasiz.",
              },
              {
                icon: "📌",
                title: "Holat aniq",
                desc: "“Mavjud” yoki “Ijarada” degan holatni ko‘rib, bekorga vaqt ketmaydi.",
              },
              {
                icon: "⚡",
                title: "Tezkor so‘rov",
                desc: "Bir necha bosishda ijara so‘rovini yuboring va javob oling.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="flex gap-4 bg-white rounded-xl p-6 shadow-sm"
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

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                title: "Tez qidiruv",
                desc: "Kitob nomi yoki muallif bo‘yicha qidiring — natijalar darhol yangilanadi.",
              },
              {
                title: "Masofa ko‘rsatkichlari",
                desc: "Geolokatsiya yoqilgan bo‘lsa, kitob joylashuvigacha taxminiy masofani ko‘rasiz.",
              },
              {
                title: "So‘rovlar nazorati",
                desc: "So‘rovlarim va Kelgan so‘rovlar bo‘limlarida hammasi ko‘rinib turadi.",
              },
            ].map((x) => (
              <div
                key={x.title}
                className="bg-white rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/60"
              >
                <p className="text-sm font-extrabold text-slate-900">
                  {x.title}
                </p>
                <p className="mt-2 text-sm text-slate-600">{x.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5986] text-white py-14 sm:py-20 text-center">
        <div className="container-app">
          {user ? (
            <>
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
                Qabul kutayotgan so'rovlar
              </h2>
              <p className="text-blue-200 mb-8 text-lg">
                Sizga kelgan so‘rovlarni ko‘rib, qabul qilishingiz yoki rad etishingiz mumkin.
              </p>
              <Link
                to="/incoming"
                className="bg-yellow-400 text-yellow-900 font-bold px-8 py-3 rounded-xl hover:bg-yellow-300 transition"
              >
                Qabul kutayotgan so'rovlar →
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
