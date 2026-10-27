/* KARTUARISAN — logika denah arisan. Vanilla JS, tanpa library. */
(function () {
  'use strict';

  var KEY = 'kartuarisan-v1';
  var $ = function (id) { return document.getElementById(id); };
  var fmtRp = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  var fmtTgl = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

  var CONTOH = {
    rt05: { nama: 'Arisan RT 05', iuran: 100000, periode: 'bulanan', mulai: '2026-11-01',
      anggota: ['Bu Sari', 'Pak Budi', 'Mbak Rina', 'Mas Agus', 'Bu Dewi', 'Pak Slamet', 'Teh Ani', 'Kang Dedi', 'Bu Lastri', 'Pak Joko', 'Mbak Sinta', 'Mas Bambang'] },
    kantor: { nama: 'Arisan Kantor', iuran: 200000, periode: 'bulanan', mulai: '2026-11-05',
      anggota: ['Ratna', 'Budi', 'Sinta', 'Agus', 'Dewi', 'Joko', 'Maya', 'Rudi'] },
    keluarga: { nama: 'Arisan Keluarga Besar', iuran: 50000, periode: 'mingguan', mulai: '2026-11-01',
      anggota: ['Kakek', 'Nenek', 'Paman Udin', 'Bibi Yati', 'Ayah', 'Ibu', 'Kak Rani', 'Dik Bayu', 'Om Hendra', 'Tante Lilis', 'Kak Fajar', 'Dik Putri', 'Sepupu Gilang', 'Sepupu Nisa', 'Paman Slamet', 'Bibi Ratih', 'Kak Dimas', 'Dik Sari', 'Om Budi', 'Tante Dewi'] }
  };

  var state = {
    nama: 'Arisan RT 05', iuran: 100000, periode: 'bulanan', mulai: '2026-11-01',
    anggota: CONTOH.rt05.anggota.slice(), order: [], drawn: 0, seed: '', hash: ''
  };
  var arsip = [];
  var motionOn = true;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lite = (navigator.hardwareConcurrency || 99) <= 4 || (navigator.deviceMemory || 99) <= 4 ||
    (navigator.connection && navigator.connection.saveData);

  /* ---------- util ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.hidden = true; }, 3200);
  }
  function showErr(id, msg) {
    var n = $(id);
    if (!msg) { n.hidden = true; n.textContent = ''; return; }
    n.textContent = msg;
    n.hidden = false;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function simpan() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, state: state, arsip: arsip }));
    } catch (e) { /* penyimpanan penuh/ditolak: denah tetap jalan di memori */ }
  }
  function muat() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || d.version !== 1 || !d.state || !Array.isArray(d.state.anggota)) return false;
      state = d.state;
      arsip = Array.isArray(d.arsip) ? d.arsip : [];
      return true;
    } catch (e) {
      try { localStorage.removeItem(KEY); } catch (e2) {}
      return false;
    }
  }

  function cryptoRand(n) {
    var a = new Uint32Array(n);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
    else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 4294967296);
    return a;
  }
  function hexSeed() {
    var a = cryptoRand(8), s = '';
    for (var i = 0; i < a.length; i++) s += ('0000000' + a[i].toString(16)).slice(-8);
    return s;
  }
  function sha256hex(str) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      });
    }
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return Promise.resolve((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16) + '-fallback');
  }

  function kocok() {
    var arr = state.anggota.slice();
    var rnd = cryptoRand(arr.length);
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rnd[i] % (i + 1);
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    state.order = arr;
    state.drawn = 0;
    state.seed = hexSeed();
    var bahan = state.seed + '|' + state.anggota.join(',');
    $('hash-kocokan').textContent = 'menghitung…';
    sha256hex(bahan).then(function (h) {
      state.hash = h;
      $('hash-kocokan').textContent = h.slice(0, 16) + '…';
      simpan();
    });
    $('stempel').classList.remove('tampil');
    $('pemenang').textContent = '';
    $('btn-ulang').hidden = true;
    renderSemua();
  }

  function pot() { return state.iuran * state.anggota.length; }
  function tanggalRonde(n) {
    var d = new Date(state.mulai + 'T00:00:00');
    if (isNaN(d.getTime())) d = new Date();
    if (state.periode === 'mingguan') d.setDate(d.getDate() + (n - 1) * 7);
    else d.setMonth(d.getMonth() + (n - 1));
    return d;
  }

  /* ---------- render ---------- */
  function renderStats() {
    $('stat-anggota').textContent = state.anggota.length + ' orang';
    $('stat-iuran').textContent = fmtRp.format(state.iuran);
    $('stat-pot').textContent = fmtRp.format(pot());
    $('stat-total-ronde').textContent = state.anggota.length;
    scramble($('stat-ronde'), String(state.drawn));
  }
  function scramble(node, target) {
    if (reduced || !motionOn || node.textContent === target) { node.textContent = target; return; }
    var glyphs = '0123456789', step = 0;
    clearInterval(node._t);
    node._t = setInterval(function () {
      step++;
      node.textContent = step > 6 ? target : glyphs[Math.floor(Math.random() * glyphs.length)];
      if (step > 6) clearInterval(node._t);
    }, 40);
  }

  function renderChips() {
    var ul = $('chip-list');
    ul.textContent = '';
    state.anggota.forEach(function (nama, i) {
      var li = el('li');
      li.appendChild(document.createTextNode(nama + ' '));
      var b = el('button', null, '×');
      b.type = 'button';
      b.setAttribute('aria-label', 'Hapus ' + nama);
      b.addEventListener('click', function () {
        state.anggota.splice(i, 1);
        kocok();
        toast(nama + ' dicoret dari denah.');
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    $('jumlah-anggota').textContent = '(' + state.anggota.length + ' orang)';
    $('anggota-kosong').hidden = state.anggota.length > 0;
    $('denah-kosong').hidden = state.anggota.length >= 2;
  }

  function kartuEl(nama, idx, total) {
    var c = el('article', 'kartu');
    c.setAttribute('aria-label', 'Kartu ' + nama);
    var atas = el('div', 'kartu-nomor');
    atas.appendChild(el('span', null, 'KARTU ARISAN'));
    atas.appendChild(el('span', null, 'NO. ' + String(idx + 1).padStart(2, '0')));
    var tengah = el('div');
    tengah.appendChild(el('p', 'kartu-nama', nama));
    var iuran = el('p', 'kartu-iuran');
    iuran.appendChild(document.createTextNode('Iuran per ronde'));
    iuran.appendChild(el('b', null, fmtRp.format(state.iuran)));
    tengah.appendChild(iuran);
    var bawah = el('div', 'kartu-bawah');
    bawah.appendChild(el('span', null, state.nama));
    var ling = el('span', 'lingkar', String(total - idx));
    bawah.appendChild(ling);
    c.appendChild(atas);
    c.appendChild(tengah);
    c.appendChild(bawah);
    return c;
  }

  function renderDeck() {
    var deck = $('deck');
    deck.textContent = '';
    var sisa = state.order.slice(state.drawn);
    if (sisa.length === 0) {
      var kosong = el('div', 'deck-kosong', state.anggota.length < 2
        ? 'Tumpukan masih kosong — tambah anggota dulu di Lembar 02, minimal 2 orang.'
        : 'Semua kartu sudah ditarik — semua anggota sudah dapat giliran. Tekan KOCOK ULANG untuk denah baru.');
      deck.appendChild(kosong);
      $('btn-tarik').disabled = true;
      $('btn-ulang').hidden = state.anggota.length < 2;
      return;
    }
    $('btn-tarik').disabled = false;
    var tampil = Math.min(3, sisa.length);
    for (var k = tampil - 1; k >= 0; k--) {
      var kartu = kartuEl(sisa[k], state.drawn + k, state.order.length);
      var offset = k;
      kartu.style.transform = 'translateY(' + (offset * -14) + 'px) rotate(' + (offset * -1.6) + 'deg) scale(' + (1 - offset * 0.03) + ')';
      kartu.style.zIndex = String(10 - offset);
      if (k === 0) {
        kartu.dataset.top = '1';
        pasangDrag(kartu);
      } else {
        kartu.style.pointerEvents = 'none';
      }
      deck.appendChild(kartu);
    }
  }

  function renderTabel() {
    var tb = $('tbody-denah');
    tb.textContent = '';
    state.order.forEach(function (nama, i) {
      var tr = document.createElement('tr');
      tr.tabIndex = 0;
      if (i < state.drawn) tr.setAttribute('aria-current', 'true');
      tr.appendChild(el('td', null, 'Ronde ' + (i + 1)));
      tr.appendChild(el('td', null, nama));
      tr.appendChild(el('td', null, fmtTgl.format(tanggalRonde(i + 1))));
      tr.appendChild(el('td', null, fmtRp.format(pot())));
      var st = el('td');
      st.appendChild(el('span', i < state.drawn ? 'status-lunas' : null, i < state.drawn ? 'SUDAH DITARIK' : 'MENUNGGU'));
      tr.appendChild(st);
      var buka = function () { bukaDetail(i); };
      tr.addEventListener('click', buka);
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); buka(); } });
      tb.appendChild(tr);
    });
  }

  function bukaDetail(i) {
    var nama = state.order[i];
    $('detail-ronde').textContent = 'Ronde ' + (i + 1);
    $('detail-nama').textContent = nama;
    $('detail-tanggal').textContent = fmtTgl.format(tanggalRonde(i + 1));
    $('detail-terima').textContent = fmtRp.format(pot());
    $('detail-status').textContent = i < state.drawn ? 'Sudah ditarik' : 'Menunggu giliran';
    var d = $('kartu-detail');
    d.hidden = false;
    d.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }

  function renderArsip() {
    var ul = $('arsip-list');
    ul.textContent = '';
    $('arsip-kosong').hidden = arsip.length > 0;
    arsip.slice().reverse().forEach(function (a) {
      var li = el('li');
      var kiri = el('div');
      kiri.appendChild(el('b', null, a.nama));
      kiri.appendChild(el('span', 'arsip-meta', ' · ' + a.anggota.length + ' orang · ' + fmtRp.format(a.iuran) + '/' + (a.periode === 'mingguan' ? 'minggu' : 'bulan') + ' · disimpan ' + fmtTgl.format(new Date(a.disimpan))));
      var b = el('button', 'btn', 'MUAT DENAH');
      b.type = 'button';
      b.addEventListener('click', function () {
        state.nama = a.nama; state.iuran = a.iuran; state.periode = a.periode;
        state.mulai = a.mulai; state.anggota = a.anggota.slice();
        syncForm();
        kocok();
        document.getElementById('meja').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
        toast('Denah ' + a.nama + ' dimuat kembali.');
      });
      li.appendChild(kiri);
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function renderSemua() {
    renderStats();
    renderChips();
    renderDeck();
    renderTabel();
    renderArsip();
    syncForm();
    updateDeepLink();
  }

  function syncForm() {
    $('in-nama').value = state.nama;
    $('in-iuran').value = String(state.iuran);
    $('in-periode').value = state.periode;
    $('in-mulai').value = state.mulai;
  }

  /* ---------- tarik kartu ---------- */
  function tarikKartu() {
    if (state.drawn >= state.order.length) return;
    var nama = state.order[state.drawn];
    state.drawn++;
    var st = $('stempel');
    $('stempel-teks').textContent = 'GILIRAN KE-' + state.drawn;
    st.classList.add('tampil');
    clearTimeout(st._h);
    st._h = setTimeout(function () { st.classList.remove('tampil'); }, 2500);
    var p = $('pemenang');
    p.textContent = '';
    p.appendChild(document.createTextNode('Ronde ' + state.drawn + ' — '));
    p.appendChild(el('b', null, nama));
    p.appendChild(document.createTextNode(' menerima ' + fmtRp.format(pot()) + ' pada ' + fmtTgl.format(tanggalRonde(state.drawn)) + '.'));
    if (state.drawn >= state.order.length) $('btn-ulang').hidden = false;
    renderSemua();
    simpan();
  }

  function pasangDrag(kartu) {
    var sx = 0, sy = 0, dx = 0, dy = 0, aktif = false, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0;
    kartu.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      aktif = true;
      sx = e.clientX; sy = e.clientY; dx = 0; dy = 0;
      kartu.classList.add('dragging');
      kartu.setPointerCapture(e.pointerId);
    });
    kartu.addEventListener('pointermove', function (e) {
      if (!aktif) return;
      var nx = e.clientX - sx, ny = e.clientY - sy;
      vx = nx - dx; vy = ny - dy;
      dx = nx; dy = ny;
      kartu.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx * 0.08) + 'deg)';
    });
    function lepas() {
      if (!aktif) return;
      aktif = false;
      kartu.classList.remove('dragging');
      if (Math.abs(dx) > 110 || Math.abs(vx) > 14) {
        tx = dx + vx * 14; ty = dy + vy * 14;
        kartu.style.transition = 'transform .28s ease-in';
        kartu.style.transform = 'translate(' + tx + 'px,' + ty + 'px) rotate(' + (tx * 0.15) + 'deg)';
        kartu.style.opacity = '0';
        setTimeout(tarikKartu, 180);
      } else {
        kartu.style.transform = '';
      }
    }
    kartu.addEventListener('pointerup', lepas);
    kartu.addEventListener('pointercancel', lepas);
    kartu.addEventListener('pointermove', function (e) {
      if (!aktif || lite || reduced || !motionOn) return;
      var r = kartu.getBoundingClientRect();
      var rx = (e.clientX - r.left) / r.width - 0.5;
      var ry = (e.clientY - r.top) / r.height - 0.5;
      kartu.style.setProperty('--tilt', '');
      kartu.dataset.rx = rx; kartu.dataset.ry = ry;
    });
  }

  /* ---------- form ---------- */
  function validasiGrup() {
    var ok = true;
    var nama = $('in-nama').value.trim();
    if (nama.length < 2) { showErr('err-nama', 'Garisnya belum ketemu — nama grup minimal 2 huruf.'); ok = false; }
    else showErr('err-nama');
    var iuran = Number($('in-iuran').value);
    if (!iuran || iuran < 1000) { showErr('err-iuran', 'Iurannya kekecilan — minimal Rp1.000 per orang.'); ok = false; }
    else if (iuran > 100000000) { showErr('err-iuran', 'Iurannya kegedean — maksimal Rp100.000.000 per orang.'); ok = false; }
    else showErr('err-iuran');
    if (!$('in-mulai').value) { showErr('err-mulai', 'Tanggal mulainya belum digambar — pilih tanggal dulu.'); ok = false; }
    else showErr('err-mulai');
    return ok;
  }
  function terapkanForm() {
    if (!validasiGrup()) return;
    state.nama = $('in-nama').value.trim();
    state.iuran = Math.round(Number($('in-iuran').value));
    state.periode = $('in-periode').value;
    state.mulai = $('in-mulai').value;
    kocok();
    toast('Denah digambar ulang — ' + state.nama + ', pot ' + fmtRp.format(pot()) + ' per ronde.');
  }
  ['in-nama', 'in-iuran', 'in-periode', 'in-mulai'].forEach(function (id) {
    $(id).addEventListener('change', terapkanForm);
  });

  $('btn-tambah').addEventListener('click', function () {
    var inp = $('in-anggota');
    var nama = inp.value.trim();
    if (nama.length < 2) { showErr('err-anggota', 'Nama anggota minimal 2 huruf — tulis yang jelas, biar tidak salah orang.'); return; }
    if (state.anggota.length >= 30) { showErr('err-anggota', 'Denahnya penuh — maksimal 30 anggota per grup.'); return; }
    if (state.anggota.some(function (a) { return a.toLowerCase() === nama.toLowerCase(); })) {
      showErr('err-anggota', 'Nama ini sudah ada di denah — tiap anggota cuma boleh sekali.'); return;
    }
    showErr('err-anggota');
    state.anggota.push(nama);
    inp.value = '';
    inp.focus();
    kocok();
    toast(nama + ' masuk denah.');
  });
  $('in-anggota').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); $('btn-tambah').click(); }
  });

  document.querySelectorAll('[data-contoh]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = CONTOH[b.dataset.contoh];
      state.nama = c.nama; state.iuran = c.iuran; state.periode = c.periode;
      state.mulai = c.mulai; state.anggota = c.anggota.slice();
      kocok();
      document.getElementById('meja').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      toast('Denah contoh ' + c.nama + ' terpasang — silakan diutak-atik.');
    });
  });

  /* ---------- tombol deck ---------- */
  $('btn-kocok').addEventListener('click', function () {
    if (state.anggota.length < 2) {
      showErr('err-anggota', 'Anggota masih kurang — minimal 2 orang baru bisa dikocok.');
      document.getElementById('gambar').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    kocok();
    toast('Dikocok! Urutan baru sudah digambar — hash bukti di bawah deck.');
  });
  $('btn-tarik').addEventListener('click', tarikKartu);
  $('btn-ulang').addEventListener('click', function () { kocok(); toast('Denah baru dikocok.'); });
  $('btn-salinhash').addEventListener('click', function () {
    salinTeks('KARTUARISAN — hash kocokan ' + state.nama + ': ' + state.hash + ' (seed ' + state.seed + ')');
  });
  $('deck').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      e.preventDefault();
      tarikKartu();
    }
  });
  $('btn-tutup-detail').addEventListener('click', function () { $('kartu-detail').hidden = true; });

  /* ---------- arsip / ekspor / salin ---------- */
  function salinTeks(teks) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = teks;
      ta.setAttribute('readonly', '');
      ta.style.position = 'absolute'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? 'Disalin — tinggal tempel.' : 'Gagal menyalin — izin clipboard ditolak, salin manual ya.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(teks).then(function () { toast('Disalin — tinggal tempel.'); }, fallback);
    } else fallback();
  }
  function ringkasanWA() {
    var baris = ['*KARTUARISAN — ' + state.nama + '*', 'Iuran ' + fmtRp.format(state.iuran) + ' per orang, ' + (state.periode === 'mingguan' ? 'mingguan' : 'bulanan') + '.', 'Pot per ronde: ' + fmtRp.format(pot()) + '.', '', 'Denah giliran:'];
    state.order.forEach(function (nama, i) {
      baris.push((i + 1) + '. ' + nama + ' — ' + fmtTgl.format(tanggalRonde(i + 1)) + (i < state.drawn ? ' (sudah ditarik)' : ''));
    });
    baris.push('', 'Hash kocokan: ' + (state.hash ? state.hash.slice(0, 16) + '…' : '—'));
    return baris.join('\n');
  }
  $('btn-simpan').addEventListener('click', function () {
    arsip.push({ nama: state.nama, iuran: state.iuran, periode: state.periode, mulai: state.mulai, anggota: state.anggota.slice(), disimpan: new Date().toISOString() });
    simpan();
    renderArsip();
    toast('Denah ' + state.nama + ' masuk arsip.');
  });
  $('btn-ekspor').addEventListener('click', function () {
    var data = { aplikasi: 'KARTUARISAN', versi: 1, grup: state, diekspor: new Date().toISOString() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kartuarisan-' + state.nama.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('JSON denah diunduh.');
  });
  $('btn-salinan').addEventListener('click', function () { salinTeks(ringkasanWA()); });
  $('btn-tautan').addEventListener('click', function () { salinTeks(updateDeepLink()); });

  /* ---------- deep-link ---------- */
  function updateDeepLink() {
    var p = new URLSearchParams();
    p.set('grup', state.nama);
    p.set('iuran', String(state.iuran));
    p.set('periode', state.periode);
    p.set('mulai', state.mulai);
    p.set('anggota', state.anggota.join(','));
    var url = location.origin + location.pathname + '?' + p.toString();
    try { history.replaceState(null, '', '?' + p.toString()); } catch (e) {}
    return url;
  }
  function parseDeepLink() {
    var p = new URLSearchParams(location.search);
    if (!p.get('anggota')) return null;
    var anggota = p.get('anggota').split(',').map(function (s) { return s.trim().slice(0, 30); }).filter(function (s) { return s.length >= 2; }).slice(0, 30);
    if (anggota.length < 2) return null;
    var iuran = Number(p.get('iuran'));
    return {
      nama: (p.get('grup') || 'Arisan').slice(0, 40),
      iuran: (iuran >= 1000 && iuran <= 100000000) ? Math.round(iuran) : 100000,
      periode: p.get('periode') === 'mingguan' ? 'mingguan' : 'bulanan',
      mulai: /^\d{4}-\d{2}-\d{2}$/.test(p.get('mulai') || '') ? p.get('mulai') : '2026-11-01',
      anggota: anggota
    };
  }
  function samaGrup(a, b) {
    if (!a || !b) return false;
    if (a.nama !== b.nama || a.iuran !== b.iuran || a.periode !== b.periode || a.mulai !== b.mulai) return false;
    if (a.anggota.length !== b.anggota.length) return false;
    var s = a.anggota.slice().sort().join('\n');
    return s === b.anggota.slice().sort().join('\n');
  }

  /* ---------- marquee ---------- */
  var MARQUEE_ITEMS = ['KOCOK', 'TARIK', 'GILIRAN', 'DENAH', 'STEMPEL', 'IURAN', 'POT', 'LUNAS'];
  function isiMarquee(trackId) {
    var track = $(trackId);
    var half = document.createElement('div');
    half.style.display = 'contents';
    MARQUEE_ITEMS.forEach(function (t) {
      var s = el('span', null, t + ' ✦');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>';
      s.insertBefore(svg, s.firstChild);
      track.appendChild(s);
    });
    var clone = track.cloneNode(true);
    while (clone.firstChild) track.appendChild(clone.firstChild);
  }
  isiMarquee('track-atas');
  isiMarquee('track-bawah');

  $('btn-marquee').addEventListener('click', function () {
    var paused = document.body.classList.toggle('marquee-paused');
    this.setAttribute('aria-pressed', String(!paused));
    this.textContent = paused ? 'Marquee: berhenti' : 'Marquee: jalan';
  });

  /* ---------- gerak ---------- */
  $('btn-motion').addEventListener('click', function () {
    motionOn = !motionOn;
    document.body.classList.toggle('gerak-mati', !motionOn);
    this.setAttribute('aria-pressed', String(motionOn));
    this.textContent = motionOn ? 'Gerak: nyala' : 'Gerak: mati';
  });
  if (reduced) {
    motionOn = false;
    document.body.classList.add('gerak-mati');
    $('btn-motion').setAttribute('aria-pressed', 'false');
    $('btn-motion').textContent = 'Gerak: mati';
  }
  if (lite) document.body.classList.add('ringan');

  // Kata hero jatuh lalu menumpuk
  (function animasiJudul() {
    if (reduced || !motionOn) return;
    document.querySelectorAll('.judul .kata').forEach(function (kata, i) {
      kata.style.transform = 'translateY(-120%) rotate(-4deg)';
      kata.style.opacity = '0';
      kata.style.transition = 'transform .55s cubic-bezier(.2,1.4,.4,1) ' + (i * 140) + 'ms, opacity .3s ease ' + (i * 140) + 'ms';
      requestAnimationFrame(function () {
        kata.style.transform = 'translateY(0) rotate(0deg)';
        kata.style.opacity = '1';
      });
    });
  })();

  // Scroll scrub: zoom hero + pan denah + skew marquee (rAF, pause offscreen)
  (function scrub() {
    if (reduced || !motionOn || lite) return;
    var hero = document.querySelector('.hero-inner');
    var denahWrap = document.querySelector('#denah .tabel-wrap');
    var lastY = -1, ticking = false, lastT = 0;
    function onScroll() {
      var y = window.scrollY;
      var v = Math.abs(y - lastY);
      var skew = Math.max(-6, Math.min(6, (y - lastY) * 0.06));
      document.documentElement.style.setProperty('--skew', skew.toFixed(2) + 'deg');
      lastY = y;
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () {
          var h = document.documentElement.scrollHeight - innerHeight;
          var p = h > 0 ? Math.min(y / h, 1) : 0;
          if (hero) hero.style.transform = 'scale(' + (1 + p * 0.06) + ')';
          if (denahWrap && window.innerWidth >= 900) {
            var r = denahWrap.getBoundingClientRect();
            if (r.top < innerHeight && r.bottom > 0) {
              var dp = Math.max(0, Math.min(1, (innerHeight - r.top) / (innerHeight + r.height)));
              denahWrap.style.transform = 'translateX(' + ((dp - 0.5) * -40) + 'px)';
            }
          }
          ticking = false;
        });
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- easter egg: ketik "kocok" ---------- */
  (function () {
    var buf = '';
    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      buf = (buf + e.key.toLowerCase()).slice(-5);
      if (buf === 'kocok') {
        buf = '';
        kocok();
        var st = $('stempel');
        $('stempel-teks').textContent = 'DIKOCOK!';
        st.classList.add('tampil');
        setTimeout(function () { st.classList.remove('tampil'); }, 1400);
        toast('Kocok cepat — Pak Gambar yang mengocok.');
      }
    });
  })();

  /* ---------- init ---------- */
  var tersimpan = muat();
  var link = parseDeepLink();
  if (link) {
    if (tersimpan && samaGrup(link, state)) {
      /* tautan sama dengan denah tersimpan: pertahankan urutan kocokan + ronde */
    } else {
      state.nama = link.nama; state.iuran = link.iuran; state.periode = link.periode;
      state.mulai = link.mulai; state.anggota = link.anggota.slice();
      state.order = []; state.drawn = 0; state.seed = ''; state.hash = '';
    }
  }
  if (!state.order || state.order.length !== state.anggota.length || state.drawn > state.order.length) {
    kocok();
  } else {
    if (state.hash) $('hash-kocokan').textContent = state.hash.slice(0, 16) + '…';
    renderSemua();
  }
})();
