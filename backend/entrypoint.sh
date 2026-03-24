#!/bin/bash
set -e

# Fix ownership of /app/data so the harbor user can always write to it,
# regardless of what UID/GID owns the bind-mounted directory on the host.
chown -R harbor:harbor /app/data

# Drop privileges and exec the CMD as the harbor user
exec gosu harbor "$@"
