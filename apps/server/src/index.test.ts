import { describe, expect, it } from 'vitest';
import app from './index.js';


describe('health contract', () => {
  it('exports an express application', () => {
    expect(typeof app).toBe('function');
  });
});
