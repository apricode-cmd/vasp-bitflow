#!/bin/bash
# Setup Local Redis for Testing
# Installs and starts Redis locally

set -e

echo "🔧 Setting up local Redis for testing..."
echo ""

# Check if Redis is already installed
if command -v redis-cli &> /dev/null; then
    echo "✅ Redis is already installed"
    redis-cli --version
else
    echo "📦 Installing Redis..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        echo "🍎 Detected macOS, installing via Homebrew..."
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew not found. Please install from https://brew.sh"
            exit 1
        fi
        brew install redis
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "🐧 Detected Linux, installing via apt..."
        sudo apt-get update
        sudo apt-get install -y redis-server
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install Redis manually: https://redis.io/download"
        exit 1
    fi
fi

echo ""
echo "🚀 Starting Redis server..."

# Start Redis
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS - start as background service
    brew services start redis
    echo "✅ Redis started via Homebrew services"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux - start service
    sudo systemctl start redis-server
    sudo systemctl enable redis-server
    echo "✅ Redis started via systemctl"
fi

# Wait for Redis to start
sleep 2

# Test connection
echo ""
echo "🧪 Testing Redis connection..."
if redis-cli ping | grep -q "PONG"; then
    echo "✅ Redis is running and responding!"
else
    echo "❌ Redis is not responding. Please check the service."
    exit 1
fi

# Show Redis info
echo ""
echo "📊 Redis Info:"
redis-cli info server | grep -E "redis_version|os|arch"

echo ""
echo "🔗 Redis connection:"
echo "  Host: localhost"
echo "  Port: 6379"
echo "  URL: redis://localhost:6379"

echo ""
echo "✅ Local Redis setup complete!"
echo ""
echo "📝 Add to .env.local:"
echo "  REDIS_URL=redis://localhost:6379"

