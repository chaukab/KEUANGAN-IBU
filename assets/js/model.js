/*
 * model.js — struktur data laporan + seluruh perhitungan saldo.
 *
 * Aturan hitung (dipakai sama persis di layar, PDF, dan rumus Excel):
 *   Saldo baris pertama  = Kredit - Debit
 *   Saldo baris ke-n     = Saldo baris ke-(n-1) + Kredit - Debit
 *   Total Kredit         = SUM(seluruh Kredit bagian tsb)
 *   Total Debit          = SUM(seluruh Debit bagian tsb)
 *   Saldo Akhir          = Total Kredit - Total Debit
 */
(function (global) {
  'use strict';

  var F = global.Format;

  function idBaru(awalan) {
    return awalan + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
  }

  function entri(tanggal, keterangan, kredit, debit) {
    return {
      id: idBaru('e'),
      tanggal: tanggal,
      keterangan: keterangan,
      kredit: kredit || 0,
      debit: debit || 0
    };
  }

  /* Data awal = isi laporan pada contoh gambar, supaya pengguna langsung punya acuan. */
  function dataContoh() {
    return {
      versi: 1,
      meta: {
        judul: 'LAPORAN KEUANGAN MASJID ASY-SYIFA',
        periodeMulai: '2026-06-17',
        periodeSelesai: '2026-08-10',
        tempat: '',
        tanggalTandaTangan: '',
        tandaTangan: [
          { jabatan: 'Yang Membuat Laporan,\nBendahara 1,', nama: 'Chondro Rubyarno', kolom: 'kiri' },
          { jabatan: 'Bendahara 2,', nama: 'Slamet Widodo', kolom: 'kanan' },
          { jabatan: 'Mengetahui/Menyetujui,\nKetua Takmir,', nama: 'Edi Margono', kolom: 'tengah' }
        ]
      },
      bagian: [
        {
          id: idBaru('b'),
          nama: 'PEMBANGUNAN DAN SARPRAS (Jariah)',
          sumber: 'Rekening Masjid Asy-Syifa BSI 7348812127',
          tanggalTotal: '2026-08-10',
          entri: [
            entri('2026-06-17', 'Saldo Awal', 937212, 0),
            entri('2026-07-24', 'Pemasukan QRIS', 400020, 0),
            entri('2026-07-26', 'Pengadaan Kursi Majelis dari Hamba Allah', 700700, 700700),
            entri('2026-07-26', 'Pengadaan Kipas Angin Blower', 0, 717100),
            entri('2026-07-30', 'Admin Bank 5 Bulan (5 x Rp 10.000,-)', 0, 50000),
            entri('2026-08-10', 'Shodaqoh dari Ibu Sumiyatun RT01/RW08 Tambakrejo, Purworejo', 500000, 0)
          ]
        },
        {
          id: idBaru('b'),
          nama: 'OPERASIONAL DAN KEGIATAN (Kotak Infaq)',
          sumber: 'Uang Cash Bendahara 2',
          tanggalTotal: '2026-08-10',
          entri: [
            entri('2026-06-17', 'Saldo Awal', 6926500, 0),
            entri('2026-07-01', 'Token Listrik', 0, 200000),
            entri('2026-07-01', 'Imbalan Marbot (Rp 100.000,- x 6 Minggu)', 0, 600000),
            entri('2026-07-01', 'Alat Pembersih dalam 1 Bulan', 0, 150000),
            entri('2026-07-01', 'Pengadaan Alat Hadroh', 0, 2750000),
            entri('2026-07-05', 'Infaq Masjid Asy-Syifa', 2680000, 0),
            entri('2026-07-08', 'Pembelian Snack Persiapan Maulid Nabi', 0, 50000),
            entri('2026-07-26', 'Pengadaan Sekat Siku', 0, 2209000),
            entri('2026-07-26', 'Pengadaan Isian Sekat Siku', 0, 591000),
            entri('2026-07-26', 'Token Listrik', 0, 200000),
            entri('2026-07-26', 'Pengadaan Lampu Emergency dan Piting', 0, 120000),
            entri('2026-07-26', 'Pengadaan Kotak Pertanyaan Akrilik', 0, 102364),
            entri('2026-07-27', 'Pembelian Barang:\n- Besi Siku 20 batang\n- Tripleks 2 lembar', 0, 1680000),
            entri('2026-08-01', 'Pembelian Sabun untuk Kamar Mandi', 0, 50000),
            entri('2026-08-03', 'Pembelian Barang:\n- Baut 30 buah\n- Siku 20 batang', 0, 39500),
            entri('2026-08-03', 'Infaq Masjid Asy-Syifa', 1918000, 0),
            entri('2026-08-10', 'Pembelian Barang:\n- Baut 100 buah\n- Siku 20 batang', 0, 80000)
          ]
        },
        {
          id: idBaru('b'),
          nama: 'DANA SOSIAL',
          sumber: '',
          tanggalTotal: '2026-08-09',
          entri: [
            entri('2026-06-17', 'Saldo Awal', 811000, 0),
            entri('2026-06-26', 'Besuk Bu Siti', 0, 200000),
            entri('2026-07-06', 'Dana Sosial', 455000, 0),
            entri('2026-07-18', 'Besuk Bu Novi dan Bu Mutaat', 0, 400000),
            entri('2026-07-20', 'Dana Sosial', 210000, 0),
            entri('2026-08-02', 'Besuk Bu Afi Istri Pak Arif', 0, 200000),
            entri('2026-08-03', 'Dana Sosial', 291000, 0),
            entri('2026-08-09', 'Besuk Bu Sri Jumiyati', 0, 200000),
            entri('2026-08-09',
              'Mangayubagyo Ibu Hj. Mariana RT03/RW05 Tambak Rejo\n' +
              '- Kas Sosial Masjid Asy-Syifa (Rp 230.000,-)\n' +
              '- Omah Tambak Homestay (Rp 200.000,-)', 200000, 430000)
          ]
        }
      ]
    };
  }

  function dataKosong() {
    var d = dataContoh();
    d.bagian = [bagianBaru('BAGIAN BARU')];
    return d;
  }

  function bagianBaru(nama) {
    var hariIni = new Date().toISOString().slice(0, 10);
    return {
      id: idBaru('b'),
      nama: nama || 'BAGIAN BARU',
      sumber: '',
      tanggalTotal: hariIni,
      entri: [entri(hariIni, 'Saldo Awal', 0, 0)]
    };
  }

  function entriBaru(tanggalAcuan) {
    return entri(tanggalAcuan || new Date().toISOString().slice(0, 10), '', 0, 0);
  }

  /*
   * Menghitung saldo berjalan satu bagian.
   * Hasil: { baris: [{...entri, saldo, nomor}], totalKredit, totalDebit, saldoAkhir }
   */
  function hitungBagian(bagian) {
    var saldo = 0;
    var totalKredit = 0;
    var totalDebit = 0;
    var baris = (bagian.entri || []).map(function (e, i) {
      var kredit = F.bulatkan(e.kredit);
      var debit = F.bulatkan(e.debit);
      saldo = F.bulatkan(saldo + kredit - debit);
      totalKredit = F.bulatkan(totalKredit + kredit);
      totalDebit = F.bulatkan(totalDebit + debit);
      return {
        id: e.id,
        nomor: i + 1,
        tanggal: e.tanggal,
        keterangan: e.keterangan,
        kredit: kredit,
        debit: debit,
        saldo: saldo
      };
    });
    return {
      baris: baris,
      totalKredit: totalKredit,
      totalDebit: totalDebit,
      saldoAkhir: F.bulatkan(totalKredit - totalDebit)
    };
  }

  /* Menghitung seluruh bagian sekaligus + rekapitulasi keseluruhan. */
  function hitungLaporan(data) {
    var bagian = (data.bagian || []).map(function (b) {
      var h = hitungBagian(b);
      return {
        id: b.id,
        nama: b.nama,
        sumber: b.sumber,
        tanggalTotal: b.tanggalTotal,
        baris: h.baris,
        totalKredit: h.totalKredit,
        totalDebit: h.totalDebit,
        saldoAkhir: h.saldoAkhir
      };
    });
    var rekap = bagian.reduce(function (acc, b) {
      acc.totalKredit = F.bulatkan(acc.totalKredit + b.totalKredit);
      acc.totalDebit = F.bulatkan(acc.totalDebit + b.totalDebit);
      acc.saldoAkhir = F.bulatkan(acc.saldoAkhir + b.saldoAkhir);
      return acc;
    }, { totalKredit: 0, totalDebit: 0, saldoAkhir: 0 });
    return { meta: data.meta, bagian: bagian, rekap: rekap };
  }

  /* Merapikan data hasil impor JSON agar tidak merusak aplikasi. */
  function normalisasi(data) {
    var dasar = dataContoh();
    if (!data || typeof data !== 'object') return dasar;
    var meta = Object.assign({}, dasar.meta, data.meta || {});
    if (!Array.isArray(meta.tandaTangan) || !meta.tandaTangan.length) {
      meta.tandaTangan = dasar.meta.tandaTangan;
    }
    var bagian = Array.isArray(data.bagian) ? data.bagian : dasar.bagian;
    return {
      versi: 1,
      meta: meta,
      bagian: bagian.map(function (b) {
        return {
          id: b.id || idBaru('b'),
          nama: String(b.nama || 'BAGIAN'),
          sumber: String(b.sumber || ''),
          tanggalTotal: b.tanggalTotal || '',
          entri: (Array.isArray(b.entri) ? b.entri : []).map(function (e) {
            return {
              id: e.id || idBaru('e'),
              tanggal: e.tanggal || '',
              keterangan: String(e.keterangan || ''),
              kredit: F.bulatkan(e.kredit),
              debit: F.bulatkan(e.debit)
            };
          })
        };
      })
    };
  }

  global.Model = {
    idBaru: idBaru,
    dataContoh: dataContoh,
    dataKosong: dataKosong,
    bagianBaru: bagianBaru,
    entriBaru: entriBaru,
    hitungBagian: hitungBagian,
    hitungLaporan: hitungLaporan,
    normalisasi: normalisasi
  };
})(window);
