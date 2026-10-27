# KARTUARISAN — Denah Giliran Arisan

**Live:** https://kayzenn123.github.io/agent-kartuarisan/

Denah giliran arisan di atas kertas blueprint. Kocokannya adil dan bisa diverifikasi siapa saja — tarik kartunya, giliranmu ketahuan. Hari 18, 30 Days of Code (2026-10-27).

## Fitur

- **Buat grup arisan:** nama grup, iuran (Rp, min 1.000), periode mingguan/bulanan, tanggal mulai, tambah/hapus anggota (2–30 orang). 3 grup contoh siap pakai: RT 05 (12 orang, Rp100rb/bln), Kantor (8 orang, Rp200rb/bln), Keluarga Besar (20 orang, Rp50rb/mgg).
- **Kocok adil:** Fisher–Yates + `crypto.getRandomValues`; hash SHA-256 (seed + daftar nama) ditampilkan di bawah deck sebagai bukti yang bisa dicek ulang.
- **Deck kartu bertumpuk:** seret kartu teratas (pointer + inertia/flick) atau tekan TARIK / Enter — pemenang ronde terungkap + stempel "GILIRAN KE-N" + odometer ronde.
- **Denah giliran:** tabel ronde → nama, tanggal giliran (dihitung dari tanggal mulai + periode), jumlah diterima = iuran × anggota; klik baris → kartu detail.
- **Kalkulator live:** ubah iuran/anggota → pot per ronde update seketika. Rumus terbuka: pot = iuran × anggota; diterima = pot penuh, tanpa potongan.
- **Persistence & berbagi:** localStorage `kartuarisan-v1` (grup, urutan kocokan, ronde selesai); deep-link `?grup=&iuran=&periode=&mulai=&anggota=`; ekspor JSON; salin ringkasan WA; salin tautan denah; arsip denah tersimpan.
- **Easter egg:** ketik `kocok` di mana saja → kocok cepat + stempel "DIKOCOK!".
- **Aksesibilitas:** skip link, keyboard-only (deck: Enter/Spasi/Panah Kanan; tabel: Enter/Space), toggle Gerak, toggle Marquee, `prefers-reduced-motion` (0 animasi), mode ringan otomatis (CPU/RAM rendah / Save-Data), aria-live untuk pemenang.

## Identitas desain

- **Konsep:** meja gambar arsitek — denah giliran digambar garis biru di atas kertas blueprint; navigasi = tumpukan kartu itu sendiri (tanpa navbar, tanpa hero marketing).
- **Seed:** domain arisan · layout kartu bertumpuk bisa diseret · referensi blueprint arsitek · constraint tanpa shadow dan gradient · font Rasa / Gothic A1 / Titan One · palet light/triadic hue 235.
- **Palet:** bg `oklch(0.96 0.031 235)`, surface `oklch(0.90 0.040 235)`, teks `oklch(0.20 0.040 235)`, muted `oklch(0.45 0.030 235)`, aksen `oklch(0.68 0.210 355)`, aksen-2 `oklch(0.61 0.251 115)`, pop `oklch(0.83 0.204 74)`.
- **Kontras AA terverifikasi** (script sendiri + pustaka culori): teks-di-bg 16,09:1; muted-di-bg 6,59:1; teks-di-pop 9,71:1. Aksen/accent2 sebagai teks kecil memakai varian gelap (`--accent-ink` 0.45, `--accent2-ink` 0.38).
- **Font:** Rasa 400/700, Gothic A1 400/700, Titan One 400 — self-host woff2 latin dari Fontsource, total 86 KB.
- **Ikon:** 14 SVG inline gaya geometris bulat, digambar sendiri (3 custom domain: kartu arisan, stempel DISETUJUI, jangka kocok).
- **Gerak:** A zoom scrub + pan denah · B 2 marquee berlawanan + skew velocity · C kata jatuh-menumpuk + scramble angka · D drag inertia/flick · E curtain/clip-path reveal. F dipangkas.
- **Persona:** Pak Gambar — juru gambar arisan; semua copy, termasuk pesan error, berbahasa gambar teknik.

## Skor QA

- **qa.js (Playwright Chromium):** exit 0 — 4 viewport (360/390/768/1280), 0 overflow, 0 console issue, 1 h1, lang=id; fps 4x CPU throttle 48,7; reduced-motion 0 animasi.
- **Tes fungsi:** 24/24 lulus (`test-fungsi.js`) — kocok/tarik, persistensi + reload, deep-link, validasi, contoh grup, arsip, keyboard, easter egg.
- **Lighthouse:** BELUM TERUKUR di VM (chrome-launcher gagal — preseden 10-16 s.d. 10-26). Dicatat jujur, bukan angka karangan.
- **Skor rubrik mandiri:** karakter 9, keunikan 8, kerapian 8.
- **Ukuran:** JS ~26 KB (tanpa library), CSS ~16 KB, font 86 KB, 0 gambar raster di atas fold.

## Referensi arisan

Model yang dipakai adalah arisan konvensional: setiap anggota setor iuran yang sama tiap periode; nama dikocok; yang keluar menerima pot penuh satu ronde; semua anggota tetap setor sampai semua dapat giliran sekali. Dirangkum dari [Rankia — Apa Itu Arisan](https://rankia.id/apa-itu-arisan/) dan [SimulasiKredit — Mengenal 5 Jenis Arisan](https://www.simulasikredit.com/amp/mengenal-5-jenis-arisan-mana-yang-jadi-favorit-anda/). Arisan bukan tabungan dan bukan investasi. Semua angka di halaman ini CONTOH sampai diubah sendiri.

## Menjalankan lokal

```sh
python3 -m http.server 8130
# buka http://127.0.0.1:8130/
```

Tanpa build step, tanpa dependency. Font sudah self-host di `fonts/`.

## Kredit

Font Rasa, Gothic A1, Titan One (SIL OFL). Ikon SVG digambar sendiri. Grid blueprint: pola SVG. Dibangun 2026-10-27 sebagai Hari 18 dari 30 Days of Code.
