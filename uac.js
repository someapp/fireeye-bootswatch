// External requirements.
var _ = require('underscore.string');
var fs = require("fs");
var https = require('https');
var http = require('http');
var express = require('express');
var async = require('async');
var log = require('winston');

// UAC requirements.
var settings = require('settings');
var sso = require('sso');
var route_utils = require('route-utils');
var uac_routes = require('uac-routes');
var sf_routes = require('sf-routes');


//
// Setup default Winston logging.
//
log.remove(log.transports.Console);
log.add(log.transports.Console, {
    level: settings.get('server:log_level'),
    colorize: true
});
log.add(log.transports.File, {
    level: settings.get('server:log_level'),
    colorize: true,
    filename: settings.get('server:log_file'),
    json: false,
    timestamp: true,
    maxsize: settings.get('server:log_maxsize'),
    maxfiles: settings.get('server:log_maxfiles')
});


//
// Initialize the application middleware.
//
var app = express();
app.use(express.compress());
app.use(express.favicon(__dirname + '/static/img/mandiant.ico'));
app.use('/static', express.static('static'));
app.use(express.query());
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.cookieSession({
    key: settings.get('server:session_key'),
    secret: settings.get('server:session_secret'),
    cookie: { path: '/', httpOnly: true, maxAge: null }
}));
app.use(express.csrf());
app.use(sso.require_authentication(settings.get('sso')));
app.use(app.router);
app.use(uac_routes);
app.use('/sf', sf_routes);

route_utils.load_views(app);

// Add a 404 handler.
app.use(function (req, res, next) {
    try {
        log.error(_.sprintf('Requested page: %s was not found.', req.originalUrl));
        if (route_utils.is_html_request(req)) {
            res.render('/uac/404.html');
        }
        else {
            // Send a 404 response to AJAX clients.
            res.send(404, {error: req.originalUrl + ' is not available.'})
        }
    }
    catch (e) {
        // Error.
        log.error('Error rendering 404 page.');
        next(e);
    }
});

// Add a general error handler.
app.use(function errorHandler(err, req, res, next) {
    var message = 'Global error handler caught exception while rendering %s url: %s (status: %s, uid: %s) \n%s';
    var uid = req.attributes && req.attributes.uid ? req.attributes.uid : 'Unknown';
    var stack = err.stack ? err.stack : err;

    // Log the error message and stack trace.
    log.error(_.sprintf(message, req.method, req.originalUrl, res.statusCode, uid, stack));

    if (route_utils.is_html_request(req)) {
        // Display the formatted 500 page.
        res.render('/uac/500.html');
    }
    else {
        // Send a 500 response to AJAX clients.
        res.send(500, {error: req.originalUrl + ' is not available.'})
    }
});


/**
 * Start the UAC application server.
 */
function startup() {
    log.info('');
    log.info('--------------------------');
    log.info('Starting the UAC server...');
    log.info('--------------------------');

    log.info('server:port=%s', settings.get('server:port'));
    log.info('server:ssl=%s', settings.get('server:ssl'));

    if (settings.get('server:ssl') === true) {
        https.createServer({
            key: fs.readFileSync(settings.get('server:ssl_key')),
            cert: fs.readFileSync(settings.get('server:ssl_cert'))
        }, app).listen(settings.get('server:port'));
    }
    else {
        http.createServer(app).listen(settings.get('server:port'));
    }

    log.info('---------------------');
    log.info('UAC server running...');
    log.info('---------------------');
}

/**
 * Shut down the UAC application server.
 */
function shutdown() {
    log.info('');
    log.info('-------------------------------');
    log.info('Shutting down the UAC server...');
    log.info('-------------------------------');
    process.exit();
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', function (err) {
    // Log any error that crashes the server with the keyword = FATAL.
    log.error('FATAL: Encountered an unhandled server exception.');
    log.error(err.stack);

    // Shut down the server.
    shutdown();
});

// Run the server.
startup();