<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
*/  
?>  

<?php  
add_filter( 'the_content', 'add_content' );
add_action( 'admin_footer', 'visualdiff_admin_footer' );

function add_content( $content ) {
    $x = 1;
    $y = 2;
    $z = $x + $y;
    return $content . '<p>Thanks for Reading! </p>' . $z;
}

function visualdiff_admin_footer() {
		// Only load js on revision screen
		if (get_current_screen()->id == 'revision') {
			wp_enqueue_script( 'visualdiff', plugins_url( 'js/visualdiff.js' , __FILE__ ), array( 'jquery' ));
        }
    }
?>  