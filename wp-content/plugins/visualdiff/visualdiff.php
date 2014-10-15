<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
*/  
?>  

<?php  

//-----------------------------------------------------------------------------------------------
// source and derive meta boxes

add_action( 'add_meta_boxes', 'fb_add_meta_box_source_list' );

function fb_add_meta_box_source_list() {
    global $post;
    if ($post) {        
        if ($post->post_type == 'derived'){
        add_meta_box('meta_box_source_list', 'Source Documents', 'fb_meta_box_source_list_callback', null, 'side', 'core' );
        }
    }
}

function fb_meta_box_source_list_callback() {
?>
    <ul>
        <?php
        global $post;
        $args = array( 'post_type' => 'source' );
        $source_posts = get_posts( $args );
        foreach( $source_posts as $post ) : 
            setup_postdata($post); 
            ?>
            <li>
                <input type="checkbox" id="<?php $post->id ?>"/>
                <label for="<?php $post->id ?>"><?php the_title();  ?></label>
            </li>
            <!--li><?php the_title();  ?></li-->
        <?php endforeach; ?>
    </ul>
    <input type="button" value="Add Source Item" class="button-secondary" />
<?php    
}

add_action( 'add_meta_boxes', 'fb_add_meta_box_derived_document' );

function fb_add_meta_box_derived_document() {
    global $post;
    if ($post) {        
        if ($post->post_type == 'derived'){
            add_meta_box('meta_box_derived_document', 'Derived Document', 'fb_meta_box_derived_document_callback', null, 'side', 'core' );
        }
    }
}

function fb_meta_box_derived_document_callback() {
?>
<ul id="ul-derived-sortables">
</ul>

<input type="button" value="Add New Item" class="button-secondary" />
<?php    
}

//-----------------------------------------------------------------------------------------------
// revisions

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

/*
add_filter( 'the_content', 'add_content' );

function add_content( $content ) {
    $x = 1;
    $y = 2;
    $z = $x + $y;
    return $content . '<p>Thanks for Reading! </p>' . $z;
}
*/

add_action( 'admin_footer', 'visualdiff_admin_footer' );

function visualdiff_admin_footer() {
    // Only load js on revision screen
    if (get_current_screen()->id == 'post') {
	    wp_enqueue_script('visualdiff', plugins_url( 'js/visualdiff.js' , __FILE__ ), array( 'jquery' ));
    }    
    $type = get_current_screen()->post_type;
    if ($type == 'derived') {
        wp_enqueue_script('derived', plugins_url( 'js/derived.js' , __FILE__ ), array( 'jquery' ));
    }
}

/*
add_action( 'post_submitbox_misc_actions', 'add_revision_diff_button' );
 * 
function add_revision_diff_button()
{
?>
    <div class="misc-pub-section my-options" align="right">
        <input type="submit" value="Compare Revisions" class="button-secondary" id="button-compare-revisions-test">
    </div>
<?php
}
*/

add_action( 'add_meta_boxes', 'add_meta_box_revision' );

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
// add custom post types

add_action( 'init', 'fb_create_post_type' );

function fb_create_post_type() {
    $args = array(
        'labels' => array(
            'name' => 'Sources',
            'singular_name' => 'Source',
            'add_new' => 'Add New',
            'add_new_item' => 'Add New Source Document',
            //'edit' => __( 'Edit' ),
            //'edit_item' => __( 'Edit Source Document' ),
            //'new_item' => __( 'New Source Document' ),
            //'view' => __( 'View Source Document' ),
            //'view_item' => __( 'View Source Document' ),
            //'search_items' => __( 'Search Source Document' ),
            //'not_found' => __( 'No Source Document found' ),
            //'not_found_in_trash' => __( 'No Events found in Trash' ),
            //'parent' => __( 'Parent Source Document' ),
        ),
        //'label' => 'Sources',
        //'singular_label' => 'Source',
        //'menu_position' => 2,
        'menu_icon' => 'dashicons-admin-page',
        'public' => true,
        'has_archive' => true,
        'show_ui' => true,
        'hierarchical' => false,
        'rewrite' => true,
        'supports' => array(
            'title',
            'editor',
            //'excerpt',
            //'trackbacks',
            //'custom-fields',
            //'comments',
            //'revisions',
            //'thumbnail',
            //'author',
            //'page-attributes',
            //'post-formats'
            )
    );
    
    register_post_type('source', $args);
    
    $args2 = array(
            'labels' => array(
                'name' => 'Derived',
                'singular_name' => 'Derived',
                'add_new' => 'Add New',
                'add_new_item' => 'Add New Derived Document',
                //'edit' => __( 'Edit' ),
                //'edit_item' => __( 'Edit Source Document' ),
                //'new_item' => __( 'New Source Document' ),
                //'view' => __( 'View Source Document' ),
                //'view_item' => __( 'View Source Document' ),
                //'search_items' => __( 'Search Source Document' ),
                //'not_found' => __( 'No Source Document found' ),
                //'not_found_in_trash' => __( 'No Events found in Trash' ),
                //'parent' => __( 'Parent Source Document' ),
            ),
            //'label' => 'Derived',
            //'singular_label' => 'Derived',
            //'menu_position' => 2,
            'menu_icon' => 'dashicons-admin-page',
            'public' => true,
            'has_archive' => true,
            'show_ui' => true,
            'hierarchical' => false,
            'rewrite' => true,
            'supports' => array(
                'title',
                'editor',
                //'excerpt',
                //'trackbacks',
                //'custom-fields',
                //'comments',
                //'revisions',
                //'thumbnail',
                //'author',
                //'page-attributes',
                //'post-formats'
                )
    );
    
    register_post_type('derived', $args2);

}

//-----------------------------------------------------------------------------------------------
// change the style of wp editor - see http://codex.wordpress.org/TinyMCE_Custom_Styles

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

// attach callback to 'tiny_mce_before_init' 
add_filter( 'tiny_mce_before_init', 'fb_mce_before_init_insert_formats' );  

// callback function to filter the MCE settings
function fb_mce_before_init_insert_formats( $init_array ) {  
	// Define the style_formats array
	$style_formats = array(  
		// Each array child is a format with it's own settings
		array(  
			'title' => 'h2 activity',  
			'block' => 'h2',  
			'classes' => 'h2.activity',
			'wrapper' => true,			
		)
	);  
    
	// Insert the array, JSON ENCODED, into 'style_formats'
	$init_array['style_formats'] = json_encode( $style_formats );  
	
	return $init_array;  
    
} 
*/

/*
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

function fb_mce_editor_enqueue() {
    $style_url = trailingslashit( plugin_dir_url(__FILE__) ) . '/css/editor.css';
    wp_enqueue_style( 'myCustomStyles', $style_url );
}
*/

?>


