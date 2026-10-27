#!/usr/bin/env bash
# Amin #5540: publishing a version is ONE step — the install file goes up AND update.json names it, so every
# installed copy offers the update within 10 minutes (UpdateChecker RECHECK_MS). Never copy an APK without this.
#
#   scripts/publish-apk.sh <version> <signed arm apk> "<Persian notes>"
#
# Backs up update.json and the eyvan.apk link to /root/kss-backups first; checks the served file's sha256 at the end.
set -euo pipefail
VERSION="$1"; APK="$2"; NOTES="$3"
HOST=root@194.5.175.64
NAME="eyvan-$VERSION.apk"
SHA=$(sha256sum "$APK" | cut -d' ' -f1)
TS=$(date +%Y%m%d-%H%M%S)

scp -q "$APK" "$HOST:/tmp/$NAME"
NOTES_JSON=$(python -c 'import json,sys; print(json.dumps(sys.argv[1], ensure_ascii=False))' "$NOTES")
ssh "$HOST" "set -e
  cp -a /var/www/azar-app/update.json /root/kss-backups/eyvan-update.json.bak-$TS
  cp -a /var/www/kssx-dl/eyvan.apk /root/kss-backups/eyvan.apk-link.bak-$TS 2>/dev/null || true
  install -m 644 /tmp/$NAME /var/www/azar-app/$NAME
  install -m 644 /tmp/$NAME /var/www/kssx-dl/$NAME
  rm -f /tmp/$NAME
  ln -sfn $NAME /var/www/kssx-dl/eyvan.apk
  cat > /var/www/azar-app/update.json.new <<EOF
{\"version\": \"$VERSION\", \"url\": \"https://api.zarandix.ir/app/$NAME\", \"sha256\": \"$SHA\", \"notes\": $NOTES_JSON}
EOF
  mv /var/www/azar-app/update.json.new /var/www/azar-app/update.json"

LIVE=$(curl -s -H 'cache-control: no-cache' https://api.zarandix.ir/app/update.json)
echo "$LIVE"
echo "$LIVE" | grep -q "\"version\": \"$VERSION\"" || { echo "update.json does not name $VERSION" >&2; exit 1; }
GOT=$(curl -s "https://api.zarandix.ir/app/$NAME" | sha256sum | cut -d' ' -f1)
[ "$GOT" = "$SHA" ] || { echo "served file sha256 $GOT != $SHA" >&2; exit 1; }
GOT2=$(curl -s "https://kssx.ir/dl/eyvan.apk" | sha256sum | cut -d' ' -f1)
[ "$GOT2" = "$SHA" ] || { echo "kssx.ir/dl/eyvan.apk sha256 $GOT2 != $SHA" >&2; exit 1; }
echo "published $VERSION ($SHA)"
