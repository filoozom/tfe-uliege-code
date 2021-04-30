/* global assert */
const equalBigInt = (bigIntA, bigIntB) => {
  return bigIntA.toString() === bigIntB.toString();
};

const assertEqualBigInt = (bigIntA, bigIntB) => {
  assert.equal(bigIntA.toString(), bigIntB.toString());
};

module.exports = { equalBigInt, assertEqualBigInt };
