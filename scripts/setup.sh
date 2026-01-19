#!/bin/sh

echo "Setting up OpenCiv development environment..."

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Configure git hooks
echo "Configuring git hooks..."
git config core.hooksPath .githooks

echo "Setup complete!"
