#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up EMS MERN Stack Project...\n');

// Check if Node.js is installed
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' });
  console.log(`✅ Node.js version: ${nodeVersion.trim()}`);
} catch (error) {
  console.error('❌ Node.js is not installed. Please install Node.js first.');
  process.exit(1);
}

// Check if npm is installed
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' });
  console.log(`✅ npm version: ${npmVersion.trim()}`);
} catch (error) {
  console.error('❌ npm is not installed. Please install npm first.');
  process.exit(1);
}

// Install root dependencies
console.log('\n📦 Installing root dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Root dependencies installed');
} catch (error) {
  console.error('❌ Failed to install root dependencies');
  process.exit(1);
}

// Install backend dependencies
console.log('\n📦 Installing backend dependencies...');
try {
  execSync('cd backend && npm install', { stdio: 'inherit' });
  console.log('✅ Backend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Install frontend dependencies
console.log('\n📦 Installing frontend dependencies...');
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log('✅ Frontend dependencies installed');
} catch (error) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Check if config.env exists in backend
const configPath = path.join(__dirname, 'backend', 'config.env');
if (!fs.existsSync(configPath)) {
  console.log('\n⚠️  Backend config.env not found. Please create it with your MongoDB connection string.');
  console.log('Example config.env:');
  console.log('NODE_ENV=development');
  console.log('PORT=3001');
  console.log('DATABASE=mongodb+srv://username:password@cluster.mongodb.net/Employee');
  console.log('JWT_SECRET=your_secret_key_here');
} else {
  console.log('✅ Backend config.env found');
}

console.log('\n🎉 Setup completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Configure your MongoDB connection in backend/config.env');
console.log('2. Run "npm run dev" to start both backend and frontend');
console.log('3. Backend will run on http://localhost:3001');
console.log('4. Frontend will run on http://localhost:5173');
console.log('\n🚀 Happy coding!');
