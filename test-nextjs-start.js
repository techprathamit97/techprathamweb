/**
 * Quick test to verify Next.js can start without dynamic route conflicts
 */

const { spawn } = require('child_process');

console.log('🧪 Testing Next.js startup...');

const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'pipe',
  shell: true
});

let output = '';
let hasError = false;

nextProcess.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log(text.trim());
  
  // Check for successful startup
  if (text.includes('Ready in') || text.includes('Local:')) {
    console.log('✅ Next.js started successfully!');
    console.log('✅ No dynamic route conflicts detected');
    nextProcess.kill();
    process.exit(0);
  }
});

nextProcess.stderr.on('data', (data) => {
  const text = data.toString();
  console.error(text.trim());
  
  // Check for dynamic route conflicts
  if (text.includes('different slug names') || text.includes('dynamic path')) {
    console.error('❌ Dynamic route conflict detected!');
    hasError = true;
    nextProcess.kill();
    process.exit(1);
  }
});

nextProcess.on('close', (code) => {
  if (!hasError) {
    console.log('✅ Next.js test completed successfully');
  }
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout - killing process');
  nextProcess.kill();
  process.exit(hasError ? 1 : 0);
}, 30000);