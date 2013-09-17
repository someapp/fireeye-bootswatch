var StrikeFinder = StrikeFinder || {};

//
// StrikeFinder Utility Methods.
//

StrikeFinder.format_suppression = function (s) {
    return _.sprintf('%s \'%s\' \'%s\' (preservecase=%s)', s.itemkey, s.itemvalue, s.condition, s.preservecase);
};

/**
 * Retrieve a formatted blocking message.
 * @param message - the message to display.
 * @returns {*} - the formatted message.
 */
StrikeFinder.get_blockui_message = function (message) {
    return _.sprintf("<span class=''><h4>" +
        "<i class='icon-spinner icon-spin icon-3x' style='vertical-align: middle'></i> " +
        "%s" +
        "</h4></span>", message);
};

StrikeFinder.collapse = function(el) {
    _.each($(el).find('.collapsable-header'), function(collapsable) {
        var v = new StrikeFinder.CollapsableContentView({
            el: '#' + collapsable.id,
            title: $(collapsable).attr('collapsable-title'),
            title_class: 'uac-header'
        });
    });
    _.each($(el).find('.collapsable'), function(collapsable) {
        var v = new StrikeFinder.CollapsableContentView({
            el: '#' + collapsable.id,
            title: $(collapsable).attr('collapsable-title'),
            title_class: 'uac-sub-header',
            display_toggle: false
        });
    });
};

/**
 * Retrieve the default block ui options.
 * @param message - the message to display.
 * @returns - the default options.
 */
StrikeFinder.get_blockui_options = function (message) {
    if (message === undefined) {
        message = 'Loading...';
    }

    return {
        message: message ? StrikeFinder.get_blockui_message(message) : message,
        css: {
            border: "1px solid #822433",
            padding: '15px',
            color: "#822433",
            opacity: .9,
            backgroundColor: "#ffffff"
        },
        overlayCSS: {
            backgroundColor: '#ffffff',
            opacity: .6
        },
        baseZ: 5000
    }
};

StrikeFinder.blockui = function (ev) {
    $.blockUI(StrikeFinder.get_blockui_options('Loading...'));
    $('.blockOverlay').attr('title','Double click the overlay to unblock').dblclick($.unblockUI);
};

StrikeFinder.blockui_element = function(el) {
    el.block(StrikeFinder.get_blockui_options(null));
};

StrikeFinder.unblockui = function(el) {
    if (el) {
        el.unblock();
    }
    else {
        $.unblockUI();
    }
};

StrikeFinder.run = function (fn) {
    try {
        StrikeFinder.blockui();
        fn();
    }
    finally {
        StrikeFinder.unblockui();
    }
};

StrikeFinder.show_views = function (views, on) {
    _.each(views, function (view) {
        if (on) {
            view.show();
        }
        else {
            view.hide();
        }
    });
};

//
// ---------- Utilities ----------
//

StrikeFinder.display_info = function (message) {
    $.bootstrapGrowl(message, {
        type: 'info',
        width: 'auto',
        delay: 10000
    });
};

StrikeFinder.display_warn = function (message) {
    $.bootstrapGrowl(message, {
        type: 'warn',
        width: 'auto',
        delay: 10000
    });
};

StrikeFinder.display_success = function (message) {
    $.bootstrapGrowl(message, {
        type: 'success',
        width: 'auto',
        delay: 10000
    });
};

StrikeFinder.display_error = function (message) {
    $.bootstrapGrowl(message, {
        type: 'error',
        width: 'auto',
        delay: 15000
    });
};


//
// Override Backbone default settings.
//

/**
 * Override the default backbone POST behavior to send the Django CSRF token.
 */
var _sync = Backbone.sync;
Backbone.sync = function (method, model, options) {
    options.beforeSend = function (xhr) {
        var token = $('meta[name="csrf-token"]').attr('content');
        xhr.setRequestHeader('X-CSRF-Token', token);
    };
    return _sync(method, model, options);
};


//
// Override jQuery defaults.
//

/**
 * Required to make jQuery drop the subscripts off of array parameters.
 */
jQuery.ajaxSettings.traditional = true;

$(document).ajaxStart(StrikeFinder.blockui).ajaxStop($.unblockUI);

$(document).ajaxError(function (collection, response, options) {

    //console.dir(collection);
    //console.dir(response);
    //console.dir(options);

    if (response) {
        if (response.status == 307) {
            // No session? TODO
            console.dir('Redirecting to login...');
            window.location = document.URL;
        }
        else {
            if (!('abort' == response.statusText)) {
                // Error
                log.warn("Exception (" + response.statusText + ") while processing request for url: " +
                    collection.url);
                log.warn(response.data);
                StrikeFinder.display_error("An error has occurred while processing your request: " + response.statusText);
            }
        }
    }
    else {
        log.warning("Error during processing, response is invalid");
    }
});
//$.ajaxSetup({
//    timeout: 180000
//});

/**
 * Tokenize a string based on whitespace and commas.
 * @param s - the input string.
 * @return the list of search terms.
 */
function parse_search_string(s) {
    var token_list = s.split(/[\s,]+/);
    var valid_tokens = [];
    _.each(token_list, function (t) {
        if (t != '') {
            valid_tokens.push(t);
        }
    });
    return valid_tokens;
}

function format_date(s) {
    return s ? moment(s, 'YYYY-MM-DDTHH:mm:ss.SSS').format('YYYY-MM-DD HH:mm:ss') : '';
}

function format_expression(s) {
    console.log(s);
    s = s.trim();
    var starts_with_parend = _.startsWith(s, '(');
    var ends_with_parend = _.endsWith(s, ')');
    if (starts_with_parend && ends_with_parend) {
        console.log(s.substring(1, s.length - 1));
        return format_expression(s.substring(1, s.length - 1));
    }
    else {
        return s;
    }
}
