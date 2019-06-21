const src = require('./index');
const chai = require('chai');
chai.use(require('chai-things'));

chai.should();
const { expect } = chai;

const cheapAsyncFn = () => new Promise(resolve => setImmediate(resolve));
const faultyCheapAsyncFn = () => new Promise((resolve, reject) => setImmediate(reject));

describe('Stopwatch', () => {
  it('should work', () => {
    const scope = src.make();
    scope.registerCheckpoint('c1');
    scope.saveDelta('c1', 'bucket');
    scope.saveDelta('c1', 'bucket');
    scope.saveDelta('c1', 'bucket');
    scope.saveDelta('c1', 'bucket');
    scope.saveDelta('c1', 'bucket');
    scope.saveDelta('c1', 'bucket2');
    scope.saveDelta('c1', 'bucket2');
    scope.saveDelta('c1', 'bucket3');
    scope.prettyPrint();
    const buckets = scope.getPrettyBuckets();
    expect(buckets.length).to.equal(3);
    expect(buckets).all.to.have.property('bucketName');
    expect(buckets).all.to.have.property('mean');
    expect(buckets).all.to.have.property('std');
    expect(buckets).all.to.have.property('max');
    expect(buckets).all.to.have.property('min');
    const bucketNames = buckets.map(({ bucketName }) => bucketName).sort();
    expect(bucketNames).to.eql(['bucket', 'bucket2', 'bucket3']);
  });
  it('should wrap a function', () => {
    const scope = src.make();
    scope.wrapFunction('fn', () => 0)();
    scope.prettyPrint();
    const buckets = scope.getPrettyBuckets();
    expect(buckets.length).to.equal(1);
    expect(buckets[0]).to.have.property('bucketName', 'fn');
    expect(buckets[0]).to.have.property('mean');
    expect(buckets[0]).to.have.property('std');
    expect(buckets[0]).to.have.property('max');
    expect(buckets[0]).to.have.property('min');
  });
  it('should wrap an async function', async () => {
    const scope = src.make();
    await scope.wrapFunction('fn', cheapAsyncFn)();
    scope.prettyPrint();
    const buckets = scope.getPrettyBuckets();
    expect(buckets.length).to.equal(1);
    expect(buckets[0]).to.have.property('bucketName', 'fn');
    expect(buckets[0]).to.have.property('mean');
    expect(buckets[0]).to.have.property('std');
    expect(buckets[0]).to.have.property('max');
    expect(buckets[0]).to.have.property('min');
  });
  it('should delegate wrapped async function rejections', async () => {
    const scope = src.make();
    let thrown = false;
    await scope.wrapFunction('fn', faultyCheapAsyncFn)()
      .catch(e => {
        thrown = true;
      });
    expect(thrown).to.equal(true);
    scope.prettyPrint();
  });
});
