/*
 * app.js — penghubung antara data (model.js) dengan tampilan.
 * Alur: data mentah -> Model.hitungLaporan() -> tampilan editor & pratinjau -> ekspor.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var F = global.Format;
  var M = global.Model;
  var S = global.Store;

  var data = null;      /* data mentah yang disunting pengguna */
  var laporan = null;   /* hasil perhitungan dari data */
  var dom = {};
  var jedaSimpan = null;
  var jedaPesan = null;

  /* ------------------------------------------------------------------ bantu */

  function esc(teks) {
    return String(teks === null || teks === undefined ? '' : teks)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function angkaUntukIsian(n) {
    var nilai = F.bulatkan(n);
    if (!nilai) return '';
    return nilai.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function pesan(teks, galat) {
    var kotak = doc.getElementById('pesanToast');
    if (!kotak) {
      kotak = doc.createElement('div');
      kotak.id = 'pesanToast';
      doc.body.appendChild(kotak);
    }
    kotak.className = 'pesan' + (galat ? ' pesan--galat' : '');
    kotak.textContent = teks;
    kotak.hidden = false;
    global.clearTimeout(jedaPesan);
    jedaPesan = global.setTimeout(function () { kotak.hidden = true; }, galat ? 6000 : 3000);
  }

  function slug(teks) {
    return String(teks || 'laporan').toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'laporan';
  }

  function namaBerkas(ekstensi) {
    var bagianNama = [slug(data.meta.judul)];
    if (data.meta.periodeMulai) bagianNama.push(data.meta.periodeMulai);
    if (data.meta.periodeSelesai) bagianNama.push('sd-' + data.meta.periodeSelesai);
    return bagianNama.join('_') + '.' + ekstensi;
  }

  function hitung() {
    laporan = M.hitungLaporan(data);
  }

  function simpanNanti() {
    global.clearTimeout(jedaSimpan);
    jedaSimpan = global.setTimeout(function () {
      var berhasil = S.simpan(data);
      var jam = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      dom.status.textContent = berhasil
        ? 'Tersimpan otomatis di browser ini · ' + jam
        : 'Penyimpanan otomatis tidak tersedia — gunakan tombol Cadangkan JSON.';
    }, 400);
  }

  function cariBagian(id) {
    for (var i = 0; i < data.bagian.length; i += 1) {
      if (data.bagian[i].id === id) return { bagian: data.bagian[i], indeks: i };
    }
    return null;
  }

  function cariEntri(idBagian, idEntri) {
    var b = cariBagian(idBagian);
    if (!b) return null;
    for (var i = 0; i < b.bagian.entri.length; i += 1) {
      if (b.bagian.entri[i].id === idEntri) {
        return { bagian: b.bagian, entri: b.bagian.entri[i], indeks: i };
      }
    }
    return null;
  }

  function pindah(daftar, dari, ke) {
    if (ke < 0 || ke >= daftar.length) return false;
    var item = daftar.splice(dari, 1)[0];
    daftar.splice(ke, 0, item);
    return true;
  }

  /* --------------------------------------------------------------- tampilan */

  function renderInfo() {
    Array.prototype.forEach.call(doc.querySelectorAll('[data-meta]'), function (el) {
      el.value = data.meta[el.getAttribute('data-meta')] || '';
    });
  }

  function barisEntri(bagian, entri, hitungBaris, nomor, jumlah) {
    return ''
      + '<tr data-bagian="' + esc(bagian.id) + '" data-entri="' + esc(entri.id) + '">'
      + '<td class="nomor">' + nomor + '</td>'
      + '<td class="kolom-tanggal"><input type="date" data-field="tanggal" value="' + esc(entri.tanggal) + '"></td>'
      + '<td><textarea data-field="keterangan" rows="1" placeholder="Contoh: Pembelian Barang:&#10;- Besi Siku 20 batang">' + esc(entri.keterangan) + '</textarea></td>'
      + '<td class="kolom-angka"><input type="text" inputmode="decimal" class="angka" data-field="kredit" value="' + esc(angkaUntukIsian(entri.kredit)) + '" placeholder="0"></td>'
      + '<td class="kolom-angka"><input type="text" inputmode="decimal" class="angka" data-field="debit" value="' + esc(angkaUntukIsian(entri.debit)) + '" placeholder="0"></td>'
      + '<td class="kolom-saldo" data-saldo>' + esc(F.uang(hitungBaris.saldo)) + '</td>'
      + '<td class="kolom-aksi">'
      + '<button type="button" class="ikon" data-aksi="entri-naik" title="Naikkan baris"' + (nomor === 1 ? ' disabled' : '') + '>&#9650;</button> '
      + '<button type="button" class="ikon" data-aksi="entri-turun" title="Turunkan baris"' + (nomor === jumlah ? ' disabled' : '') + '>&#9660;</button> '
      + '<button type="button" class="ikon ikon--hapus" data-aksi="entri-hapus" title="Hapus baris">&#10005;</button>'
      + '</td>'
      + '</tr>';
  }

  function renderBagian() {
    dom.daftarBagian.innerHTML = data.bagian.map(function (bagian, i) {
      var dihitung = laporan.bagian[i];
      var baris = bagian.entri.map(function (entri, j) {
        return barisEntri(bagian, entri, dihitung.baris[j], j + 1, bagian.entri.length);
      }).join('');

      return ''
        + '<div class="kartu" data-kartu-bagian="' + esc(bagian.id) + '">'
        + '  <div class="kartu__kepala">'
        + '    <h2 class="kartu__judul">Bagian ' + (i + 1) + '</h2>'
        + '    <div class="kartu__aksi">'
        + '      <button type="button" class="tombol tombol--kecil" data-aksi="bagian-naik" data-bagian="' + esc(bagian.id) + '"' + (i === 0 ? ' disabled' : '') + '>&#9650; Naik</button>'
        + '      <button type="button" class="tombol tombol--kecil" data-aksi="bagian-turun" data-bagian="' + esc(bagian.id) + '"' + (i === data.bagian.length - 1 ? ' disabled' : '') + '>&#9660; Turun</button>'
        + '      <button type="button" class="tombol tombol--kecil" data-aksi="bagian-hapus" data-bagian="' + esc(bagian.id) + '">&#10005; Hapus Bagian</button>'
        + '    </div>'
        + '  </div>'
        + '  <div class="kisi">'
        + '    <label class="isian"><span>Nama bagian</span>'
        + '      <input type="text" data-bagian-field="nama" data-bagian="' + esc(bagian.id) + '" value="' + esc(bagian.nama) + '" placeholder="PEMBANGUNAN DAN SARPRAS (Jariah)"></label>'
        + '    <label class="isian"><span>Sumber dana (tampil setelah tanda &rarr;)</span>'
        + '      <input type="text" data-bagian-field="sumber" data-bagian="' + esc(bagian.id) + '" value="' + esc(bagian.sumber) + '" placeholder="Rekening Masjid Asy-Syifa BSI 7348812127"></label>'
        + '    <label class="isian"><span>Tanggal pada baris Total</span>'
        + '      <input type="date" data-bagian-field="tanggalTotal" data-bagian="' + esc(bagian.id) + '" value="' + esc(bagian.tanggalTotal) + '"></label>'
        + '  </div>'
        + '  <div class="gulir" style="margin-top:12px">'
        + '    <table class="tabel-entri">'
        + '      <thead><tr><th>#</th><th>Tanggal</th><th>Keterangan</th><th>Kredit (Rp)</th><th>Debit (Rp)</th><th>Saldo (Rp)</th><th>Aksi</th></tr></thead>'
        + '      <tbody>' + baris + '</tbody>'
        + '      <tfoot><tr>'
        + '        <td colspan="3" class="label">Total &mdash; ' + esc(F.tanggalPenuh(bagian.tanggalTotal) || '-') + '</td>'
        + '        <td data-total="kredit">' + esc(F.uang(dihitung.totalKredit)) + '</td>'
        + '        <td data-total="debit">' + esc(F.uangDebit(dihitung.totalDebit)) + '</td>'
        + '        <td data-total="saldo">' + esc(F.uang(dihitung.saldoAkhir)) + '</td>'
        + '        <td></td>'
        + '      </tr></tfoot>'
        + '    </table>'
        + '  </div>'
        + '  <div style="margin-top:10px">'
        + '    <button type="button" class="tombol tombol--tambah" data-aksi="entri-tambah" data-bagian="' + esc(bagian.id) + '">+ Tambah Baris Transaksi</button>'
        + '  </div>'
        + '</div>';
    }).join('');

    Array.prototype.forEach.call(dom.daftarBagian.querySelectorAll('textarea'), tumbuhkan);
  }

  function renderTtd() {
    var daftar = data.meta.tandaTangan || [];
    dom.daftarTtd.innerHTML = daftar.map(function (t, i) {
      return ''
        + '<div class="isian" data-ttd="' + i + '" style="gap:8px">'
        + '  <label class="isian"><span>Jabatan / keterangan (boleh beberapa baris)</span>'
        + '    <textarea data-ttd-field="jabatan" rows="2">' + esc(t.jabatan) + '</textarea></label>'
        + '  <label class="isian"><span>Nama</span>'
        + '    <input type="text" data-ttd-field="nama" value="' + esc(t.nama) + '"></label>'
        + '  <label class="isian"><span>Posisi</span>'
        + '    <select data-ttd-field="kolom">'
        + '      <option value="kiri"' + (t.kolom === 'kiri' || !t.kolom ? ' selected' : '') + '>Kiri</option>'
        + '      <option value="kanan"' + (t.kolom === 'kanan' ? ' selected' : '') + '>Kanan</option>'
        + '      <option value="tengah"' + (t.kolom === 'tengah' ? ' selected' : '') + '>Tengah (baris bawah)</option>'
        + '    </select></label>'
        + '  <button type="button" class="tombol tombol--kecil" data-aksi="ttd-hapus" data-ttd="' + i + '">&#10005; Hapus penanda tangan</button>'
        + '</div>';
    }).join('');
  }

  function renderRekap() {
    var r = laporan.rekap;
    dom.rekap.innerHTML = ''
      + '<div class="rekap__item"><div class="rekap__label">Total Kredit (masuk)</div>'
      + '<div class="rekap__nilai">' + esc(F.uang(r.totalKredit, { tampilkanNol: true })) + '</div></div>'
      + '<div class="rekap__item"><div class="rekap__label">Total Debit (keluar)</div>'
      + '<div class="rekap__nilai rekap__nilai--keluar">' + esc(F.uang(r.totalDebit, { tampilkanNol: true })) + '</div></div>'
      + '<div class="rekap__item"><div class="rekap__label">Saldo seluruh kas</div>'
      + '<div class="rekap__nilai rekap__nilai--sisa">' + esc(F.uang(r.saldoAkhir, { tampilkanNol: true })) + '</div></div>'
      + '<div class="rekap__item"><div class="rekap__label">Jumlah bagian / transaksi</div>'
      + '<div class="rekap__nilai">' + laporan.bagian.length + ' / '
      + laporan.bagian.reduce(function (n, b) { return n + b.baris.length; }, 0) + '</div></div>';
  }

  function renderPratinjau() {
    var isi = laporan.bagian.map(function (bagian) {
      var kepala = '<tr class="baris-bagian"><td colspan="5">'
        + esc(bagian.sumber ? bagian.nama + ' → ' + bagian.sumber : bagian.nama)
        + '</td></tr>';
      var baris = bagian.baris.map(function (b) {
        return '<tr>'
          + '<td class="tgl">' + esc(F.tanggalRingkas(b.tanggal)) + '</td>'
          + '<td class="ket">' + esc(b.keterangan) + '</td>'
          + '<td class="num">' + esc(F.uang(b.kredit)) + '</td>'
          + '<td class="num">' + esc(F.uangDebit(b.debit)) + '</td>'
          + '<td class="num">' + esc(F.uang(b.saldo)) + '</td>'
          + '</tr>';
      }).join('');
      var total = '<tr class="baris-total">'
        + '<td class="tgl">' + esc(F.tanggalPenuh(bagian.tanggalTotal)) + '</td>'
        + '<td class="ket">Total</td>'
        + '<td class="num">' + esc(F.uang(bagian.totalKredit)) + '</td>'
        + '<td class="num">' + esc(F.uangDebit(bagian.totalDebit)) + '</td>'
        + '<td class="num">' + esc(F.uang(bagian.saldoAkhir)) + '</td>'
        + '</tr>';
      return kepala + baris + total;
    }).join('');

    var ttd = data.meta.tandaTangan || [];
    function blok(t) {
      return '<div class="ttd__blok">'
        + '<div class="ttd__jabatan">' + esc(t.jabatan) + '</div>'
        + '<div class="ttd__ruang"></div>'
        + '<div class="ttd__nama">(' + esc(t.nama || '..................') + ')</div>'
        + '</div>';
    }
    var atas = ttd.filter(function (t) { return t.kolom !== 'tengah'; });
    var bawah = ttd.filter(function (t) { return t.kolom === 'tengah'; });
    var blokTtd = ''
      + (atas.length ? '<div class="ttd__baris">' + atas.map(blok).join('') + '</div>' : '')
      + (bawah.length ? '<div class="ttd__tengah">' + bawah.map(blok).join('') + '</div>' : '');

    dom.pratinjau.innerHTML = ''
      + '<table class="laporan">'
      + '<thead>'
      + '<tr><th colspan="5" class="judul-laporan">' + esc(data.meta.judul) + '</th></tr>'
      + '<tr><th rowspan="2">Tanggal</th><th rowspan="2">Keterangan</th><th>Kredit</th><th>Debit</th><th>Saldo</th></tr>'
      + '<tr><th>Rp</th><th>Rp</th><th>Rp</th></tr>'
      + '</thead>'
      + '<tbody>' + isi + '</tbody>'
      + '</table>'
      + '<div class="ttd">' + blokTtd + '</div>';
  }

  /* Memperbarui hanya angka hasil hitungan, agar kursor pengguna tidak melompat. */
  function perbaruiAngka() {
    hitung();
    data.bagian.forEach(function (bagian, i) {
      var dihitung = laporan.bagian[i];
      var kartu = dom.daftarBagian.querySelector('[data-kartu-bagian="' + bagian.id + '"]');
      if (!kartu) return;
      bagian.entri.forEach(function (entri, j) {
        var sel = kartu.querySelector('tr[data-entri="' + entri.id + '"] [data-saldo]');
        if (sel) sel.textContent = F.uang(dihitung.baris[j].saldo);
      });
      var kaki = kartu.querySelector('tfoot');
      if (kaki) {
        kaki.querySelector('[data-total="kredit"]').textContent = F.uang(dihitung.totalKredit);
        kaki.querySelector('[data-total="debit"]').textContent = F.uangDebit(dihitung.totalDebit);
        kaki.querySelector('[data-total="saldo"]').textContent = F.uang(dihitung.saldoAkhir);
        var label = kartu.querySelector('tfoot .label');
        if (label) label.innerHTML = 'Total &mdash; ' + esc(F.tanggalPenuh(bagian.tanggalTotal) || '-');
      }
    });
    renderRekap();
    renderPratinjau();
    simpanNanti();
  }

  function renderSemua() {
    hitung();
    renderInfo();
    renderBagian();
    renderTtd();
    renderRekap();
    renderPratinjau();
    simpanNanti();
  }

  function tumbuhkan(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(34, textarea.scrollHeight) + 'px';
  }

  /* -------------------------------------------------------------- peristiwa */

  function pasangPeristiwaEditor() {
    dom.daftarBagian.addEventListener('input', function (ev) {
      var el = ev.target;
      var idBagian = el.getAttribute('data-bagian')
        || (el.closest('tr') && el.closest('tr').getAttribute('data-bagian'));

      if (el.hasAttribute('data-bagian-field')) {
        var b = cariBagian(idBagian);
        if (!b) return;
        b.bagian[el.getAttribute('data-bagian-field')] = el.value;
        perbaruiAngka();
        return;
      }

      if (el.hasAttribute('data-field')) {
        var baris = el.closest('tr');
        var ref = cariEntri(baris.getAttribute('data-bagian'), baris.getAttribute('data-entri'));
        if (!ref) return;
        var kolom = el.getAttribute('data-field');
        if (kolom === 'kredit' || kolom === 'debit') {
          ref.entri[kolom] = F.bacaAngka(el.value);
        } else {
          ref.entri[kolom] = el.value;
          if (el.tagName === 'TEXTAREA') tumbuhkan(el);
        }
        perbaruiAngka();
      }
    });

    /* Merapikan tampilan angka setelah selesai mengetik */
    dom.daftarBagian.addEventListener('change', function (ev) {
      var el = ev.target;
      if (!el.classList.contains('angka')) return;
      el.value = angkaUntukIsian(F.bacaAngka(el.value));
    });

    dom.daftarBagian.addEventListener('click', function (ev) {
      var tombol = ev.target.closest('[data-aksi]');
      if (!tombol) return;
      var aksi = tombol.getAttribute('data-aksi');
      var baris = tombol.closest('tr');

      if (aksi === 'entri-tambah') {
        var b = cariBagian(tombol.getAttribute('data-bagian'));
        if (!b) return;
        var terakhir = b.bagian.entri[b.bagian.entri.length - 1];
        b.bagian.entri.push(M.entriBaru(terakhir ? terakhir.tanggal : b.bagian.tanggalTotal));
        renderSemua();
        var barisBaru = dom.daftarBagian.querySelector('[data-kartu-bagian="' + b.bagian.id + '"] tbody tr:last-child textarea');
        if (barisBaru) barisBaru.focus();
        return;
      }

      if (aksi === 'entri-hapus' || aksi === 'entri-naik' || aksi === 'entri-turun') {
        var ref = cariEntri(baris.getAttribute('data-bagian'), baris.getAttribute('data-entri'));
        if (!ref) return;
        if (aksi === 'entri-hapus') {
          if (!global.confirm('Hapus baris ini?')) return;
          ref.bagian.entri.splice(ref.indeks, 1);
          if (!ref.bagian.entri.length) ref.bagian.entri.push(M.entriBaru(ref.bagian.tanggalTotal));
        } else {
          pindah(ref.bagian.entri, ref.indeks, ref.indeks + (aksi === 'entri-naik' ? -1 : 1));
        }
        renderSemua();
        return;
      }

      if (aksi === 'bagian-hapus' || aksi === 'bagian-naik' || aksi === 'bagian-turun') {
        var bag = cariBagian(tombol.getAttribute('data-bagian'));
        if (!bag) return;
        if (aksi === 'bagian-hapus') {
          if (!global.confirm('Hapus bagian "' + bag.bagian.nama + '" beserta seluruh barisnya?')) return;
          data.bagian.splice(bag.indeks, 1);
          if (!data.bagian.length) data.bagian.push(M.bagianBaru());
        } else {
          pindah(data.bagian, bag.indeks, bag.indeks + (aksi === 'bagian-naik' ? -1 : 1));
        }
        renderSemua();
      }
    });
  }

  function pasangPeristiwaTtd() {
    dom.daftarTtd.addEventListener('input', function (ev) {
      var el = ev.target;
      if (!el.hasAttribute('data-ttd-field')) return;
      var indeks = Number(el.closest('[data-ttd]').getAttribute('data-ttd'));
      var t = data.meta.tandaTangan[indeks];
      if (!t) return;
      t[el.getAttribute('data-ttd-field')] = el.value;
      renderPratinjau();
      simpanNanti();
    });
    dom.daftarTtd.addEventListener('change', function (ev) {
      if (ev.target.getAttribute('data-ttd-field') === 'kolom') {
        var indeks = Number(ev.target.closest('[data-ttd]').getAttribute('data-ttd'));
        data.meta.tandaTangan[indeks].kolom = ev.target.value;
        renderPratinjau();
        simpanNanti();
      }
    });
    dom.daftarTtd.addEventListener('click', function (ev) {
      var tombol = ev.target.closest('[data-aksi="ttd-hapus"]');
      if (!tombol) return;
      data.meta.tandaTangan.splice(Number(tombol.getAttribute('data-ttd')), 1);
      renderTtd();
      renderPratinjau();
      simpanNanti();
    });
  }

  function gantiTab(nama) {
    Array.prototype.forEach.call(doc.querySelectorAll('.tab button'), function (b) {
      b.classList.toggle('aktif', b.getAttribute('data-tab') === nama);
    });
    doc.getElementById('panelEditor').hidden = nama !== 'editor';
    doc.getElementById('panelPratinjau').hidden = nama !== 'pratinjau';
  }

  function pasangPeristiwaUmum() {
    doc.querySelector('.tab').addEventListener('click', function (ev) {
      var tombol = ev.target.closest('[data-tab]');
      if (tombol) gantiTab(tombol.getAttribute('data-tab'));
    });

    doc.addEventListener('input', function (ev) {
      var el = ev.target;
      if (!el.hasAttribute || !el.hasAttribute('data-meta')) return;
      data.meta[el.getAttribute('data-meta')] = el.value;
      renderPratinjau();
      simpanNanti();
    });

    doc.querySelector('.bilah__aksi').addEventListener('click', function (ev) {
      var tombol = ev.target.closest('[data-aksi]');
      if (!tombol) return;
      var aksi = tombol.getAttribute('data-aksi');

      if (aksi === 'excel') {
        pesan('Menyusun berkas Excel…');
        global.ExportExcel.unduh(laporan, namaBerkas('xlsx')).then(function () {
          pesan('Berkas Excel berhasil diunduh (sheet Laporan, Ringkasan, dan Rumus).');
        })['catch'](function (e) {
          pesan('Gagal membuat Excel: ' + e.message, true);
        });
        return;
      }
      if (aksi === 'pdf') {
        try {
          global.ExportPdf.unduh(laporan, namaBerkas('pdf'));
          pesan('Berkas PDF berhasil diunduh.');
        } catch (e) {
          pesan('Gagal membuat PDF: ' + e.message, true);
        }
        return;
      }
      if (aksi === 'cetak') {
        gantiTab('pratinjau');
        global.setTimeout(function () { global.print(); }, 120);
        return;
      }
      if (aksi === 'cadangkan') {
        S.unduhJson(data, namaBerkas('json'));
        pesan('Cadangan JSON diunduh. Simpan berkas ini agar data bisa dibuka lagi kapan saja.');
        return;
      }
      if (aksi === 'muat') {
        dom.berkasJson.click();
        return;
      }
      if (aksi === 'reset') {
        if (!global.confirm('Mulai laporan baru? Seluruh data yang sekarang akan dihapus.\n\nDisarankan menekan "Cadangkan JSON" lebih dulu.')) return;
        var kosong = global.confirm('Tekan OK untuk mulai dengan data KOSONG.\nTekan Batal untuk memuat ulang CONTOH laporan.');
        data = kosong ? M.dataKosong() : M.dataContoh();
        renderSemua();
        pesan(kosong ? 'Laporan baru yang kosong sudah disiapkan.' : 'Contoh laporan dimuat ulang.');
      }
    });

    dom.berkasJson.addEventListener('change', function () {
      var berkas = dom.berkasJson.files && dom.berkasJson.files[0];
      if (!berkas) return;
      S.bacaJson(berkas).then(function (hasil) {
        data = hasil;
        renderSemua();
        pesan('Cadangan "' + berkas.name + '" berhasil dimuat.');
      })['catch'](function (e) {
        pesan(e.message, true);
      });
      dom.berkasJson.value = '';
    });
  }

  /* ------------------------------------------------------------------ mulai */

  function mulai() {
    dom.status = doc.getElementById('statusSimpan');
    dom.daftarBagian = doc.getElementById('daftarBagian');
    dom.daftarTtd = doc.getElementById('daftarTtd');
    dom.rekap = doc.getElementById('rekap');
    dom.pratinjau = doc.getElementById('pratinjau');
    dom.berkasJson = doc.getElementById('berkasJson');

    var tersimpan = S.muat();
    data = tersimpan || M.dataContoh();

    pasangPeristiwaEditor();
    pasangPeristiwaTtd();
    pasangPeristiwaUmum();

    doc.querySelector('[data-aksi="tambah-bagian"]').addEventListener('click', function () {
      data.bagian.push(M.bagianBaru('BAGIAN ' + (data.bagian.length + 1)));
      renderSemua();
      var kartu = dom.daftarBagian.lastElementChild;
      if (kartu) kartu.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    doc.querySelector('[data-aksi="tambah-ttd"]').addEventListener('click', function () {
      data.meta.tandaTangan.push({ jabatan: 'Jabatan,', nama: '', kolom: 'kiri' });
      renderTtd();
      renderPratinjau();
      simpanNanti();
    });

    renderSemua();
    dom.status.textContent = tersimpan
      ? 'Data terakhir dimuat dari browser ini.'
      : 'Menampilkan contoh laporan — silakan ubah sesuai kebutuhan.';

    if (!S.tersedia()) {
      pesan('Browser memblokir penyimpanan lokal. Gunakan tombol Cadangkan JSON untuk menyimpan data.', true);
    }
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', mulai);
  } else {
    mulai();
  }
})(window);
