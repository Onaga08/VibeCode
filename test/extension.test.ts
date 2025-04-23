import * as assert from 'assert';

suite('Basic Extension Test', () => {
  test('Array.indexOf() should return -1 when value is not present', () => {
    assert.strictEqual([1, 2, 3].indexOf(5), -1);
    assert.strictEqual([1, 2, 3].indexOf(0), -1);
  });
});
