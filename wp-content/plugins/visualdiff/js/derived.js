
jQuery(document).ready(function ($) {
    console.log("derived.js...");
    var x = 1;

    $("#div-derived-sortables").sortable({
        //cursor: 'move'
    });

    $("#button-add-new-derived-item").click(function () {
        var val = 1;
        $("#div-derived-sortables").append('<div class="div-derived-item sortable"><span>item ' + x + '</span></div>');
        x++;
    });

});

