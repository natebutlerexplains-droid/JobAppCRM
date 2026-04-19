#!/bin/bash

set -e

echo "========================================"
echo "Job Application CRM - Setup Script"
echo "========================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
if ! command -v python3 &> /dev/null; then
  echo "❌ Python 3 is required but not installed. Please install Python 3.11 or higher."
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo "❌ Node.js is required but not installed. Please install Node.js 16 or higher."
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm is required but not installed."
  exit 1
fi

echo "✓ Python 3 installed: $(python3 --version)"
echo "✓ Node.js installed: $(node --version)"
echo "✓ npm installed: $(npm --version)"
echo ""

# Create .env from .env.example
echo "Setting up environment variables..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✓ Created .env from .env.example"
  else
    echo "⚠ .env.example not found, skipping"
  fi
else
  echo "✓ .env already exists"
fi

# Create logs directory
echo ""
echo "Creating logs directory..."
mkdir -p logs
echo "✓ logs/ directory created"

# Install Python dependencies
echo ""
echo "Installing Python dependencies..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
echo "✓ Python dependencies installed"

# Initialize SQLite database
echo ""
echo "Initializing SQLite database..."
python3 backend/models.py
echo "✓ SQLite database initialized"

# Install Node dependencies
echo ""
echo "Installing Node.js dependencies..."
cd frontend
npm install
cd ..
echo "✓ Node dependencies installed"

echo ""
echo "========================================"
echo "✓ Setup Complete!"
echo "========================================"
echo ""
echo "To run the application:"
echo ""
echo "  # Terminal 1 (Backend)"
echo "  source venv/bin/activate"
echo "  python -m flask --app backend.app run --port 5000"
echo ""
echo "  # Terminal 2 (Frontend)"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open: http://localhost:3000"
echo ""
