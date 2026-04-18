#!/bin/bash
# Harbor non-interactive install script

set -e

cd "$(dirname "$0")"

echo "========================================="
echo "  Harbor — Installation"
echo "========================================="

# 1. Check prerequisites
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    exit 1
fi

# 2. Generate Secret Key
SECRET_KEY=$(openssl rand -hex 32)

# 3. Default Admin Password Hash (admin)
PASSWORD_HASH='$$2b$$12$$KsCbMHKX7Pj/vflN8A7WoumfQ7UTrTqgXoL/ASiMZDfIHCyh2FG.a'

# 4. Detect Docker GID
DOCKER_GID=$(getent group docker | cut -d: -f3)
if [ -z "$DOCKER_GID" ]; then
    DOCKER_GID=999
    echo "Warning: Could not detect docker group GID, falling back to $DOCKER_GID."
fi

# 5. Generate .env file
echo "Generating .env file..."
cat > .env <<EOF
# Harbor Environment Configuration (Auto-generated)

SECRET_KEY=${SECRET_KEY}
PASSWORD_HASH='${PASSWORD_HASH}'
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

DOCKER_SOCKET=unix:///var/run/docker.sock
DOCKER_GID=${DOCKER_GID}

DATABASE_URL=sqlite:///./data/harbor.db
SERVICES_CONFIG_PATH=./services.yml
EOF

# 6. Copy services.yml
if [ ! -f "services.yml" ]; then
    echo "Creating default services.yml..."
    cp services.example.yml services.yml
    chmod 666 services.yml
fi

# 7. Start containers
echo "Starting Harbor..."
docker compose up -d --build

echo ""
echo "========================================="
echo "  Installation Complete!"
echo "  Harbor is running on http://localhost:3113"
echo "  Default Login: admin / admin"
echo "  Please change your password immediately."
echo "========================================="
