# LiveLibrary — Deploy tayyorgarlik
# PowerShell da: .\deploy.ps1

Write-Host "=== LiveLibrary Deploy Tayyorgarlik ===" -ForegroundColor Cyan

# 1. Git init (agar yo'q bo'lsa)
if (-not (Test-Path ".git")) {
    Write-Host "`n1. Git init..." -ForegroundColor Yellow
    git init
    git branch -M main
    Write-Host "   Git boshlandi." -ForegroundColor Green
} else {
    Write-Host "`n1. Git allaqachon bor." -ForegroundColor Green
}

# 2. Build tekshirish
Write-Host "`n2. Client build tekshirish..." -ForegroundColor Yellow
Set-Location bookshare-client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   XATO: Client build muvaffaqiyatsiz!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "   Client build OK." -ForegroundColor Green

Write-Host "`n3. Server build tekshirish..." -ForegroundColor Yellow
Set-Location bookshare-server
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "   XATO: Server build muvaffaqiyatsiz!" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..
Write-Host "   Server build OK." -ForegroundColor Green

Write-Host "`n=== Tayyor! ===" -ForegroundColor Cyan
Write-Host @"

Keyingi qadamlar:

1. GitHub da yangi repo yarating: https://github.com/new
   - Nomi: LiveLibrary (yoki xohlaganingiz)
   - Public
   - README qo'shmang (loyihada bor)

2. Push qiling:
   git add .
   git commit -m "Deploy tayyor"
   git remote add origin https://github.com/SIZNING-USERNAME/LiveLibrary.git
   git push -u origin main

3. Railway (backend):
   - railway.app -> New Project -> Deploy from GitHub
   - Root: bookshare-server
   - Env: DATABASE_URL, JWT_SECRET, SUPABASE_URL, SUPABASE_SERVICE_KEY, CORS_ORIGIN
   - Domain yarating

4. Vercel (frontend):
   - vercel.com -> Add Project -> Import GitHub
   - Root: bookshare-client
   - VITE_API_URL = https://YOUR-RAILWAY-URL/api

5. Railway da CORS_ORIGIN ni Vercel URL ga yangilang.

Batafsil: DEPLOY.md

"@ -ForegroundColor White
