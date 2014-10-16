
jQuery(document).ready(function ($) {
    console.log("derived.js...");


    $("#div-derived-sortables").sortable({
        //cursor: 'move'
    });

    $("#button-add-new-derived-item").click(function () {
        var val = 1;
        var title = "item 1";
        //$("#ul-derived-sortables").append('<li><input type="hidden" name="item 1" value="' + val + '" />' + title + '</li>');
        $("#div-derived-sortables").append('<div class="sortable"><span class="span-derived">item 1</span></div>');
    });

});

