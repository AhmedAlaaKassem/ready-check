#!/bin/sh
# Re-render icons/*.png from icons/icon.svg and icons/icon-maskable.svg using
# headless Google Chrome (macOS). Only needed if you change the icon design.
# Usage: sh tools/render-icons.sh
set -e
cd "$(dirname "$0")/../icons"
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
render() { # <svg> <size> <out.png>
  printf '<!doctype html><style>html,body{margin:0;width:%spx;height:%spx;overflow:hidden}img{display:block;width:100%%;height:100%%}</style><img src="file://%s">' "$2" "$2" "$PWD/$1" > "$TMP/wrap.html"
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --window-size="$2,$2" --screenshot="$PWD/$3" "file://$TMP/wrap.html" >/dev/null 2>&1
  echo "wrote icons/$3"
}
render icon.svg 180 apple-touch-icon.png
render icon.svg 192 icon-192.png
render icon.svg 512 icon-512.png
render icon-maskable.svg 512 icon-maskable-512.png
rm -rf "$TMP"
