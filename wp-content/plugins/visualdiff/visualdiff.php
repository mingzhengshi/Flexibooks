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
add_action( 'admin_menu', 'add_revision_compare_page' );


function add_revision_compare_page(){
    //$path = ABSPATH;
    $path = dirname(__FILE__);
    
    $func_content = "include_once('$path/revisionsdiff.php');";
    $func = create_function('', $func_content );	
    
    // set $parent_slug=NULL or set to 'options.php' if you want to create a page that doesn't appear in any menu 
    //add_submenu_page('none', 'Revisions test', 'Revisions test','visualdiff/revisioncompare.php');
    add_submenu_page('none', 'Revisions test', 'Revisions test', 'read', 'fb-revisions', $func);
}




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

function meta_box_post_revision_callback() {
    $post_id = get_the_ID();
    $redirect = "admin.php?page=fb-revisions&amp;postid={$post_id}";
?>
    <div align="right">
        <input id="button-compare-revisions" type="button" class="button" value="Compare Revisions" style="margin-top: 5px;" onclick="window.location=<?php echo "'" . $redirect . "'"; ?>;">
    </div>
<?php    
}

//-----------------------------------------------------------------------------------------------
// change the style of wp editor
//-----------------------------------------------------------------------------------------------

// apply styles to the visual editor
add_filter('mce_css', 'fb_mce_editor_style');

function fb_mce_editor_style($url) {
    if ( !empty($url) )
        $url .= ',';
    
    $url .= trailingslashit( plugin_dir_url(__FILE__) ) . '/css/editor.css';
    
    return $url;
}

/*
// add styles drop-down
add_filter( 'mce_buttons_2', 'fb_mce_editor_buttons' );

function fb_mce_editor_buttons( $buttons ) {
    array_unshift( $buttons, 'styleselect' );
    return $buttons;
}

// add styles/classes to the styles drop-down
add_filter( 'tiny_mce_before_init', 'fb_mce_before_init' );

function fb_mce_before_init( $settings ) {
    $style_formats = array(
        array(
            'title' => 'Download Link',
            'selector' => 'a',
            'classes' => 'download'
            ),
        array(
            'title' => 'Testimonial',
            'selector' => 'p',
            'classes' => 'testimonial',
        )
    );
    
    $settings['style_formats'] = json_encode( $style_formats );
    
    return $settings;   
}

// add custom stylesheet to the website front-end with hook 'wp_enqueue_scripts'
add_action('wp_enqueue_scripts', 'fb_mce_editor_enqueue');

function tuts_mcekit_editor_enqueue() {
    $style_url = plugin_dir_url(__FILE__) . 'css/editor.css'; 
    wp_enqueue_style( 'myCustomStyles', $style_url );
}
*/
?>


