/*
 * export-pdf.js — mencetak laporan ke PDF memakai jsPDF + jspdf-autotable.
 * Tata letaknya dibuat semirip mungkin dengan tampilan Pratinjau.
 */
(function (global) {
  'use strict';

  var F = global.Format;

  /*
   * Font bawaan jsPDF hanya mengenal karakter Latin-1 (WinAnsi). Karakter di luar itu
   * membuat jarak antarhuruf jadi kacau, jadi ditukar dulu dengan padanan yang aman.
   */
  var GANTI_KARAKTER = {
    '\u2192': '\u00BB',   /* panah kanan  -> guillemet */
    '\u2190': '\u00AB',
    '\u2018': "'", '\u2019': "'",
    '\u201C': '"', '\u201D': '"',
    '\u2022': '\u00B7',
    '\u2026': '...',
    '\u00A0': ' '
  };

  function amankanTeks(teks) {
    return String(teks === null || teks === undefined ? '' : teks).replace(/[\s\S]/g, function (huruf) {
      if (GANTI_KARAKTER[huruf]) return GANTI_KARAKTER[huruf];
      var kode = huruf.charCodeAt(0);
      if (kode === 10 || kode === 13 || kode === 9) return huruf;
      return kode <= 0xFF ? huruf : '?';
    });
  }

  var WARNA = {
    judul: [31, 78, 121],
    kepala: [46, 117, 182],
    bagian: [46, 117, 182],
    total: [221, 235, 247],
    garis: [155, 194, 230],
    teks: [0, 0, 0]
  };

  function susunBody(laporan) {
    var body = [];
    laporan.bagian.forEach(function (bagian) {
      body.push([{
        content: amankanTeks(bagian.sumber ? bagian.nama + ' → ' + bagian.sumber : bagian.nama),
        colSpan: 5,
        styles: {
          fillColor: WARNA.bagian,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        }
      }]);
      bagian.baris.forEach(function (baris) {
        body.push([
          F.tanggalRingkas(baris.tanggal),
          amankanTeks(baris.keterangan),
          F.uang(baris.kredit),
          F.uangDebit(baris.debit),
          F.uang(baris.saldo)
        ]);
      });
      var gayaTotal = { fillColor: WARNA.total, fontStyle: 'bold' };
      body.push([
        { content: F.tanggalPenuh(bagian.tanggalTotal), styles: Object.assign({ halign: 'center' }, gayaTotal) },
        { content: 'Total', styles: Object.assign({}, gayaTotal) },
        { content: F.uang(bagian.totalKredit), styles: Object.assign({ halign: 'right' }, gayaTotal) },
        { content: F.uangDebit(bagian.totalDebit), styles: Object.assign({ halign: 'right' }, gayaTotal) },
        { content: F.uang(bagian.saldoAkhir), styles: Object.assign({ halign: 'right' }, gayaTotal) }
      ]);
    });
    return body;
  }

  function gambarTandaTangan(doc, laporan, mulaiY, tepi, lebarGuna) {
    var ttd = laporan.meta.tandaTangan || [];
    if (!ttd.length) return;

    var tinggiHalaman = doc.internal.pageSize.getHeight();
    var kiri = ttd.filter(function (t) { return t.kolom !== 'kanan' && t.kolom !== 'tengah'; });
    var kanan = ttd.filter(function (t) { return t.kolom === 'kanan'; });
    var tengah = ttd.filter(function (t) { return t.kolom === 'tengah'; });

    var tinggiBaris = 5;
    var ruangTandaTangan = 22;

    function tinggiBlok(daftar) {
      if (!daftar.length) return 0;
      return daftar.reduce(function (maks, t) {
        return Math.max(maks, String(t.jabatan || '').split('\n').length);
      }, 0) * tinggiBaris + ruangTandaTangan + tinggiBaris;
    }

    var perluTinggi = tinggiBlok(kiri.concat(kanan)) + (tengah.length ? tinggiBlok(tengah) + 8 : 0);
    var y = mulaiY + 10;
    if (y + perluTinggi > tinggiHalaman - 12) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    function barisJabatan(daftar) {
      return daftar.reduce(function (maks, t) {
        return Math.max(maks, String(t.jabatan || '').split('\n').length);
      }, 0);
    }

    /* barisSejajar dipakai bersama kolom kiri & kanan supaya garis namanya sejajar */
    function gambarKelompok(daftar, x, atas, barisSejajar) {
      daftar.forEach(function (t) {
        String(t.jabatan || '').split('\n').forEach(function (teks, i) {
          doc.text(amankanTeks(teks), x, atas + i * tinggiBaris, { align: 'center' });
        });
      });
      var yNama = atas + barisSejajar * tinggiBaris + ruangTandaTangan;
      daftar.forEach(function (t) {
        doc.text(amankanTeks('(' + (t.nama || '..................') + ')'), x, yNama, { align: 'center' });
      });
      return yNama;
    }

    var yBawah = y;
    var barisAtas = barisJabatan(kiri.concat(kanan));
    if (kiri.length) yBawah = Math.max(yBawah, gambarKelompok(kiri, tepi + lebarGuna * 0.28, y, barisAtas));
    if (kanan.length) yBawah = Math.max(yBawah, gambarKelompok(kanan, tepi + lebarGuna * 0.75, y, barisAtas));
    if (tengah.length) {
      var yTengah = (kiri.length || kanan.length) ? yBawah + 10 : y;
      if (yTengah + tinggiBlok(tengah) > tinggiHalaman - 12) {
        doc.addPage();
        yTengah = 20;
      }
      gambarKelompok(tengah, tepi + lebarGuna * 0.5, yTengah, barisJabatan(tengah));
    }
  }

  function buatDokumen(laporan) {
    var jsPDF = global.jspdf.jsPDF;
    var doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    var tepi = 10;
    var lebarGuna = doc.internal.pageSize.getWidth() - tepi * 2;

    doc.setProperties({
      title: laporan.meta.judul || 'Laporan Keuangan',
      creator: 'Aplikasi Laporan Keuangan Masjid'
    });

    doc.autoTable({
      startY: tepi,
      margin: { left: tepi, right: tepi, top: tepi, bottom: 12 },
      theme: 'grid',
      head: [
        [{
          content: amankanTeks(laporan.meta.judul || 'LAPORAN KEUANGAN'),
          colSpan: 5,
          styles: { fillColor: WARNA.judul, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 10 }
        }],
        [
          { content: 'Tanggal', rowSpan: 2 },
          { content: 'Keterangan', rowSpan: 2 },
          'Kredit', 'Debit', 'Saldo'
        ],
        ['Rp', 'Rp', 'Rp']
      ],
      body: susunBody(laporan),
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: { top: 1.1, bottom: 1.1, left: 1.6, right: 1.6 },
        lineColor: WARNA.garis,
        lineWidth: 0.15,
        textColor: WARNA.teks,
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: WARNA.kepala,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineColor: WARNA.garis,
        lineWidth: 0.15
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: lebarGuna - 20 - 26 * 3, halign: 'left' },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 26, halign: 'right' }
      },
      didDrawPage: function (data) {
        var halaman = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text('Halaman ' + halaman, doc.internal.pageSize.getWidth() - tepi, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        data.settings.margin.top = tepi;
      }
    });

    gambarTandaTangan(doc, laporan, doc.lastAutoTable.finalY, tepi, lebarGuna);
    return doc;
  }

  function unduh(laporan, namaBerkas) {
    buatDokumen(laporan).save(namaBerkas);
  }

  global.ExportPdf = { buatDokumen: buatDokumen, unduh: unduh };
})(window);
