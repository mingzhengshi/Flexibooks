<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
*/  
?>  

<?php  
add_filter( 'the_content', 'add_content' );
add_action( 'admin_footer', 'visualdiff_admin_footer' );
//add_action( 'post_submitbox_misc_actions', 'add_revision_diff_button' );

add_action( 'add_meta_boxes', 'add_meta_box_revision' );

function add_content( $content ) {
    $x = 1;
    $y = 2;
    $z = $x + $y;
    return $content . '<p>Thanks for Reading! </p>' . $z;
}

function visualdiff_admin_footer() {
    // Only load js on revision screen
    if (get_current_screen()->id == 'post') {
	    wp_enqueue_script( 'visualdiff', plugins_url( 'js/visualdiff.js' , __FILE__ ), array( 'jquery' ));
    }
}

/*
function add_revision_diff_button()
{
?>
    <div class="misc-pub-section my-options" align="right">
        <input type="submit" value="Compare Revisions" class="button-secondary" id="button-compare-revisions-test">
    </div>
<?php
}
*/

function add_meta_box_revision() {
    global $post;
    if ($post) {
        add_meta_box('meta_box_post_revision', 'Revision', 'meta_box_post_revision_callback', null, 'side', 'core' );
    }
}

function  meta_box_post_revision_callback() {
?>
    <div align="right">
		<input id="button-compare-revisions" type="button" class="button" value="Compare Revisions" style="margin-top: 5px;">
    </div>
<?php    
}

?>  