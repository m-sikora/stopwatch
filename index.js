const util = require('util');
const _ = require('lodash');
const convertHrtime = require('convert-hrtime');
const math = require('mathjs');

const isPromise = (obj = {}) => {
  const { then } = obj;
  return _.isFunction(then);
};

function Scope() {
  this.buckets = {};
  this.checkpoints = {};
  this.registerCheckpoint = function (name) {
    this.checkpoints[name] = process.hrtime();
  };
  this.getPrettyDelta = function (checkpointName) {
    return convertHrtime(this.getDelta(...arguments));
  };
  this.getDelta = function (checkpointName) {
    const checkpoint = this.checkpoints[checkpointName];
    if (!checkpoint) {
      throw new Error('Checkpoint not found');
    }
    const delta = process.hrtime(checkpoint);
    return delta;
  };
  this.getBucket = function (bucketName) {
    return this.buckets[bucketName] || { times: [] };
  };
  this.saveDelta = function (checkpointName, bucketName) {
    const bucket = this.getBucket(bucketName);
    const delta = this.getDelta(checkpointName);
    bucket.times.push(delta);
    this.buckets[bucketName] = bucket;
  };
  this.wrapFunction = function (bucketName, callback) {
    return (...args) => {
      this.registerCheckpoint(bucketName);
      const r = callback(...args);
      if (isPromise(r)) {
        return r.then(rr => {
          this.saveDelta(bucketName, bucketName);
          return rr;
        });
      }
      this.saveDelta(bucketName, bucketName);
      return r
    }
  };
  this.getPrettyBucket = function (bucketName) {
    const { times = [] } = this.getBucket(bucketName);
    const timesMs = times.map(t => convertHrtime(t).milliseconds);
    const mean = math.mean(timesMs);
    const std = math.std(timesMs);
    const max = math.max(timesMs);
    const min = math.min(timesMs);
    const count = timesMs.length;
    return { mean, std, max, min, count };
  };
  this.getPrettyBuckets = function () {
    const buckets = _.chain(this.buckets)
      .keys()
      .map(bucketName => {
        return {
          bucketName,
          ...this.getPrettyBucket(bucketName),
        };
      })
      .sortBy(({ mean = 0 }) => -mean)
      .value();
    return buckets;
  };
  this.prettyPrint = function () {
    console.log(util.inspect(this.getPrettyBuckets(), { colors: true }));
  };
  this.attachPrintHook = function () {
    process.on('SIGINT', () => {
      this.prettyPrint();
    });
  };
}

const globalScope = new Scope();

const api = {
  make: () => new Scope(),
  getGlobal: () => globalScope,
};

module.exports = api;
