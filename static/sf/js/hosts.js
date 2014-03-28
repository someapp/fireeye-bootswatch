var StrikeFinder = StrikeFinder || {};

/**
 * Hits table view for display on the host view.
 * @type {*}
 */
StrikeFinder.HostHitsTableView = UAC.TableView.extend({
    initialize: function (options) {
        var view = this;

        view.collapsable = new UAC.CollapsableContentView({
            el: view.el,
            title: '<i class="fa fa-list"></i> Hits'
        });

        view.options['aoColumns'] = [
            {sTitle: "uuid", mData: "uuid", bVisible: false, bSortable: false},
            {sTitle: "Created", mData: "created", bVisible: true, bSortable: true, sClass: 'nowrap'},
            {sTitle: "Tag", mData: "tagname", bVisible: true, bSortable: true},
            {sTitle: "Summary", mData: "summary1", sClass: 'wrap', bSortable: true},
            {sTitle: "Summary2", mData: "summary2", sClass: 'wrap', bSortable: true},
            {sTitle: "MD5", mData: "md5sum", sClass: 'nowrap', bSortable: true},
            {sTitle: "am_cert_hash", mData: "am_cert_hash", bVisible: false, bSortable: false}
        ];

        view.options['aaSorting'] = [[1, 'desc']];

        view.options.aoColumnDefs = [
            view.date_formatter(1)
        ];

        view.options.sDom = '<"uac-tableheader"l>tip';

        view.options.sAjaxSource = '/sf/api/hits';
        view.options.sAjaxDataProp = 'results';
        view.options.bServerSide = true;

        view.options.oLanguage = {
            sEmptyTable: 'This host does not have any hits.',
            sZeroRecords: 'No matching hits found'
        };

        view.listenTo(view, 'load', function () {
            // Create the CSV link in the table header.

            // The url for the link.
            var url = '/sf/api/hits?format=csv';
            if (view.params) {
                url += '&' + $.param(view.params);
            }
            // The download file for the link.
            var file = 'hits-' + view.params.am_cert_hash + '.csv';
            // The link.
            var html = _.sprintf('<div class="pull-right" style="margin-bottom: 10px"><a download="%s" href="%s">Export to CSV</a></div>', file, url);
            // Add the link the table header.
            view.$el.parent().find('.uac-tableheader').append(html);


            // Load the first hit on load of the view.
            view.select_row(0);
        });

        view.listenTo(view, 'click', function (row, ev) {
            var position = view.get_absolute_index(ev.currentTarget);

            var title;
            if (position !== undefined) {
                title = _.sprintf('<i class="fa fa-list"></i> Hits (%s of %s)', position + 1, view.get_total_rows());
            }
            else {
                title = _.sprintf('<i class="fa fa-list"></i> Hits (%s)', view.get_total_rows());
            }
            // Update the title with the count of the rows.
            view.collapsable.set('title', title);
        });
    }
});

/**
 * StrikeFinder view class for displaying a hosts extended details.
 * @type {*}
 */
StrikeFinder.HostView = UAC.View.extend({
    initialize: function (options) {
        var view = this;

        if (!view.model) {
            var am_cert_hash = options['am_cert_hash'];
            if (!view.model) {
                var attr = {};
                if (options && options.am_cert_hash) {
                    attr.id = options.am_cert_hash;
                }
                view.model = new StrikeFinder.AgentHostModel(attr);
            }
            view.listenTo(this.model, 'sync', this.render);
        }

        view.collapsable = new UAC.CollapsableContentView({
            el: view.el
        });
    },
    render: function () {
        var view = this;

        var data = this.model.toJSON();

        // Update the collapsable title.
        var title = _.sprintf('%s (%s) : %s / %s',
            data.cluster.engagement.client.name, data.cluster.name, data.domain, data.hostname);
        view.collapsable.set('title', '<i class="fa fa-desktop"></i> ' + title);
        // Render the template.
        view.apply_template(StrikeFinder, 'host.ejs', data);
    },
    fetch: function (am_cert_hash) {
        if (am_cert_hash) {
            this.model.id = am_cert_hash;
        }
        this.model.fetch();
    }
});

StrikeFinder.HostsApp = UAC.View.extend({
    initialize: function(options) {
        var view = this;

        view.model = new StrikeFinder.AgentHostModel(StrikeFinder.host);

        // The hosts view.
        view.hosts_view = new StrikeFinder.HostView({
            el: '#host-div',
            model: view.model
        });
        view.hosts_view.render();

        // The hits view.
        view.hits_table_view = new StrikeFinder.HostHitsTableView({
            el: '#hits-table'
        });

        // The hits details.
        view.hits_details_view = new StrikeFinder.HitsDetailsView({
            el: '#hits-details',
            hits_table_view: view.hits_table_view
        });
        view.listenTo(view.hits_details_view, 'create:tag', function(row, tagname) {
            view.hits_table_view.update_row('uuid', row.uuid, 'tagname', tagname, 0);
            view.hits_details_view.fetch();
        });
        view.listenTo(view.hits_details_view, 'create:suppression', function() {
            // Reload the facets after a suppression is created.
            view.facets_view.fetch();
        });
        view.listenTo(view.hits_details_view, 'create:masstag', function() {
            // Reload the facets after a suppression is created.
            view.facets_view.fetch();
        });

        // Hits facets.
        view.facets_view = new StrikeFinder.HitsFacetsView({
            el: '#hits-facets-div'
        });

        // Listen to criteria changes and reload the views.
        view.listenTo(view.facets_view, 'refresh', function(attributes) {
            // Reload the hits.

            console.dir(attributes);

            view.hits_table_view.fetch(attributes);
        });

        view.facets_view.fetch({
            identity_rollup: true,
            am_cert_hash: view.model.get('hash')
        });
    }
});

StrikeFinder.HostTypeAheadView = UAC.View.extend({
    initialize: function () {
        this.render();
    },
    render: function () {
        var typeahead = this.$el.typeahead({
            name: 'hosts',
            remote: {
                url: '/sf/api/hosts?hosts=%QUERY',
                beforeSend: function (jqXhr, settings) {
                    UAC.block();
                },
                filter: function (response) {
                    UAC.unblock();
                    if (!response || response.length === 0) {
                        UAC.display_info('No matching hosts found.');
                    }
                    return response;
                }
            },
            valueKey: 'hostname',
            template: 'host-condensed.ejs',
            engine: {
                compile: function (template) {
                    return {
                        render: function (context) {
                            return StrikeFinder.template(template, context);
                        }
                    };
                }
            }
        });

        typeahead.on('typeahead:selected', function (evt, data) {
            window.location = _.sprintf('/sf/host/%s/', data.hash);
        });
    }
});