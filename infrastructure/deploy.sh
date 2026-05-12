#!/bin/bash
set -e

echo "🚨 DEBUG: Node gave me URL -> $1"
echo "🚨 DEBUG: Node gave me PORT -> $2"

REPO_URL=$1
HOST_PORT=${2:-8080}

# ... rest of the script remains the same

if [ -z "$REPO_URL" ]; then
  echo " Error: No repository URL provided."
  exit 1
fi

REPO_NAME=$(basename -s .git "$REPO_URL")
REPO_NAME_LOWER=$(echo "$REPO_NAME" | tr '[:upper:]' '[:lower:]')
BUILD_TAG=$(date +%s)
IMAGE_NAME="${REPO_NAME_LOWER}:${BUILD_TAG}"
WORKSPACE_DIR="/tmp/mini-paas-builds/${REPO_NAME_LOWER}-${BUILD_TAG}"


echo " Starting deployment for: $REPO_NAME"
mkdir -p "$WORKSPACE_DIR"

echo "⬇  Cloning repository..."
git clone "$REPO_URL" "$WORKSPACE_DIR"

echo " Building Docker image..."
cd "$WORKSPACE_DIR"
if [ ! -f "Dockerfile" ]; then
    echo " Error: No Dockerfile found."
    rm -rf "$WORKSPACE_DIR"
    exit 1
fi

docker build -t "$IMAGE_NAME" .

# --- 5. THE RUN PHASE (New!) ---
echo " Deploying container..."

# Foolproof way to stop and remove old containers. 
# '|| true' prevents the script from crashing if the container doesn't exist yet.
docker rm -f "$REPO_NAME_LOWER" 2>/dev/null || true

echo " Mapping traffic from http://localhost:$HOST_PORT to container..."
docker run -d --name "$REPO_NAME_LOWER" -p "$HOST_PORT":8080 "$IMAGE_NAME"

echo " Deployment successful!"
echo " YOUR APP IS LIVE AT: http://localhost:$HOST_PORT"

cd /tmp
rm -rf "$WORKSPACE_DIR"