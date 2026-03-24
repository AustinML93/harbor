#!/bin/bash
set -e

# Fix ownership of /app/data so the harbor user can always write to it,
# regardless of what UID/GID owns the bind-mounted directory on the host.
chown -R harbor:harbor /app/data

# Create/update docker group with the host's Docker GID and add harbor user,
# so the non-root process can read the Docker socket.
DOCKER_GID="${DOCKER_GID:-982}"
groupmod -g "${DOCKER_GID}" docker 2>/dev/null || groupadd -g "${DOCKER_GID}" docker
usermod -aG docker harbor

# Drop privileges and exec the CMD as the harbor user
exec gosu harbor "$@"
