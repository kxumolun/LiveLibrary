# LiveLibrary — Deploy qilish

Eng optimal va chidamli variant: **Vercel (frontend)** + **Railway (backend)**.

---

## 1. Backend (Railway)

1. [railway.app](https://railway.app) ga kiring → **Start a New Project**.
2. **Deploy from GitHub** — `bookshare-server` reponi ulang (yoki folder upload).
3. **Root Directory**: `bookshare-server` qilib belgilang.
4. **Environment Variables** qo‘shing:

   | O‘zgaruvchi       | Qiymat                      |
   |-------------------|-----------------------------|
   | `DATABASE_URL`    | Supabase PostgreSQL URL     |
   | `JWT_SECRET`      | Maxfiy kalit (random)       |
   | `SUPABASE_URL`    | Supabase project URL        |
   | `SUPABASE_SERVICE_KEY` | Supabase service role key |
   | `CORS_ORIGIN`     | `https://your-app.vercel.app` (keyinroq frontend URL) |
   | `ADMIN_EMAILS`    | `you@example.com` (faqat admin email) |
   | `PORT`            | `3000` (Railway o‘zi qo‘yadi, ixtiyoriy) |

5. **Deploy** — Railway `npm run build` va `npm start` ni ishga tushiradi.
6. **Settings → Domains** — `Generate Domain` bosib public URL oling (masalan `https://livelibrary-api.up.railway.app`).

---

## 2. Frontend (Vercel)

1. [vercel.com](https://vercel.com) ga kiring → **Add New Project**.
2. GitHub reponi ulang → **Root Directory**: `bookshare-client`.
3. **Environment Variable** qo‘shing:

   | O‘zgaruvchi       | Qiymat                                   |
   |-------------------|------------------------------------------|
   | `VITE_API_URL`    | `https://YOUR-RAILWAY-URL/api`           |
   | `VITE_ADMIN_EMAILS` | `you@example.com` (admin panel ko‘rinishi uchun) |

   (Masalan: `https://livelibrary-api.up.railway.app/api`)

4. **Deploy** — Vercel avtomatik build qiladi.

---

## 3. CORS yangilash

Frontend deploy bo‘lgach, Railway dashboard da `CORS_ORIGIN` ni yangilang:

```
https://your-app.vercel.app
```

Bir nechta origin bo‘lsa vergul bilan: `https://app1.vercel.app,https://app2.vercel.app`

---

## 4. Database migratsiyalar

Birinchi marta deploy qilganda Prisma migratsiyalari avtomatik ishlaydi (`Procfile` da `prisma migrate deploy` bor). Agar xato bo‘lsa:

```bash
cd bookshare-server
npx prisma migrate deploy
```

---

## 5. Tekshirish

- Frontend: `https://your-app.vercel.app`
- Backend: `https://your-railway-url/api/health` (agar `/health` endpoint bor bo‘lsa)
- Login, ro‘yxatdan o‘tish, kitoblar — hammasi ishlashi kerak.

---

## Boshqa variantlar

- **Render**: Backend va frontend ikkalasini ham bepul qilish mumkin (bepul tierda server uyquga ketadi).
- **Fly.io**: Docker orqali — ko‘proq nazorat, biroz murakkabroq.
