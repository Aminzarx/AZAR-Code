#!/bin/bash
# EYVAN web (#5183): puts a built web/dist (uploaded as /root/eyvan-web-dist.tgz) live at app.kssx.ir.
# The previous build is kept as /var/www/eyvan-web.prev (rollback: swap the two folders back).
set -e
T=$(date +%Y%m%d-%H%M%S)
NEW=/var/www/eyvan-web.new
rm -rf "$NEW"; mkdir -p "$NEW"
tar xzf /root/eyvan-web-dist.tgz -C "$NEW"
test -f "$NEW/index.html"
chown -R root:root "$NEW"; find "$NEW" -type d -exec chmod 755 {} +; find "$NEW" -type f -exec chmod 644 {} +
if [ -d /var/www/eyvan-web ]; then rm -rf /var/www/eyvan-web.prev; mv /var/www/eyvan-web /var/www/eyvan-web.prev; fi
mv "$NEW" /var/www/eyvan-web
echo "web live ($T)"
