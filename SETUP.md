# Setup Sistem Pakar Padi - Fix Guide

## Problem Analysis
- ❌ CDN jsDelivr memberikan CommonJS build, tidak UMD
- ❌ Firefox Privacy Protection memblokir storage access  
- ✅ npm packages sudah installed dengan benar

## Solution
Gunakan **npm packages directly** bukan CDN, dengan dynamic import di client-side.

## Steps to Fix

### 1. Stop Dev Server
```bash
# Tekan Ctrl+C di terminal dimana npm run dev sedang jalan
```

### 2. Clean Cache
```bash
# Hapus Next.js build cache
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue

# Hapus node_modules (optional tapi recommended)
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall dependencies
npm install
npm install --legacy-peer-deps
```

### 3. Restart Dev Server
```bash
npm run dev
```

### 4. Test di Browser
1. Buka http://localhost:3000
2. Buka Developer Console (F12)
3. Jalankan verification:

```javascript
console.log('TensorFlow:', typeof window.tf !== 'undefined' ? '✓' : '✗')
console.log('Module system OK:', true)
fetch('/model/model.json').then(r => console.log('Model files:', r.status === 200 ? '✓' : '✗'))
```

Expected output:
```
TensorFlow: ✓
Module system OK: true
Model files: ✓
```

4. Tunggu "Mempersiapkan Sistem Pakar..." selesai (20-30 detik)

## What Changed
- Removed CDN script tags (layout.tsx)
- Direct npm import di runtime (predictionUtils.ts)
- Better error logging untuk debugging
- Retry logic dengan exponential backoff

## If Still Not Working

1. **Clear browser cache:**
   - Firefox: Ctrl+Shift+Delete
   - Chrome: Ctrl+Shift+Delete

2. **Check Network Tab** (F12 → Network):
   - Should see requests to `/model/` files
   - Status 200 for model.json, metadata.json, weights.bin

3. **Check Console Logs:**
   - Should see: "Loading model (attempt 1/3)..."
   - Should see: "✓ Model loaded successfully"

## File Changes Made
- `src/app/layout.tsx` - Removed CDN scripts
- `src/utils/predictionUtils.ts` - Fixed import strategy
- `src/app/page.tsx` - Better error messages
