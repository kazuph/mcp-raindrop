#!/usr/bin/env bun
/**
 * Test Suite Index
 * 
 * Central entry point for running all Raindrop MCP tests
 * Usage: npm run test:all or bun run tests/index.ts
 */

import { testServer } from './test-server.js';
import { runComparison } from './test-comparison.js';
import { demonstrateOptimizations } from './optimization-demo.js';

async function runAllTests() {
    console.log('🧪 RAINDROP MCP TEST SUITE');
    console.log('='.repeat(50));
    console.log('Running comprehensive test suite for optimized MCP service\n');

    const tests = [
        {
            name: 'Server Functionality Test',
            fn: testServer
        },
        {
            name: 'Server Comparison Test',
            fn: runComparison
        },
        {
            name: 'Optimization Demonstration',
            fn: demonstrateOptimizations
        }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(`\n📋 Running: ${test.name}`);
        console.log('-'.repeat(40));

        try {
            await test.fn();
            console.log(`✅ ${test.name}: PASSED`);
            passed++;
        } catch (error) {
            console.error(`❌ ${test.name}: FAILED`);
            console.error(`   Error: ${(error as Error).message}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUITE SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('The optimized Raindrop MCP service is working correctly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the output above.');
        process.exit(1);
    }
}

// Individual test runners for selective testing
export async function runServerTest() {
    console.log('🧪 Running Server Test Only\n');
    await testServer();
}

export async function runComparisonTest() {
    console.log('🧪 Running Comparison Test Only\n');
    await runComparison();
}

export async function runDemoTest() {
    console.log('🧪 Running Optimization Demo Only\n');
    await demonstrateOptimizations();
}

// Main execution
if (import.meta.main) {
    runAllTests().catch(console.error);
}

export { runAllTests };
