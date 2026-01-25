#!/bin/bash
set -e

# Build Lambda deployment packages
# Run from services/api directory

echo "Building Lambda deployment packages..."

# Create output directory
mkdir -p dist

# Build layer with dependencies
echo "Building dependencies layer..."
mkdir -p layer/python

# Try to download Linux wheels using pip's platform flag
echo "Downloading Linux-compatible wheels..."
pip install -r requirements.txt -t layer/python \
    --platform manylinux2014_x86_64 \
    --implementation cp \
    --python-version 3.11 \
    --only-binary=:all: \
    --quiet 2>/dev/null || {
    echo "Platform-specific download failed, trying with --no-deps for compiled packages..."
    # Fall back to installing normally but it may not work on Lambda for compiled deps
    pip install -r requirements.txt -t layer/python --quiet
}

cd layer
zip -r ../dist/layer.zip python -x "*.pyc" -x "*__pycache__*"
cd ..
rm -rf layer

# Copy layer to expected location
cp dist/layer.zip layer.zip

# Build handler packages
HANDLERS=("presign" "extract" "images" "recommend" "menu_get" "reviews")

for handler in "${HANDLERS[@]}"; do
    echo "Building ${handler}.zip..."
    zip -r "dist/${handler}.zip" handlers/ lib/ -x "*.pyc" -x "*__pycache__*"
    cp "dist/${handler}.zip" "${handler}.zip"
done

echo "Build complete! Packages in dist/"
ls -la dist/
