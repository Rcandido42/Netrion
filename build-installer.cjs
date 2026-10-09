const inno = require('innosetup-compiler');
const path = require('path');

const issPath = path.join(__dirname, 'installer.iss');
console.log('Compiling installer from:', issPath);

inno(issPath, { verbose: true }, (err) => {
  if (err) {
    console.error('Inno Setup build failed:', err);
    process.exit(1);
  }
  console.log('SUCCESS: Netrion-Setup.exe installer generated in release/installer/ !');
});
