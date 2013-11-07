var assert = require('assert');
var should = require('should');
var moment = require('moment');

var api = require('sf-api');


var ACQUISITION_UUID = 'c57b89b8-0de6-4df5-9a99-0afa1fbf09b4';


describe('sf-api-tests', function() {

    describe('#get_services', function() {
        it('should return all services', function(done) {
            api.get_services({}, function(err, services) {
                try {
                    should.not.exist(err);
                    should.exist(services);
                    services.length.should.be.greaterThan(0);
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('#get_clusters', function() {
        it('should return clusters', function(done) {
            api.get_clusters({}, function(err, clusters) {
                try {
                    should.not.exist(err);
                    should.exist(clusters);
                    clusters.length.should.be.greaterThan(0);
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
    });

    describe('#get_acquisition_audit', function() {
        it('should return an audit', function(done) {
            try {
                api.get_acquisition_audit(ACQUISITION_UUID, {}, function(err, audit) {
                    should.not.exist(err);
                    should.exist(audit);

                    console.dir(audit);

                    done();
                });
            }
            catch (e) {
                done(e);
            }
        });
    });

});

