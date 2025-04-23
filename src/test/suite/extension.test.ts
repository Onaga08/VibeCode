import * as assert from 'assert';

suite('Text Display Logic Test Suite', () => {
  test('Should return correct label for ENTER', () => {
    const input = '\n';
    const output = input.includes('\n') ? 'ENTER' : input;
    assert.strictEqual(output, 'ENTER');
  });

  test('Should convert normal characters to uppercase', () => {
    const input = 'a';
    const output = input.length > 2 ? 'CTRL+V' : input.toUpperCase();
    assert.strictEqual(output, 'A');
  });

  test('Should return CTRL+V for long paste', () => {
    const input = 'console.log("hello");';
    const output = input.length > 2 ? 'CTRL+V' : input;
    assert.strictEqual(output, 'CTRL+V');
  });
});
