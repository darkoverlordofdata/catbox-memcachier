// Load modules

var memjs = require('memjs');
var Hoek = require('hoek');


// Declare internals

var internals = {};


internals.defaults = {
    host: '127.0.0.1',
    port: 11211
};

internals.testConnectionSettings = {
  timeout: 1000,
  idle: 1000,
  failures: 0,
  retries: 0,
  poolsize: 1
};


exports = module.exports = internals.Connection = function (options) {

    options = options || {};

    Hoek.assert(this.constructor === internals.Connection, 'Memcached cache client must be instantiated using new');
    Hoek.assert(!(options.location && (options.host || options.port)), 'Cannot specify both location and host/port when using memcached');

    this.settings = Hoek.applyToDefaults(internals.defaults, options);
    this.settings.location = this.settings.location || (this.settings.host + ':' + this.settings.port);
    delete this.settings.port;
    delete this.settings.host;

    this.client = null;
    return this;
};


internals.Connection.prototype.start = async function() {

    var self = this;
    if (this.client) {
        return;
    }

    var connect = async function () {

        self.client = await memjs.Client.create(self.settings.location, self.settings);

    };

    var testConnectionSettings = Hoek.applyToDefaults(internals.testConnectionSettings, {
      timeout: self.settings.timeout,
      idle: self.settings.idle
    });

    var testConnection = memjs.Client.create(this.settings.location, testConnectionSettings);

    testConnection.get('foobar', function (err) {

        if (err) {
            testConnection.quit();
            return callback(new Error('Failed opening memjs connection'));
        }

        connect();
    });
};


internals.Connection.prototype.stop = function () {

    if (this.client) {
        this.client.quit();
        this.client = null;
    }
};


internals.Connection.prototype.isReady = function () {

    return (!!this.client);
};


internals.Connection.prototype.validateSegmentName = function (name) {

    if (!name) {
        return new Error('Empty string');
    }

    if (name.indexOf('\0') !== -1) {
        return new Error('Includes null character');
    }

    // https://github.com/memcached/memcached/blob/master/doc/protocol.txt#L47-49

    if (name.match(/\s/g)) {
        return new Error('Includes space character');
    }

    return null;
};


internals.Connection.prototype.get = async function (key) {
    let envelope;
    if (!this.client) {
        return Promise.reject(new Error('Connection not started'));
    }
    const res = await this.client.get(this.generateKey(key))
    if (!res || (res && !res.value)) {
        return Promise.resolve(null);
    }
    try {
        envelope = JSON.parse(res.value);
    }
    catch (err) { }  // Handled by validation below

    if (!envelope) {
        return Promise.reject(new Error('Bad envelope content'));
    }

    if (!envelope.item ||
        !envelope.stored) {

        return Promise.reject(new Error('Incorrect envelope structure'));
    }

    return Promise.resolve(envelope);
    // this.client.get(this.generateKey(key), function (err, result) {

    //     if (err) {
    //         return Promise.reject(err);
    //     }

    //     if (!result) {
    //         return Promise.resolve(null, null);
    //     }

    //     var envelope = null;
    //     try {
    //         envelope = JSON.parse(result);
    //     }
    //     catch (err) { }  // Handled by validation below

    //     if (!envelope) {
    //         return Promise.reject(new Error('Bad envelope content'));
    //     }

    //     if (!envelope.item ||
    //         !envelope.stored) {

    //         return Promise.reject(new Error('Incorrect envelope structure'));
    //     }

    //     return Promise.resolve(envelope);
    // });
};


internals.Connection.prototype.set = async function (key, value, ttl, callback) {

    var self = this;

    if (!this.client) {
        return Promise.reject(new Error('Connection not started'));
    }

    var envelope = {
        item: value,
        stored: Date.now(),
        ttl: ttl
    };

    var cacheKey = this.generateKey(key);

    var stringifiedEnvelope = null;

    try {
        stringifiedEnvelope = JSON.stringify(envelope);
    }
    catch (err) {
        return Promise.reject(err);
    }

    var ttlSec = Math.max(1, Math.floor(ttl / 1000));
    this.client.set(cacheKey, stringifiedEnvelope, { expires:ttlSec },function(err) {
        if (err) {
            Promise.reject(err);
        } else {
            Promise.resolve();
        }
    });
};


internals.Connection.prototype.drop = async function (key, callback) {

    if (!this.client) {
        return Promise.reject(new Error('Connection not started'));
    }

    this.client['delete'](this.generateKey(key), function (err) {

        return Promise.reject(err);
    });
};


internals.Connection.prototype.generateKey = function (key) {

    return encodeURIComponent(this.settings.partition) + ':' + encodeURIComponent(key.segment) + ':' + encodeURIComponent(key.id);
};
