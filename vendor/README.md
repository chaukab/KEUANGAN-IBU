# vendor/

Pustaka pihak ketiga yang disalin apa adanya dari paket resminya, agar aplikasi
tetap berjalan tanpa koneksi internet. Berkas di folder ini tidak diubah sama
sekali.

| Berkas | Paket | Versi | Lisensi |
| --- | --- | --- | --- |
| `exceljs.min.js` | [exceljs](https://www.npmjs.com/package/exceljs) | 4.4.0 | MIT — `exceljs.LICENSE` |
| `jspdf.umd.min.js` | [jspdf](https://www.npmjs.com/package/jspdf) | 2.5.2 | MIT — `jspdf.LICENSE` |
| `jspdf.plugin.autotable.min.js` | [jspdf-autotable](https://www.npmjs.com/package/jspdf-autotable) | 3.8.4 | MIT — `jspdf-autotable.LICENSE` |

Cara memperbarui:

```sh
npm install exceljs@<versi> jspdf@<versi> jspdf-autotable@<versi>
cp node_modules/exceljs/dist/exceljs.min.js                          vendor/
cp node_modules/jspdf/dist/jspdf.umd.min.js                          vendor/
cp node_modules/jspdf-autotable/dist/jspdf.plugin.autotable.min.js   vendor/
```
