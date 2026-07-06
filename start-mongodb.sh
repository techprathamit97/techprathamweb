#!/bin/bash

echo "Starting MongoDB for WebRTC Live Classes..."
echo

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "❌ MongoDB not found"
    echo
    echo "Please install MongoDB:"
    echo "Ubuntu/Debian: sudo apt-get install mongodb"
    echo "macOS: brew install mongodb/brew/mongodb-community"
    echo "Or download from: https://www.mongodb.com/try/download/community"
    echo
    exit 1
fi

# Create data directory if it doesn't exist
if [ ! -d "mongodb-data" ]; then
    echo "Creating MongoDB data directory..."
    mkdir mongodb-data
fi

echo "Starting MongoDB server..."
echo "Data directory: $(pwd)/mongodb-data"
echo

# Start MongoDB with custom data directory
mongod --dbpath=mongodb-data --port=27017