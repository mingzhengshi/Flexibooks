jQuery(document).ready(function ($) {
    console.log("derived.js...");
    var x = 1;

    $("#fb-div-derived-sortables").sortable({
        //cursor: 'move'
    });

    $("#fb-button-add-new-derived-item").click(function () {
        var val = 1;
        $("#div-derived-sortables").append('<div class="div-derived-item"><span>new item ' + x + '</span></div>');
        x++;
    });


    $('#fb-div-jstree').jstree();

});

