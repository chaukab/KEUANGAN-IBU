/*
 * store.js — penyimpanan data di browser (localStorage) + cadangan berkas JSON.
 * Data tidak pernah dikirim ke mana pun; semuanya tersimpan di komputer pengguna.
 */
(function (global) {
  'use strict';

  var KUNCI = 'laporan-keuangan-masjid/v1';

  function tersedia() {
    try {
      var uji = '__uji__';
      global.localStorage.setItem(uji, '1');
      global.localStorage.removeItem(uji);
      return true;
    } catch (e) {
      return false;
    }
  }

  function muat() {
    if (!tersedia()) return null;
    try {
      var mentah = global.localStorage.getItem(KUNCI);
      if (!mentah) return null;
      return global.Model.normalisasi(JSON.parse(mentah));
    } catch (e) {
      return null;
    }
  }

  function simpan(data) {
    if (!tersedia()) return false;
    try {
      global.localStorage.setItem(KUNCI, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function hapus() {
    if (!tersedia()) return;
    try {
      global.localStorage.removeItem(KUNCI);
    } catch (e) { /* diabaikan */ }
  }

  function simpanBlob(blob, namaBerkas) {
    var url = global.URL.createObjectURL(blob);
    var tautan = global.document.createElement('a');
    tautan.href = url;
    tautan.download = namaBerkas;
    global.document.body.appendChild(tautan);
    tautan.click();
    global.document.body.removeChild(tautan);
    global.setTimeout(function () { global.URL.revokeObjectURL(url); }, 1500);
  }

  function unduhJson(data, namaBerkas) {
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    simpanBlob(blob, namaBerkas);
  }

  function bacaJson(berkas) {
    return new Promise(function (selesai, gagal) {
      var pembaca = new FileReader();
      pembaca.onload = function () {
        try {
          selesai(global.Model.normalisasi(JSON.parse(pembaca.result)));
        } catch (e) {
          gagal(new Error('Berkas bukan cadangan JSON yang sah.'));
        }
      };
      pembaca.onerror = function () { gagal(new Error('Berkas gagal dibaca.')); };
      pembaca.readAsText(berkas);
    });
  }

  global.Store = {
    KUNCI: KUNCI,
    tersedia: tersedia,
    muat: muat,
    simpan: simpan,
    hapus: hapus,
    unduhJson: unduhJson,
    bacaJson: bacaJson
  };
  global.Unduh = { simpanBlob: simpanBlob };
})(window);
