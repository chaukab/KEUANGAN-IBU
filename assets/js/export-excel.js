/*
 * export-excel.js — menyusun file .xlsx memakai ExcelJS.
 *
 * Nilai pada kolom Saldo dan seluruh baris Total TIDAK ditulis sebagai angka mati,
 * melainkan sebagai RUMUS Excel yang hidup, sehingga saat angka Kredit/Debit diubah
 * di Excel, saldo ikut menyesuaikan. Sheet "Rumus" mendokumentasikan setiap rumus
 * beserta sel asal datanya.
 */
(function (global) {
  'use strict';

  var F = global.Format;

  var WARNA = {
    judul: 'FF1F4E79',
    kepala: 'FF2E75B6',
    bagian: 'FF2E75B6',
    total: 'FFDDEBF7',
    garis: 'FF9BC2E6',
    zebra: 'FFF7FBFF'
  };

  var FMT = {
    kredit: '#,##0.00;-#,##0.00;"-"',
    debit: '(#,##0.00);(#,##0.00);"-"',
    saldo: '#,##0.00;(#,##0.00);"-"'
  };

  function garis() {
    var g = { style: 'thin', color: { argb: WARNA.garis } };
    return { top: g, left: g, bottom: g, right: g };
  }

  function isi(argb) {
    return { type: 'pattern', pattern: 'solid', fgColor: { argb: argb } };
  }

  function jumlahBaris(teks) {
    return String(teks || '').split('\n').length;
  }

  /* Membangun sheet "Laporan" dan mengembalikan peta sel untuk dipakai sheet lain. */
  function tulisLaporan(ws, laporan) {
    ws.columns = [
      { key: 'tanggal', width: 13 },
      { key: 'keterangan', width: 52 },
      { key: 'kredit', width: 17 },
      { key: 'debit', width: 17 },
      { key: 'saldo', width: 17 }
    ];

    var peta = { bagian: [] };
    var r = 1;

    /* --- Judul --- */
    ws.mergeCells(r, 1, r, 5);
    var selJudul = ws.getCell(r, 1);
    selJudul.value = laporan.meta.judul || 'LAPORAN KEUANGAN';
    selJudul.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    selJudul.alignment = { horizontal: 'center', vertical: 'middle' };
    selJudul.fill = isi(WARNA.judul);
    selJudul.border = garis();
    ws.getRow(r).height = 20;
    r += 1;

    /* --- Kepala tabel (2 baris: nama kolom + satuan "Rp") --- */
    var barisKepala = r;
    ws.mergeCells(r, 1, r + 1, 1);
    ws.mergeCells(r, 2, r + 1, 2);
    ws.getCell(r, 1).value = 'Tanggal';
    ws.getCell(r, 2).value = 'Keterangan';
    ws.getCell(r, 3).value = 'Kredit';
    ws.getCell(r, 4).value = 'Debit';
    ws.getCell(r, 5).value = 'Saldo';
    ws.getCell(r + 1, 3).value = 'Rp';
    ws.getCell(r + 1, 4).value = 'Rp';
    ws.getCell(r + 1, 5).value = 'Rp';
    [r, r + 1].forEach(function (baris) {
      for (var c = 1; c <= 5; c += 1) {
        var sel = ws.getCell(baris, c);
        sel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sel.alignment = { horizontal: 'center', vertical: 'middle' };
        sel.fill = isi(WARNA.kepala);
        sel.border = garis();
      }
      ws.getRow(baris).height = 18;
    });
    r += 2;

    /* --- Isi tiap bagian --- */
    laporan.bagian.forEach(function (bagian) {
      ws.mergeCells(r, 1, r, 5);
      var selBagian = ws.getCell(r, 1);
      selBagian.value = bagian.sumber
        ? bagian.nama + ' → ' + bagian.sumber
        : bagian.nama;
      selBagian.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      selBagian.alignment = { horizontal: 'center', vertical: 'middle' };
      selBagian.fill = isi(WARNA.bagian);
      selBagian.border = garis();
      ws.getRow(r).height = 18;
      r += 1;

      var barisPertama = r;
      bagian.baris.forEach(function (baris, i) {
        var selTanggal = ws.getCell(r, 1);
        selTanggal.value = F.tanggalRingkas(baris.tanggal);
        selTanggal.alignment = { horizontal: 'center', vertical: 'middle' };

        var selKeterangan = ws.getCell(r, 2);
        selKeterangan.value = baris.keterangan;
        selKeterangan.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

        var selKredit = ws.getCell(r, 3);
        selKredit.value = baris.kredit;
        selKredit.numFmt = FMT.kredit;

        var selDebit = ws.getCell(r, 4);
        selDebit.value = baris.debit;
        selDebit.numFmt = FMT.debit;

        /* Saldo = rumus, bukan angka mati */
        var selSaldo = ws.getCell(r, 5);
        selSaldo.value = {
          formula: i === 0 ? ('C' + r + '-D' + r) : ('E' + (r - 1) + '+C' + r + '-D' + r),
          result: baris.saldo
        };
        selSaldo.numFmt = FMT.saldo;

        for (var c = 1; c <= 5; c += 1) {
          var sel = ws.getCell(r, c);
          sel.border = garis();
          if (c >= 3) sel.alignment = { horizontal: 'right', vertical: 'middle' };
        }
        ws.getRow(r).height = Math.max(15, jumlahBaris(baris.keterangan) * 14.5);
        r += 1;
      });
      var barisTerakhir = r - 1;

      /* --- Baris Total --- */
      var barisTotal = r;
      ws.getCell(r, 1).value = F.tanggalPenuh(bagian.tanggalTotal);
      ws.getCell(r, 2).value = 'Total';
      ws.getCell(r, 3).value = {
        formula: 'SUM(C' + barisPertama + ':C' + barisTerakhir + ')',
        result: bagian.totalKredit
      };
      ws.getCell(r, 4).value = {
        formula: 'SUM(D' + barisPertama + ':D' + barisTerakhir + ')',
        result: bagian.totalDebit
      };
      ws.getCell(r, 5).value = {
        formula: 'C' + barisTotal + '-D' + barisTotal,
        result: bagian.saldoAkhir
      };
      ws.getCell(r, 3).numFmt = FMT.kredit;
      ws.getCell(r, 4).numFmt = FMT.debit;
      ws.getCell(r, 5).numFmt = FMT.saldo;
      for (var c2 = 1; c2 <= 5; c2 += 1) {
        var selT = ws.getCell(r, c2);
        selT.font = { bold: true };
        selT.fill = isi(WARNA.total);
        selT.border = garis();
        selT.alignment = c2 === 1
          ? { horizontal: 'center', vertical: 'middle' }
          : (c2 === 2 ? { horizontal: 'left', vertical: 'middle' } : { horizontal: 'right', vertical: 'middle' });
      }
      ws.getCell(r, 3).note = 'Rumus: =SUM(C' + barisPertama + ':C' + barisTerakhir + ') — menjumlahkan seluruh Kredit bagian ini.';
      ws.getCell(r, 4).note = 'Rumus: =SUM(D' + barisPertama + ':D' + barisTerakhir + ') — menjumlahkan seluruh Debit bagian ini.';
      ws.getCell(r, 5).note = 'Rumus: =C' + barisTotal + '-D' + barisTotal + ' — Total Kredit dikurangi Total Debit.';
      r += 1;

      peta.bagian.push({
        nama: bagian.nama,
        barisPertama: barisPertama,
        barisTerakhir: barisTerakhir,
        barisTotal: barisTotal
      });
    });

    /* --- Blok tanda tangan --- */
    r += 2;
    var ttd = laporan.meta.tandaTangan || [];
    var kiri = ttd.filter(function (t) { return t.kolom !== 'kanan' && t.kolom !== 'tengah'; });
    var kanan = ttd.filter(function (t) { return t.kolom === 'kanan'; });
    var tengah = ttd.filter(function (t) { return t.kolom === 'tengah'; });

    function tulisJabatan(daftar, kolom, mulai) {
      var maksimum = 0;
      daftar.forEach(function (t) {
        var garisJabatan = String(t.jabatan || '').split('\n');
        garisJabatan.forEach(function (teks, i) {
          var sel = ws.getCell(mulai + i, kolom);
          sel.value = teks;
          sel.alignment = { horizontal: 'center' };
        });
        maksimum = Math.max(maksimum, garisJabatan.length);
      });
      return maksimum;
    }

    function tulisNama(daftar, kolom, baris) {
      daftar.forEach(function (t) {
        var sel = ws.getCell(baris, kolom);
        sel.value = '(' + (t.nama || '..................') + ')';
        sel.alignment = { horizontal: 'center' };
      });
    }

    if (kiri.length || kanan.length) {
      var tinggi = Math.max(tulisJabatan(kiri, 2, r), tulisJabatan(kanan, 4, r));
      var barisNama = r + tinggi + 3;
      tulisNama(kiri, 2, barisNama);
      tulisNama(kanan, 4, barisNama);
      r = barisNama + 2;
    }
    if (tengah.length) {
      var tinggiTengah = tulisJabatan(tengah, 3, r);
      tulisNama(tengah, 3, r + tinggiTengah + 3);
      r = r + tinggiTengah + 4;
    }

    ws.views = [{ state: 'frozen', ySplit: barisKepala + 1 }];
    ws.pageSetup = {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
      printTitlesRow: '1:' + (barisKepala + 1)
    };

    return peta;
  }

  /* Sheet "Ringkasan": seluruh angkanya mengambil dari sheet Laporan lewat rumus. */
  function tulisRingkasan(ws, laporan, peta) {
    ws.columns = [
      { width: 5 }, { width: 46 }, { width: 18 }, { width: 18 }, { width: 18 }
    ];
    ws.mergeCells('A1:E1');
    var judul = ws.getCell('A1');
    judul.value = 'RINGKASAN — ' + (laporan.meta.judul || 'LAPORAN KEUANGAN');
    judul.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    judul.alignment = { horizontal: 'center' };
    judul.fill = isi(WARNA.judul);
    judul.border = garis();

    var kepala = ['No', 'Bagian / Sumber Dana', 'Total Kredit', 'Total Debit', 'Saldo Akhir'];
    kepala.forEach(function (teks, i) {
      var sel = ws.getCell(3, i + 1);
      sel.value = teks;
      sel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      sel.alignment = { horizontal: 'center', vertical: 'middle' };
      sel.fill = isi(WARNA.kepala);
      sel.border = garis();
    });

    var r = 4;
    var pertama = r;
    peta.bagian.forEach(function (b, i) {
      var sumber = laporan.bagian[i];
      ws.getCell(r, 1).value = i + 1;
      ws.getCell(r, 2).value = sumber.sumber ? b.nama + ' (' + sumber.sumber + ')' : b.nama;
      ws.getCell(r, 3).value = { formula: 'Laporan!C' + b.barisTotal, result: sumber.totalKredit };
      ws.getCell(r, 4).value = { formula: 'Laporan!D' + b.barisTotal, result: sumber.totalDebit };
      ws.getCell(r, 5).value = { formula: 'Laporan!E' + b.barisTotal, result: sumber.saldoAkhir };
      ws.getCell(r, 3).numFmt = FMT.kredit;
      ws.getCell(r, 4).numFmt = FMT.debit;
      ws.getCell(r, 5).numFmt = FMT.saldo;
      ws.getCell(r, 1).alignment = { horizontal: 'center' };
      ws.getCell(r, 2).alignment = { horizontal: 'left', wrapText: true };
      for (var c = 1; c <= 5; c += 1) ws.getCell(r, c).border = garis();
      r += 1;
    });
    var terakhir = r - 1;

    ws.mergeCells(r, 1, r, 2);
    ws.getCell(r, 1).value = 'TOTAL SELURUH KAS MASJID';
    ws.getCell(r, 3).value = { formula: 'SUM(C' + pertama + ':C' + terakhir + ')', result: laporan.rekap.totalKredit };
    ws.getCell(r, 4).value = { formula: 'SUM(D' + pertama + ':D' + terakhir + ')', result: laporan.rekap.totalDebit };
    ws.getCell(r, 5).value = { formula: 'SUM(E' + pertama + ':E' + terakhir + ')', result: laporan.rekap.saldoAkhir };
    ws.getCell(r, 3).numFmt = FMT.kredit;
    ws.getCell(r, 4).numFmt = FMT.debit;
    ws.getCell(r, 5).numFmt = FMT.saldo;
    for (var c3 = 1; c3 <= 5; c3 += 1) {
      var sel2 = ws.getCell(r, c3);
      sel2.font = { bold: true };
      sel2.fill = isi(WARNA.total);
      sel2.border = garis();
      if (c3 >= 3) sel2.alignment = { horizontal: 'right' };
    }
    return { barisPertama: pertama, barisTerakhir: terakhir, barisTotal: r };
  }

  /* Sheet "Rumus": daftar lengkap setiap rumus dan dari sel mana angkanya diambil. */
  function tulisRumus(ws, laporan, peta, petaRingkasan) {
    ws.columns = [
      { width: 10 }, { width: 22 }, { width: 13 }, { width: 30 }, { width: 62 }, { width: 18 }
    ];
    ws.mergeCells('A1:F1');
    var judul = ws.getCell('A1');
    judul.value = 'PENJELASAN RUMUS — setiap angka di sheet Laporan diambil dari mana';
    judul.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
    judul.alignment = { horizontal: 'center' };
    judul.fill = isi(WARNA.judul);
    judul.border = garis();

    ws.mergeCells('A2:F2');
    var catatan = ws.getCell('A2');
    catatan.value = 'Kolom pada sheet Laporan: A = Tanggal, B = Keterangan, C = Kredit (uang masuk), '
      + 'D = Debit (uang keluar, ditampilkan dalam kurung), E = Saldo. '
      + 'Ubah angka di kolom C dan D, maka kolom E dan baris Total ikut terhitung otomatis.';
    catatan.alignment = { horizontal: 'left', wrapText: true };
    catatan.font = { italic: true };
    ws.getRow(2).height = 30;

    var r = 4;
    function barisKepala() {
      ['Bagian', 'Uraian', 'Sel', 'Rumus di Excel', 'Angkanya diambil dari', 'Hasil'].forEach(function (teks, i) {
        var sel = ws.getCell(r, i + 1);
        sel.value = teks;
        sel.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sel.alignment = { horizontal: 'center', vertical: 'middle' };
        sel.fill = isi(WARNA.kepala);
        sel.border = garis();
      });
      r += 1;
    }
    barisKepala();

    function tambah(bagian, uraian, sel, rumus, asal, refHasil, hasil) {
      var nilai = [bagian, uraian, sel, rumus, asal];
      nilai.forEach(function (v, i) {
        var c = ws.getCell(r, i + 1);
        c.value = v;
        c.alignment = { horizontal: i >= 2 && i <= 3 ? 'left' : 'left', vertical: 'top', wrapText: true };
        c.border = garis();
      });
      var selHasil = ws.getCell(r, 6);
      if (refHasil) {
        selHasil.value = { formula: refHasil, result: hasil };
        selHasil.numFmt = FMT.saldo;
      }
      selHasil.alignment = { horizontal: 'right', vertical: 'top' };
      selHasil.border = garis();
      r += 1;
    }

    peta.bagian.forEach(function (b, idx) {
      var sumber = laporan.bagian[idx];

      ws.mergeCells(r, 1, r, 6);
      var selJudulBagian = ws.getCell(r, 1);
      selJudulBagian.value = (idx + 1) + '. ' + b.nama
        + ' — baris ' + b.barisPertama + ' s.d. ' + b.barisTerakhir
        + ' pada sheet Laporan (Total di baris ' + b.barisTotal + ')';
      selJudulBagian.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      selJudulBagian.fill = isi(WARNA.bagian);
      selJudulBagian.border = garis();
      r += 1;

      sumber.baris.forEach(function (baris, i) {
        var nomorBaris = b.barisPertama + i;
        var potongan = String(baris.keterangan || '').split('\n')[0];
        if (i === 0) {
          tambah(
            'Bagian ' + (idx + 1),
            'Saldo setelah: ' + (potongan || 'baris pertama'),
            'E' + nomorBaris,
            '=C' + nomorBaris + '-D' + nomorBaris,
            'Kredit (C' + nomorBaris + ') dikurangi Debit (D' + nomorBaris + '). '
              + 'Baris pertama bagian ini, jadi tidak ada saldo sebelumnya.',
            'Laporan!E' + nomorBaris,
            baris.saldo
          );
        } else {
          tambah(
            'Bagian ' + (idx + 1),
            'Saldo setelah: ' + (potongan || 'baris ' + (i + 1)),
            'E' + nomorBaris,
            '=E' + (nomorBaris - 1) + '+C' + nomorBaris + '-D' + nomorBaris,
            'Saldo baris sebelumnya (E' + (nomorBaris - 1) + ') + Kredit (C' + nomorBaris + ') '
              + '- Debit (D' + nomorBaris + ')',
            'Laporan!E' + nomorBaris,
            baris.saldo
          );
        }
      });

      tambah('Bagian ' + (idx + 1), 'Total Kredit', 'C' + b.barisTotal,
        '=SUM(C' + b.barisPertama + ':C' + b.barisTerakhir + ')',
        'Penjumlahan seluruh Kredit dari baris ' + b.barisPertama + ' sampai ' + b.barisTerakhir + '.',
        'Laporan!C' + b.barisTotal, sumber.totalKredit);

      tambah('Bagian ' + (idx + 1), 'Total Debit', 'D' + b.barisTotal,
        '=SUM(D' + b.barisPertama + ':D' + b.barisTerakhir + ')',
        'Penjumlahan seluruh Debit dari baris ' + b.barisPertama + ' sampai ' + b.barisTerakhir + '.',
        'Laporan!D' + b.barisTotal, sumber.totalDebit);

      tambah('Bagian ' + (idx + 1), 'Saldo Akhir', 'E' + b.barisTotal,
        '=C' + b.barisTotal + '-D' + b.barisTotal,
        'Total Kredit (C' + b.barisTotal + ') dikurangi Total Debit (D' + b.barisTotal + '). '
          + 'Nilainya harus sama dengan saldo baris terakhir (E' + b.barisTerakhir + ').',
        'Laporan!E' + b.barisTotal, sumber.saldoAkhir);

      var selCek = ws.getCell(r, 5);
      ws.getCell(r, 1).value = 'Bagian ' + (idx + 1);
      ws.getCell(r, 2).value = 'Pemeriksaan';
      ws.getCell(r, 3).value = '-';
      ws.getCell(r, 4).value = '=IF(Laporan!E' + b.barisTotal + '=Laporan!E' + b.barisTerakhir + ',"COCOK","SELISIH")';
      selCek.value = 'Membandingkan Saldo Akhir (E' + b.barisTotal + ') dengan saldo baris terakhir (E'
        + b.barisTerakhir + '). Hasilnya harus COCOK.';
      ws.getCell(r, 6).value = {
        formula: 'IF(Laporan!E' + b.barisTotal + '=Laporan!E' + b.barisTerakhir + ',"COCOK","SELISIH")',
        result: 'COCOK'
      };
      for (var c = 1; c <= 6; c += 1) {
        var sel = ws.getCell(r, c);
        sel.border = garis();
        sel.alignment = { horizontal: c === 6 ? 'center' : 'left', vertical: 'top', wrapText: true };
        sel.font = { bold: c === 6 };
        if (c === 6) sel.fill = isi(WARNA.total);
      }
      r += 2;
    });

    ws.mergeCells(r, 1, r, 6);
    var selRingkasan = ws.getCell(r, 1);
    selRingkasan.value = 'Sheet Ringkasan — seluruh angkanya menunjuk langsung ke baris Total di sheet Laporan';
    selRingkasan.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    selRingkasan.fill = isi(WARNA.bagian);
    selRingkasan.border = garis();
    r += 1;

    peta.bagian.forEach(function (b, idx) {
      var barisRingkasan = petaRingkasan.barisPertama + idx;
      tambah('Ringkasan', b.nama, 'C' + barisRingkasan + ' : E' + barisRingkasan,
        '=Laporan!C' + b.barisTotal + ' / =Laporan!D' + b.barisTotal + ' / =Laporan!E' + b.barisTotal,
        'Menyalin baris Total bagian ini dari sheet Laporan (baris ' + b.barisTotal + ').',
        null, null);
    });
    tambah('Ringkasan', 'Total seluruh kas',
      'C' + petaRingkasan.barisTotal + ' : E' + petaRingkasan.barisTotal,
      '=SUM(C' + petaRingkasan.barisPertama + ':C' + petaRingkasan.barisTerakhir + ') dst.',
      'Menjumlahkan seluruh bagian yang ada di sheet Ringkasan.',
      null, null);

    ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  }

  function buatWorkbook(laporan) {
    var wb = new global.ExcelJS.Workbook();
    wb.creator = 'Aplikasi Laporan Keuangan Masjid';
    wb.created = new Date();
    /* Memaksa Excel menghitung ulang seluruh rumus saat berkas dibuka. */
    wb.calcProperties.fullCalcOnLoad = true;

    var wsLaporan = wb.addWorksheet('Laporan', { properties: { defaultRowHeight: 15 } });
    var peta = tulisLaporan(wsLaporan, laporan);

    var wsRingkasan = wb.addWorksheet('Ringkasan');
    var petaRingkasan = tulisRingkasan(wsRingkasan, laporan, peta);

    var wsRumus = wb.addWorksheet('Rumus');
    tulisRumus(wsRumus, laporan, peta, petaRingkasan);

    return wb;
  }

  function unduh(laporan, namaBerkas) {
    var wb = buatWorkbook(laporan);
    return wb.xlsx.writeBuffer().then(function (buffer) {
      var blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      global.Unduh.simpanBlob(blob, namaBerkas);
    });
  }

  global.ExportExcel = { buatWorkbook: buatWorkbook, unduh: unduh };
})(window);
