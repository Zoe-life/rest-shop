/**
 * Unit tests for Cloudflare Workers polyfills
 */

const { expect } = require('chai');

describe('Cloudflare Workers Polyfills', () => {
  describe('process.emitWarning polyfill', () => {
    it('should have process.emitWarning defined', () => {
      expect(process.emitWarning).to.be.a('function');
    });

    it('should accept warning, type, and code parameters', () => {
      // Test that calling emitWarning doesn't throw
      expect(() => {
        process.emitWarning('Test warning', 'TestWarning', 'TEST_CODE');
      }).to.not.throw();
    });

    it('should handle missing optional parameters', () => {
      // Test with only warning message
      expect(() => {
        process.emitWarning('Test warning');
      }).to.not.throw();
    });

    it('should be callable multiple times', () => {
      expect(() => {
        process.emitWarning('Warning 1');
        process.emitWarning('Warning 2', 'DeprecationWarning');
        process.emitWarning('Warning 3', 'Warning', 'CODE');
      }).to.not.throw();
    });
  });

  describe('process object', () => {
    it('should have process.version defined', () => {
      expect(process.version).to.be.a('string');
    });

    it('should have process.platform defined', () => {
      expect(process.platform).to.be.a('string');
    });

    it('should have process.arch defined', () => {
      expect(process.arch).to.be.a('string');
    });
  });
});
