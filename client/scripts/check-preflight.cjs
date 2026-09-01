// client/scripts/check-preflight.cjs
const { execSync } = require('child_process');

console.log('\n🔍 [1/3] Checking TypeScript types...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript type check passed!');
} catch (e) {
  console.error('❌ TypeScript check failed. Please fix type errors above.');
  process.exit(1);
}

console.log('\n⚡ [2/3] Checking Vite Build compatibility...');
try {
  execSync('npx vite build', { stdio: 'inherit' });
  console.log('✅ Vite build verification passed!');
} catch (e) {
  console.error('❌ Vite build failed.');
  process.exit(1);
}

console.log('\n🚀 [3/3] Preflight check complete! Launching Playwright E2E Suite...\n');