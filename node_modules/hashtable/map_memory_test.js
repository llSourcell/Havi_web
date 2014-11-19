'use strict';

var path = require('path');
var util = require('util');

var async = require('async');

var HashMap = require('./es6-map');

var map = new HashMap();

if (!global.hasOwnProperty('gc')) {
    console.log('Error: you must run with --expose-gc');
    process.exit(1);
}

var measureMemory = function (name, use_memory_func, callback) {
    var i;
    for (i = 0; i < 10; i++) {
        global.gc();
    }
    var pre_memory_usage = process.memoryUsage();
    return use_memory_func(function (err, count) {
        if (err) {
            console.log('error using up memory', err);
            return callback(err);
        }
        for (i = 0; i < 10; i++) {
            global.gc();
        }
        var post_memory_usage = process.memoryUsage();
        console.log('report:', name, 'memory per object:', Math.round((post_memory_usage.heapUsed - pre_memory_usage.heapUsed) / count));
        return callback();
    });
};

var setAndClear = function (callback) {
    var i;
    for (i = 0; i < 10000; i++) {
        map.set(i, i);
    }
    map.clear();
    return callback(null, 1);
};

var setAndDelete = function (callback) {
    var i;
    for (i = 0; i < 10000; i++) {
        map.set(i, i);
    }
    for (i = 0; i < 10000; i++) {
        map.delete(i);
    }

    return callback(null, 1);
};

var setAndIterate = function (callback) {
    var i;
    for (i = 0; i < 10000; i++) {
        map.set(i, i);
    }
    var do_each = function (value, key) {
        return;
    };
    for (i = 0; i < 100; i++) {
        map.forEach(do_each);
    }
    map.clear();

    return callback(null, 1);
};

var setAndHas = function (callback) {
    var i;
    for (i = 0; i < 10000; i++) {
        map.set(i, i);
    }
    var j;
    for (j = 0; j < 50; j++) {
        for (i = 0; i < 10000; i++) {
            if (!map.has(i)) {
                return callback({name: 'ENOENT', message: 'hashmap does not have ' + i});
            }
        }
    }
    map.clear();

    return callback(null, 1);
};

async.eachSeries([
    /*
    ['setAndClear', setAndClear],
    ['setAndClear', setAndClear],
    ['setAndClear', setAndClear],
    ['setAndClear', setAndClear],
    ['setAndClear', setAndClear],
    ['setAndDelete', setAndDelete],
    ['setAndDelete', setAndDelete],
    ['setAndDelete', setAndDelete],
    ['setAndDelete', setAndDelete],
    ['setAndDelete', setAndDelete]
    */
    ['setAndIterate', setAndIterate],
    ['setAndIterate', setAndIterate],
    ['setAndIterate', setAndIterate],
    ['setAndIterate', setAndIterate],
    ['setAndIterate', setAndIterate]
    /*
    ['setAndHas', setAndHas],
    ['setAndHas', setAndHas],
    ['setAndHas', setAndHas],
    ['setAndHas', setAndHas],
    ['setAndHas', setAndHas]
    */
], function (params, cb) {
    return measureMemory.call(null, params[0], params[1], cb);
}, function (err) {
    if (err) {
        console.log('tests did not all complete');
        process.exit(1);
    }
    console.log('test by doing a ps aux | grep ', process.pid);
    // prevent process from exiting
    setInterval(function () {
        return;
    }, 10000);
});
