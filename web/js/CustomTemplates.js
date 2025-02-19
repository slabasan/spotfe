ST.CustomTemplates = function() {

    var get_temps_and_show_ = function( use_mutli_templates ) {

        ST.CallSpot.use_multi_templates = use_mutli_templates;

        var sf = ST.Utility.get_file();
        const isContainer = window.ENV.machine == 'container';
        var commandFunction = 'getTemplates';
        var url = '/getTemplates';

        if( isContainer ) {

            ST.Utility.container_ajax( url, commandFunction, sf, show_choices_container_);
        } else {

            ST.CallSpot.ajax({
                type: commandFunction,
                file: sf,
                success: show_choices_,
                error: function( el ) {
                    console.dir(el);
                }
            });
        }
    };


    var show_choices_container_ = function( com ) {

        com = com.replace(/'/g, '');
        com = com.replace('(', '');
        com = com.replace(')', '');

        var json = JSON.parse( com );
        show_choices_render_( json );
    };


    var show_choices_ = function( returned_dat ) {

        if (returned_dat.error !== "") {
            ReusableView.modal({
                header: "error",
                body: returned_dat.error
            });
            return 0;
        }

        var com = returned_dat.output.command_out;

        com = com.replace('(', '');
        com = com.replace(')', '');
        com = com.replace(/'/g, '');

        var json_pre = JSON.parse(com);
        show_choices_render_( json_pre );
    };


    var no_templates_explanation_ = '<br><br>' +
        'Found 0 templates.  Please add templates.' +
        '<h4>Locations of templates:</h4>' +
        '<ul>' +
        '<li>~/notebooks</li>' +
        '<li>Spot file input directory - this is the input directory you specified at the top of the page.</li>' +
        '<li>/usr/gapps/spot/templates/</li>' +
        '</ul>';


    var show_choices_render_ = function( json_pre ) {

        console.dir( json_pre );

        var type_of_temps_to_use = ST.CallSpot.use_multi_templates ? 'multi' : 'single';
        var json = json_pre[ type_of_temps_to_use ];

        var options = "<option>Select a notebook:</option>";

        for( var x=0; x < json.length; x++ ) {
            options += "<option>" + json[x] + '</option>';
        }

        var explain = json.length === 0 ? no_templates_explanation_ : '';

        var body = "<div class='select_a'>" +
            "Select which jupyter notebook you want to open:" +
            "<a class='explanation' href='javascript: void();'>?</a>" +
            "</div>" +
            "<select class='jupyter_notebook'>" + options + '</select>' + explain;

        ReusableView.modal({
            body: body,
            header: "Select a Custom Notebook"
        });

        $('.outer_modal .explanation').unbind('click').bind('click', explanation_);
        $('.outer_modal .jupyter_notebook').change( jupyter_notebook_selected_ );
    };


    var explanation_ = function() {

        ReusableView.modal({
            body: 'You can make custom jupyter templates in jupyter notebooks.  ' +
                'They need to be saved in one of these locations:' +
                "<h4>Locations of templates:</h4>" +
                "<ul>" +
                "<li>~/notebooks</li>" +
                "<li>Spot file input directory - this is the input directory you specified at the top of the page.</li>" +
                "<li>/usr/gapps/spot/templates/</li>" +
                "</ul>" +
                "Within each of those directories you need to have 2 directories " +
                "called <b>'single'</b> and <b>'multi'.</b>  " +
                "The <b>single</b> directory is where you put your single jupyter templates.  " +
                "The <b>multi</b> directory is where you put your multi jupyter templates." +
                "<br><br>" +
                "When you select a template, a number of substitutions are made." +
                "You may put the following strings inside your template, using an editor.  " +
                "Once your template is selected from the spot2 dashboard, the following substitutions will be made." +
                "" +
                "<h4>Template substitutions:</h4>" +
                "<table class='list_of_temp'>" +
                "<tr><td>MUTLI_CALI_FILES</td><td>the runs you select are passed to any multi template you select.</td></tr>" +
                "<tr><td>CALI_METRIC_NAME</td><td>the first runs 'metric_name' attribute is substitued for this.</td></tr>" +
                "<tr><td>CALI_QUERY_PATH</td><td>/usr/gapps/spot/caliper-install/bin is subtituted for this string</td></tr>" +
                "<tr><td>DEPLOY_DIR</td><td>/usr/gapps/spot/ is subtitued for this.</td></tr>" +
                "</table>",
            header: "Substitutions",
            classes: "template_explain_main"
        });
    };

    var jupyter_notebook_selected_ = function( el ) {

        console.dir( el );
        var selected_notebook = $(el.target).val();
        var custom = " --custom_template=" + selected_notebook;

        if( ST.CallSpot.use_multi_templates ) {

            multiJupyterExe_(custom);
            return true;
        }

        var file = ST.CallSpot.filepath;

        ST.Utility.start_spinner();

        var host = ST.params.machine;
        var command = ST.CallSpot.get_command_begin() + ' ' + "jupyter" + custom;

        console.log("ST.graph.openJupyter( \"" + file + "\", \"" + host + "\", \"" + command + "\" );");

        ST.graph.openJupyter( file, host, command ).then( function( url ) {

            ST.Utility.stop_spinner();

            console.dir(url);
            //var command_out = data.output.command_out;
            //var url = command_out;

            window.open(url);
            // now go to the URL that BE tells us to go to.
        });
    };


    var  multiJupyterExe_ = function( custom ) {

        ST.Utility.start_spinner();

        var cali_keys = ST.CallSpot.get_keys();// ST.str_cali_keys;
        var cali_count = cali_keys.split(' ').length;
        var cali_keys_arr = cali_keys.split(' ');

        //  cali_path is /usr/gapps/spot/datasets/lulesh_gen/500/5.cali
        var file_path = $('.directory').val();
        var cali_quoted = " \"" + cali_keys + "\"";
        var total_send = file_path + cali_quoted;
        var limit = 15000; // 1700;
        var t_count = total_send.length;

        //limit = 50000;
        console.log("t_count = " + t_count );


        if( cali_count <= 1 ) {

            ReusableView.warning("Less than 2 rows are selected.  Please select 2 or more rows to compare.");
            ST.Utility.stop_spinner();
            return false;
        }

        if( t_count > limit ) {

            ReusableView.warning("Too many rows selected.  Please narrow the selection.  <br>" +
                "request chars = " + t_count + "  limit = " + limit);
            ST.Utility.stop_spinner();
            return false;
        }

        var host = ST.params.machine;
        var command = ST.CallSpot.get_command_begin() + " multi_jupyter" + custom;

        console.dir( cali_keys_arr );
        console.log( "host=" + host + "    command = " + command );

        ST.graph.openMultiJupyter( file_path, cali_keys_arr, host, command ).then( finish_multi_ );
    };


    var finish_multi_ = function(data) {

        ST.Utility.stop_spinner();

        ST.Utility.check_error( data );
        var command_out = data; // data.output.command_out;
        var url = command_out;
        console.log('co=' + command_out);

        window.open(url);
        // now go to the URL that BE tells us to go to.
    };

    return {
        get_temps_and_show: get_temps_and_show_
    }
}();