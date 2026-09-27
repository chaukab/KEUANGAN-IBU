/*
 * format.js — utilitas format angka & tanggal sesuai gaya laporan keuangan masjid.
 * Dimuat sebagai script klasik supaya aplikasi tetap bisa dibuka lewat file://
 */
(function (global) {
  'use strict';

  var NAMA_BULAN = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  /* "2026-06-17" -> { d: 17, m: 6, y: 2026 } ; mengembalikan null bila tidak valid */
  function pecahTanggal(iso) {
    if (!iso) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
    if (!m) return null;
    return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  }

  /* Baris transaksi memakai gaya "17/6/2026" (tanpa nol di depan) */
  function tanggalRingkas(iso) {
    var t = pecahTanggal(iso);
    if (!t) return '';
    return t.d + '/' + t.m + '/' + t.y;
  }

  /* Baris Total memakai gaya "10/08/2026" (dengan nol di depan) */
  function tanggalPenuh(iso) {
    var t = pecahTanggal(iso);
    if (!t) return '';
    return pad2(t.d) + '/' + pad2(t.m) + '/' + t.y;
  }

  /* "17 Juni 2026" untuk keperluan judul periode */
  function tanggalPanjang(iso) {
    var t = pecahTanggal(iso);
    if (!t) return '';
    return t.d + ' ' + NAMA_BULAN[t.m - 1] + ' ' + t.y;
  }

  function bulatkan(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
  }

  /* 1070132 -> "1,070,132.00" ; 0 -> "-" */
  function uang(n, opsi) {
    var nilai = bulatkan(n);
    var tampilkanNol = opsi && opsi.tampilkanNol;
    if (nilai === 0 && !tampilkanNol) return '-';
    var negatif = nilai < 0;
    var teks = Math.abs(nilai).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return negatif ? '(' + teks + ')' : teks;
  }

  /* Kolom Debit selalu ditulis dalam kurung: 700700 -> "(700,700.00)" */
  function uangDebit(n) {
    var nilai = bulatkan(n);
    if (nilai === 0) return '-';
    return '(' + Math.abs(nilai).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ')';
  }

  /* Menerima "1.500.000", "1,500,000", "1500000,50" dan sejenisnya */
  function bacaAngka(teks) {
    if (typeof teks === 'number') return bulatkan(teks);
    if (teks === null || teks === undefined) return 0;
    var s = String(teks).trim();
    if (!s) return 0;
    s = s.replace(/[Rr][Pp]\.?/g, '').replace(/\s/g, '').replace(/[()]/g, '');
    var adaKoma = s.indexOf(',') >= 0;
    var adaTitik = s.indexOf('.') >= 0;
    if (adaKoma && adaTitik) {
      /* pemisah desimal = tanda yang muncul paling akhir */
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (adaKoma) {
      /* "1,500,000" -> ribuan ; "1500,50" -> desimal */
      s = /,\d{3}(\D|$)/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
    } else if (adaTitik) {
      if (/\.\d{3}(\D|$)/.test(s)) s = s.replace(/\./g, '');
    }
    var n = parseFloat(s);
    return isNaN(n) ? 0 : bulatkan(Math.abs(n));
  }

  global.Format = {
    NAMA_BULAN: NAMA_BULAN,
    pad2: pad2,
    pecahTanggal: pecahTanggal,
    tanggalRingkas: tanggalRingkas,
    tanggalPenuh: tanggalPenuh,
    tanggalPanjang: tanggalPanjang,
    bulatkan: bulatkan,
    uang: uang,
    uangDebit: uangDebit,
    bacaAngka: bacaAngka
  };
})(window);
