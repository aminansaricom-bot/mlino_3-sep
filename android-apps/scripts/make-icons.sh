#!/bin/bash
# Generates Android launcher, adaptive, notification and splash images from one 512 px logo (transparent background).
# Usage: make-icons.sh <logo.png> <android-res-dir> <splash-background-hex>
set -euo pipefail
LOGO="$1"; RES="$2"; BG="$3"
declare -A LAUNCH=([mdpi]=48 [hdpi]=72 [xhdpi]=96 [xxhdpi]=144 [xxxhdpi]=192)
declare -A FORE=([mdpi]=108 [hdpi]=162 [xhdpi]=216 [xxhdpi]=324 [xxxhdpi]=432)
declare -A STAT=([mdpi]=24 [hdpi]=36 [xhdpi]=48 [xxhdpi]=72 [xxxhdpi]=96)
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
  mkdir -p "$RES/mipmap-$d" "$RES/drawable-$d"
  s=${LAUNCH[$d]}; f=${FORE[$d]}; n=${STAT[$d]}
  # Legacy square and round icons: the logo on its white background.
  in=$(( s * 84 / 100 ))
  ffmpeg -v error -y -f lavfi -i "color=c=white:s=${s}x${s}" -i "$LOGO" -filter_complex "[1]scale=$in:$in:flags=lanczos[l];[0][l]overlay=(W-w)/2:(H-h)/2" -frames:v 1 "$RES/mipmap-$d/ic_launcher.png"
  ffmpeg -v error -y -f lavfi -i "color=c=white:s=${s}x${s}" -i "$LOGO" -filter_complex "[1]scale=$in:$in:flags=lanczos[l];[0][l]overlay=(W-w)/2:(H-h)/2,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lte(hypot(X-W/2,Y-H/2),W/2),255,0)'" -frames:v 1 "$RES/mipmap-$d/ic_launcher_round.png"
  # Adaptive foreground: logo inside the 66% safe zone of the 108 dp canvas.
  inner=$(( f * 62 / 100 ))
  ffmpeg -v error -y -i "$LOGO" -vf "scale=$inner:$inner:flags=lanczos,pad=$f:$f:(ow-iw)/2:(oh-ih)/2:color=white@0" "$RES/mipmap-$d/ic_launcher_foreground.png"
  # Status-bar icon: a white silhouette cut from the logo's own transparency.
  # (The logo carries a faint glow over its whole background, so its alpha is thresholded.)
  ffmpeg -v error -y -f lavfi -i "color=c=white:s=${n}x${n}" -i "$LOGO" -filter_complex "[1]scale=$n:$n:flags=lanczos,format=rgba,alphaextract,format=gray,lut=y='if(gt(val,110),255,0)'[m];[0]format=rgba[w];[w][m]alphamerge" -frames:v 1 "$RES/drawable-$d/ic_stat_mlino.png"
done
# Adaptive background colour.
cat > "$RES/values/ic_launcher_background.xml" <<XML
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#FFFFFF</color>
</resources>
XML
# Splash images: keep each file's size, logo centred on the app's dark colour.
for f in $(find "$RES" -name 'splash.png'); do
  dims=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$f")
  w=${dims%x*}; h=${dims#*x}; m=$(( (w < h ? w : h) * 32 / 100 ))
  ffmpeg -v error -y -f lavfi -i "color=c=$BG:s=${w}x${h}" -i "$LOGO" -filter_complex "[1]scale=$m:$m:flags=lanczos[l];[0][l]overlay=(W-w)/2:(H-h)/2" -frames:v 1 "$f"
done
echo "icons: $RES"
