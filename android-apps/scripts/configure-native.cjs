// Applies MLINO's native settings to both generated Android projects (idempotent). Run after `npx cap add android`.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const edit = (f, pairs) => {
  let t = fs.readFileSync(f, 'utf8');
  for (const [a, b] of pairs) { if (t.includes(b.split('\n')[0]) && !t.includes(a)) continue; if (!t.includes(a)) throw new Error(`${f}: missing ${a.slice(0, 50)}`); t = t.replace(a, b); }
  fs.writeFileSync(f, t);
};
const sdk = path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk').split(path.sep).join('/');

for (const app of ['customer', 'business']) {
  const dir = path.join(root, app, 'android');
  const man = path.join(dir, 'app/src/main/AndroidManifest.xml');
  const perms = app === 'customer'
    ? `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <!-- Nearby offers are checked on the phone (D-77, D-79); the position never leaves the device. -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    <!-- Not needed: checks run every ~15 minutes, not at exact times. -->
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />`
    : `    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <!-- The business app never uses location; the background library declares it, so it is removed here. -->
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" tools:node="remove" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" tools:node="remove" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />`;
  let m = fs.readFileSync(man, 'utf8');
  if (!m.includes('xmlns:tools')) m = m.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android">', '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">');
  if (!m.includes('POST_NOTIFICATIONS')) m = m.replace('    <uses-permission android:name="android.permission.INTERNET" />', perms);
  fs.writeFileSync(man, m);

  const gradle = path.join(dir, 'app/build.gradle');
  let g = fs.readFileSync(gradle, 'utf8');
  if (!g.includes('background-runner/android/src/main/libs')) g = g.replace("        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'", "        dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'\n        dirs '../../../node_modules/@capacitor/background-runner/android/src/main/libs', 'libs'");
  // Release signing from a keystore kept OUTSIDE the repository (path and passwords from mlino-signing.properties).
  if (!g.includes('mlinoSigning')) {
    g = g.replace('android {', `def mlinoSigning = new Properties()
def mlinoSigningFile = file(System.getenv('MLINO_SIGNING') ?: '/nonexistent')
if (mlinoSigningFile.exists()) mlinoSigningFile.withInputStream { mlinoSigning.load(it) }

android {`);
    g = g.replace('    buildTypes {', `    signingConfigs {
        release {
            if (mlinoSigning['storeFile']) {
                storeFile file(mlinoSigning['storeFile'])
                storePassword mlinoSigning['storePassword']
                keyAlias mlinoSigning['keyAlias']
                keyPassword mlinoSigning['keyPassword']
            }
        }
    }
    buildTypes {`);
    g = g.replace(/(release \{\s*\n\s*minifyEnabled false)/, "$1\n            if (mlinoSigning['storeFile']) signingConfig signingConfigs.release");
  }
  fs.writeFileSync(gradle, g);
  fs.writeFileSync(path.join(dir, 'local.properties'), `sdk.dir=${sdk}\n`);
}
console.log('native config ok');
