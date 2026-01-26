const fs = require('fs');
const path = require('path');

console.log('\n=== Mac Icon Converter ===\n');
console.log('Untuk membuat file .icns untuk Mac, Anda memiliki beberapa opsi:\n');

console.log('1. Online Converter (Paling Mudah):');
console.log('   - Buka: https://cloudconvert.com/png-to-icns');
console.log('   - Upload: assets/kki-icon.png');
console.log('   - Download sebagai: kki-icon.icns');
console.log('   - Simpan di: assets/kki-icon.icns\n');

console.log('2. Menggunakan npm package (Cross-platform):');
console.log('   npm install -g electron-icon-builder');
console.log('   electron-icon-builder --input=./assets/kki-icon.png --output=./assets --flatten\n');

console.log('3. Di macOS (menggunakan iconutil):');
console.log('   Lihat instruksi lengkap di BUILD_MAC.md\n');

const icnsPath = path.join(__dirname, '..', 'assets', 'kki-icon.icns');
const pngPath = path.join(__dirname, '..', 'assets', 'kki-icon.png');

if (fs.existsSync(icnsPath)) {
  console.log('✓ File kki-icon.icns sudah ada!');
  console.log('  Lokasi:', icnsPath);
  console.log('\nAnda siap untuk build Mac installer dengan:');
  console.log('  npm run package:mac\n');
} else {
  console.log('✗ File kki-icon.icns belum ada!');
  if (fs.existsSync(pngPath)) {
    console.log('✓ File kki-icon.png ditemukan');
    console.log('\nSilakan konversi PNG ke ICNS menggunakan salah satu metode di atas.');
  } else {
    console.log('✗ File kki-icon.png juga tidak ditemukan!');
    console.log('  Pastikan icon ada di: assets/kki-icon.png');
  }
  console.log('');
}
