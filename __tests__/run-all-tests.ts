import 'dotenv/config';
import { runAllRegisteredSuites } from './jest-lite';
import { prisma } from '../src/lib/db';

// Register all test suites
import './form-and-image-validation.test';
import './all-apis.test';

async function main() {
  console.log('==============================================================');
  console.log('  AABHA CLOTHING — AUTOMATED JEST-STYLE LOCAL & API TEST SUITE');
  console.log('==============================================================');

  const startTime = Date.now();
  const { passed, failed, failures } = await runAllRegisteredSuites();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n==============================================================');
  console.log(`  TEST SUMMARY: ${passed} passed, ${failed} failed (${passed + failed} total)`);
  console.log(`  TIME:         ${elapsed}s`);
  console.log('==============================================================');

  if (prisma) {
    await prisma.$disconnect().catch(() => {});
  }

  if (failures.length > 0) {
    console.error('\nFAILED TESTS:');
    for (const f of failures) {
      console.error(`  ❌ [${f.suite}] ${f.test}: ${f.error}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main().catch(async (err) => {
  console.error('Fatal test runner error:', err);
  if (prisma) {
    await prisma.$disconnect().catch(() => {});
  }
  process.exit(1);
});
