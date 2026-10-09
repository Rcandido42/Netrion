const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const installedDir = 'C:\\Users\\deepc\\AppData\\Local\\Programs\\Netrion';
const releaseDir = path.join(rootDir, 'release', 'Netrion-win32-x64');
const stagingDir = path.join(rootDir, '.staging_asar');
const asarOutput = path.join(rootDir, 'app.asar');

console.log('=== [NETRION SYNC & UPDATE APP] ===');

try {
  // 1. Build project
  console.log('1. Building latest frontend artifacts...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // 2. Create staging directory for ASAR packaging
  console.log('2. Staging files for packaging...');
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
  fs.mkdirSync(stagingDir, { recursive: true });

  // Copy dist
  fs.cpSync(path.join(rootDir, 'dist'), path.join(stagingDir, 'dist'), { recursive: true });
  // Copy electron
  fs.cpSync(path.join(rootDir, 'electron'), path.join(stagingDir, 'electron'), { recursive: true });
  // Copy public
  if (fs.existsSync(path.join(rootDir, 'public'))) {
    fs.cpSync(path.join(rootDir, 'public'), path.join(stagingDir, 'public'), { recursive: true });
  }
  // Copy package.json
  fs.copyFileSync(path.join(rootDir, 'package.json'), path.join(stagingDir, 'package.json'));

  // 3. Pack into app.asar
  console.log('3. Packing asar bundle...');
  if (fs.existsSync(asarOutput)) {
    fs.rmSync(asarOutput, { force: true });
  }
  execSync(`npx @electron/asar pack "${stagingDir}" "${asarOutput}"`, { cwd: rootDir, stdio: 'inherit' });

  // 4. Terminate running Netrion processes if any
  console.log('4. Stopping any running Netrion processes to free locks...');
  try {
    execSync('taskkill /F /IM Netrion.exe', { stdio: 'ignore' });
  } catch {
    // Process might not be running, ignore
  }

  // Small delay to ensure OS releases file handles
  const sleepMs = (ms) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  };
  sleepMs(800);

  // 5. Update release/Netrion-win32-x64/resources/app.asar
  if (fs.existsSync(releaseDir)) {
    const releaseResources = path.join(releaseDir, 'resources');
    fs.mkdirSync(releaseResources, { recursive: true });
    fs.copyFileSync(asarOutput, path.join(releaseResources, 'app.asar'));
    console.log('Copied app.asar to release folder');
  }

  // 6. Update installed directory in AppData if present
  if (fs.existsSync(installedDir)) {
    const installedResources = path.join(installedDir, 'resources');
    fs.mkdirSync(installedResources, { recursive: true });
    fs.copyFileSync(asarOutput, path.join(installedResources, 'app.asar'));
    console.log('Copied app.asar to installed AppData directory:', installedDir);

    // Also copy icons
    const logoIco = path.join(rootDir, 'public', 'netrion-logo.ico');
    const logoPng = path.join(rootDir, 'public', 'netrion-logo.png');
    if (fs.existsSync(logoIco)) {
      fs.copyFileSync(logoIco, path.join(installedDir, 'netrion-logo.ico'));
    }
    if (fs.existsSync(logoPng)) {
      fs.copyFileSync(logoPng, path.join(installedDir, 'netrion-logo.png'));
    }
  }

  // 7. Clean up staging
  fs.rmSync(stagingDir, { recursive: true, force: true });
  fs.rmSync(asarOutput, { force: true });

  // 8. Rebuild installer so release/installer/Netrion-Setup.exe is fresh
  console.log('5. Rebuilding installer...');
  try {
    execSync('node build-installer.cjs', { cwd: rootDir, stdio: 'inherit' });
  } catch (err) {
    console.warn('Installer rebuild warning:', err.message);
  }

  // 9. Relaunch Netrion.exe
  const exeToRun = fs.existsSync(path.join(installedDir, 'Netrion.exe'))
    ? path.join(installedDir, 'Netrion.exe')
    : path.join(releaseDir, 'Netrion.exe');

  if (fs.existsSync(exeToRun)) {
    console.log('6. Relaunching Netrion.exe:', exeToRun);
    const { spawn } = require('child_process');
    const child = spawn(exeToRun, [], { detached: true, stdio: 'ignore' });
    child.unref();
  }

  console.log('=== [UPDATE COMPLETED SUCCESSFULLY] ===');
} catch (error) {
  console.error('Error during app sync:', error);
  process.exit(1);
}
