#!/bin/bash
# installs the nightly backup timer (run as root on the VPS, after src/nightly.js is deployed)
set -e
install -d -m 700 -o azar-auth -g azar-auth /var/backups/eyvan-nightly
if [ ! -f /root/kss-secrets/eyvan-backup.env ]; then
  umask 077; echo "EYVAN_BACKUP_KEY=$(openssl rand -hex 32)" > /root/kss-secrets/eyvan-backup.env
fi
chmod 600 /root/kss-secrets/eyvan-backup.env
install -m 644 /opt/azar-auth/deploy/azar-nightly.service /opt/azar-auth/deploy/azar-nightly.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now azar-nightly.timer
systemctl list-timers azar-nightly.timer --no-pager
