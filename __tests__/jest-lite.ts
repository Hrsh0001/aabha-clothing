/**
 * Lightweight Jest-compatible test runner and assertion library (`describe`, `test`, `it`, `expect`, `beforeAll`, `afterAll`)
 * runnable directly with `npx tsx` without requiring external binary installation.
 */

type TestFn = () => void | Promise<void>;

interface TestCase {
  name: string;
  fn: TestFn;
}

interface TestSuite {
  name: string;
  beforeAllFns: TestFn[];
  afterAllFns: TestFn[];
  tests: TestCase[];
}

const suites: TestSuite[] = [];
let currentSuite: TestSuite | null = null;

function customDescribe(name: string, fn: () => void): void {
  const suite: TestSuite = {
    name,
    beforeAllFns: [],
    afterAllFns: [],
    tests: [],
  };
  const prevSuite = currentSuite;
  currentSuite = suite;
  suites.push(suite);
  fn();
  currentSuite = prevSuite;
}

function customTest(name: string, fn: TestFn): void {
  if (!currentSuite) {
    customDescribe('Default Suite', () => {
      currentSuite!.tests.push({ name, fn });
    });
    return;
  }
  currentSuite.tests.push({ name, fn });
}

function customBeforeAll(fn: TestFn): void {
  if (currentSuite) {
    currentSuite.beforeAllFns.push(fn);
  }
}

function customAfterAll(fn: TestFn): void {
  if (currentSuite) {
    currentSuite.afterAllFns.push(fn);
  }
}

export const describe: (name: string, fn: () => void) => void = (name, fn) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (global as any);
  if (typeof g.describe === 'function' && g.describe !== describe) {
    return g.describe(name, fn);
  }
  return customDescribe(name, fn);
};

export const test: (name: string, fn: TestFn, timeout?: number) => void = (name, fn, timeout) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (global as any);
  if (typeof g.test === 'function' && g.test !== test) {
    return g.test(name, fn, timeout);
  }
  return customTest(name, fn);
};

export const it: (name: string, fn: TestFn) => void = test;

export const beforeAll: (fn: TestFn) => void = (fn) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (global as any);
  if (typeof g.beforeAll === 'function' && g.beforeAll !== beforeAll) {
    return g.beforeAll(fn);
  }
  return customBeforeAll(fn);
};

export const afterAll: (fn: TestFn) => void = (fn) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (global as any);
  if (typeof g.afterAll === 'function' && g.afterAll !== afterAll) {
    return g.afterAll(fn);
  }
  return customAfterAll(fn);
};

function deepEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

function createMatchers(actual: any, isNot: boolean = false) {
  const assert = (condition: boolean, message: string) => {
    const passed = isNot ? !condition : condition;
    if (!passed) {
      throw new Error(message);
    }
  };

  return {
    toBe(expected: any) {
      assert(
        Object.is(actual, expected),
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be ${JSON.stringify(expected)}`
      );
    },
    toEqual(expected: any) {
      assert(
        deepEqual(actual, expected),
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to equal ${JSON.stringify(expected)}`
      );
    },
    toBeTruthy() {
      assert(Boolean(actual), `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be truthy`);
    },
    toBeFalsy() {
      assert(!actual, `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be falsy`);
    },
    toBeDefined() {
      assert(
        actual !== undefined,
        `Expected value ${isNot ? 'not ' : ''}to be defined`
      );
    },
    toBeUndefined() {
      assert(
        actual === undefined,
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be undefined`
      );
    },
    toBeNull() {
      assert(
        actual === null,
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to be null`
      );
    },
    toContain(item: any) {
      const has =
        typeof actual === 'string'
          ? actual.includes(String(item))
          : Array.isArray(actual)
          ? actual.includes(item)
          : false;
      assert(
        has,
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to contain ${JSON.stringify(item)}`
      );
    },
    toHaveLength(expectedLength: number) {
      const actualLen = actual?.length;
      assert(
        actualLen === expectedLength,
        `Expected length ${expectedLength}${isNot ? ' (not)' : ''}, received ${actualLen}`
      );
    },
    toHaveProperty(prop: string, expectedVal?: any) {
      const hasProp =
        actual !== null &&
        actual !== undefined &&
        Object.prototype.hasOwnProperty.call(Object(actual), prop);
      if (expectedVal !== undefined) {
        assert(
          hasProp && deepEqual(actual[prop], expectedVal),
          `Expected property "${prop}" ${isNot ? 'not ' : ''}to equal ${JSON.stringify(expectedVal)}, received ${JSON.stringify(actual?.[prop])}`
        );
      } else {
        assert(
          hasProp,
          `Expected object ${isNot ? 'not ' : ''}to have property "${prop}"`
        );
      }
    },
    toBeGreaterThan(n: number) {
      assert(
        typeof actual === 'number' && actual > n,
        `Expected ${actual} ${isNot ? 'not ' : ''}to be > ${n}`
      );
    },
    toBeGreaterThanOrEqual(n: number) {
      assert(
        typeof actual === 'number' && actual >= n,
        `Expected ${actual} ${isNot ? 'not ' : ''}to be >= ${n}`
      );
    },
    toBeLessThan(n: number) {
      assert(
        typeof actual === 'number' && actual < n,
        `Expected ${actual} ${isNot ? 'not ' : ''}to be < ${n}`
      );
    },
    toBeLessThanOrEqual(n: number) {
      assert(
        typeof actual === 'number' && actual <= n,
        `Expected ${actual} ${isNot ? 'not ' : ''}to be <= ${n}`
      );
    },
    toMatch(pattern: RegExp | string) {
      const matches =
        typeof pattern === 'string'
          ? String(actual).includes(pattern)
          : pattern.test(String(actual));
      assert(
        matches,
        `Expected ${JSON.stringify(actual)} ${isNot ? 'not ' : ''}to match ${String(pattern)}`
      );
    },
  };
}

function customExpect(actual: any) {
  return {
    ...createMatchers(actual, false),
    not: createMatchers(actual, true),
  };
}

export const expect: (actual: any) => any = (actual) => {
  const g = typeof globalThis !== 'undefined' ? (globalThis as any) : (global as any);
  if (typeof g.expect === 'function' && g.expect !== expect) {
    return g.expect(actual);
  }
  return customExpect(actual);
};

export async function runAllRegisteredSuites(): Promise<{
  passed: number;
  failed: number;
  failures: { suite: string; test: string; error: string }[];
}> {
  let passed = 0;
  let failed = 0;
  const failures: { suite: string; test: string; error: string }[] = [];

  for (const suite of suites) {
    console.log(`\n📦 PASS/RUN Suite: ${suite.name}`);
    try {
      for (const hook of suite.beforeAllFns) {
        await hook();
      }

      for (const t of suite.tests) {
        try {
          await t.fn();
          passed++;
          console.log(`  ✅ ${t.name}`);
        } catch (err: any) {
          failed++;
          const msg = err?.message || String(err);
          console.log(`  ❌ ${t.name}`);
          console.log(`     ↳ ${msg}`);
          failures.push({ suite: suite.name, test: t.name, error: msg });
        }
      }
    } finally {
      for (const hook of suite.afterAllFns) {
        try {
          await hook();
        } catch (hookErr: any) {
          console.warn(`  ⚠️ afterAll hook warning in "${suite.name}":`, hookErr?.message || hookErr);
        }
      }
    }
  }

  return { passed, failed, failures };
}
