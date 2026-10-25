#!/bin/bash
# installs the nightly backup timer (run as root on the VPS, after src/nightly.js is deployed)
set -e
install -d -m 700 -o root -g root /root/kss-backups/eyvan-nightly
install -m 644 /opt/azar-auth/deploy/azar-nightly.service /opt/azar-auth/deploy/azar-nightly.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now azar-nightly.timer
systemctl list-timers azar-nightly.timer --no-pager
