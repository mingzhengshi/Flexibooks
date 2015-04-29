<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
*/  

require_once( 'simple_html_dom.php' );

//add_action( 'admin_menu', 'fb_add_revision_compare_page' );
add_action( 'admin_head', 'fb_derived_admin_head' );
add_action( 'admin_footer', 'fb_derived_admin_footer' );
add_action( 'admin_footer', 'fb_admin_footer' );
add_action( 'init', 'fb_create_post_type' );

//add_action( 'add_meta_boxes', 'fb_add_meta_box_source_list' );
add_action( 'add_meta_boxes', 'fb_add_meta_box_derived_document' );
//add_action( 'add_meta_boxes', 'fb_add_meta_box_revision' );

add_action( 'edit_page_form', 'fb_add_post_box_derived_document' );
add_action( 'edit_form_advanced', 'fb_add_post_box_derived_document' );
add_action( 'save_post', 'fb_save_document', 1, 2);
add_filter( 'wp_insert_post_data' , 'fb_filter_post_data' , '99', 2 );

// ajax action
add_action( 'wp_ajax_fb_source_query', 'fb_source_query' );
add_action( 'wp_ajax_fb_source_revision_query', 'fb_source_revision_query' );
add_action( 'wp_ajax_fb_source_element_revision_query', 'fb_source_element_revision_query' );

// tinymce editor
add_filter('mce_css', 'fb_mce_editor_style');
add_filter('tiny_mce_before_init', 'fb_allow_all_tinymce_elements_attributes');

// tinymce plugin
add_filter( 'mce_external_plugins', 'fb_tinymce_plugin' );

// tinymce custom formats
add_filter( 'mce_buttons_2', 'fb_mce_editor_buttons_second_row' );
add_filter( 'mce_buttons_3', 'fb_mce_editor_buttons_third_row' );
add_filter( 'tiny_mce_before_init', 'fb_mce_before_init' );

// add js
add_action('admin_print_scripts', 'fb_admin_print_scripts');

// include wordpress dashicons
add_action( 'admin_enqueue_scripts', 'fb_custom_tinymce_dashicons' );

// edit.php page
/*
add_action('admin_head-edit.php', 'fb_create_new_derive');

function fb_create_new_derive() {
    $id = get_current_screen()->id;

    if ($id == 'edit-source') {
?>
    <script type="text/javascript">
        jQuery(document).ready(function ($) {
            $('.wrap h2').append('<a href="" class="add-new-h2">Create Derive</a>');
        });
    </script>
    <?php 
    }
}
*/

//-----------------------------------------------------------------------------------------------
// Called on the admin_enqueue_scripts action, enqueues CSS to 
// make all WordPress Dashicons available to TinyMCE. This is
// where most of the magic happens.

function fb_custom_tinymce_dashicons() {
    $id = get_current_screen()->id;

    if (($id == 'derived') || ($id == 'source')) {      
	    wp_enqueue_style( 'custom_tinymce_dashicons', plugins_url( 'css/custom-tinymce-dashicons.css', __FILE__ ) );
    }
}

//-----------------------------------------------------------------------------------------------
// load external TinyMCE plugins
 
function fb_tinymce_plugin( $tinymce_vb ) {
	$tinymce_vb[ 'fb_folding_editor' ] = plugins_url( 'js/tinymce.js', __FILE__ );
	return $tinymce_vb;
}

//-----------------------------------------------------------------------------------------------
// tinymce custom buttons

function fb_mce_editor_buttons_second_row( $buttons ) {
    //---------------------------------------------------------------------
    // I think this section is not required for tinymce advanced (plugin)
    
    // remove the 'formatselect' button from the buttons
    $value = array_search( 'formatselect', $buttons );
    if ( FALSE !== $value ) {
        foreach ( $buttons as $key => $value ) {
            if ( 'formatselect' === $value )
                unset( $buttons[$key] );
        }
    }
    
    // add 'styleselect' to the buttons
    array_unshift( $buttons, 'styleselect' );
    
    
    //---------------------------------------------------------------------
    // add custom buttons
    
    //array_push( $buttons, 'fb_custom_button_1' );
    
    return $buttons;
}

function fb_mce_editor_buttons_third_row( $buttons ) {
    //$type = get_current_screen()->post_type;
    $id = get_current_screen()->id;
    // add custom buttons
    if ($id == 'derived') {
        array_push( $buttons, 'fb_custom_button_table_of_content' );
        array_push( $buttons, 'fb_custom_button_page_boundary' );
        return $buttons;
    }
}

function fb_mce_before_init( $settings ) {

    $style_formats = array(
        array(
            'title' => 'Heading 1 Main',
            'block' => 'h1',
            'classes' => 'main-heading-1'
        ),
        array(
            'title' => 'Heading 2 Main',
            'block' => 'h2',
            'classes' => 'main-heading-2'
        ),
        array(
            'title' => 'Heading 2 Activity',
            'block' => 'h2',
            'classes' => 'activity'
        ),
        array(
            'title' => 'Answer',
            'block' => 'hr',
            'classes' => 'answer'
        ),
        array(
            'title' => 'body text italic',
            //'block' => 'p',
            'inline' => 'span',
            'classes' => 'body-text-italic'
        ),
        array(
            'title' => 'assessed outcomes',
            'block' => 'p',
            'classes' => 'assessed'
        ),
        array(
            'title' => 'C head SM',
            'block' => 'p',
            'classes' => 'c-head-sm'
        ),
        array(
            'title' => 'D head SM',
            'block' => 'p',
            'classes' => 'd-head-sm'
        ),
        array(
            'title' => 'diagram',
            'block' => 'p',
            'classes' => 'diagram'
        ),
        array(
            'title' => 'diagram2',
            'block' => 'p',
            'classes' => 'diagram2'
        ),
        array(
            'title' => 'question SM',
            //'block' => 'p',
            'inline' => 'span',
            'classes' => 'question-sm'
        ),
        array(
            'title' => 'Subtitle',
            'block' => 'p',
            'classes' => 'subtitle'
        ),
        array(
            'title' => 'Title',
            'block' => 'p',
            'classes' => 'title'
        )
    );

    $settings['style_formats'] = json_encode( $style_formats );

    return $settings;

}

//-----------------------------------------------------------------------------------------------
// for derived post type only
function fb_derived_admin_head() {
    $id = get_current_screen()->id;
    //$type = get_current_screen()->post_type;
    //$single = is_single();
    
    if (($id == 'derived') || ($id == 'source')) {
        $fb_js_url = plugins_url( 'js/fb.js' , __FILE__ );
        echo '<script type="text/javascript" src="' . $fb_js_url . '" ></script>';
    }
    
    if ($id == 'derived') {
        $htmldiff_js_url = plugins_url( 'js/htmldiff.js' , __FILE__ );
        $derived_js_url = plugins_url( 'js/derived.js' , __FILE__ );
        //$jstree_js_url = plugins_url( 'lib/jstree/jstree.min.js' , __FILE__ );
        
        $derived_css_url = plugins_url( 'css/derived.css' , __FILE__ );
        //$jstree_css_url = plugins_url( 'lib/jstree/themes/default/style.min.css' , __FILE__ );
        //$editor_div_css_url = plugins_url( 'css/editor_div.css' , __FILE__ );
        $jquery_css_url = plugins_url( 'css/jquery-ui-themes-1.11.2/themes/smoothness/jquery-ui.css' , __FILE__ );
    

        echo '<script type="text/javascript" src="' . $htmldiff_js_url . '" ></script>'; // need to come first; to be used in other js files;
        echo '<script type="text/javascript" src="' . $derived_js_url . '" ></script>';
        //echo '<script type="text/javascript" src="' . $jstree_js_url . '" ></script>';
        
        echo '<link rel="stylesheet" type="text/css" href="' . $derived_css_url . '" />';
        //echo '<link rel="stylesheet" type="text/css" href="' . $jstree_css_url . '" />';
        //echo '<link rel="stylesheet" type="text/css" href="' . $editor_div_css_url . '" />';
        echo '<link rel="stylesheet" type="text/css" href="' . $jquery_css_url . '" />';
    }   
    else if ($id == 'source') {        
        $source_js_url = plugins_url( 'js/source.js' , __FILE__ );
        
        echo '<script type="text/javascript" src="' . $source_js_url . '" ></script>';
    }
}

function fb_derived_admin_footer() {
    //$type = get_current_screen()->post_type;
    $id = get_current_screen()->id;
    if ($id == 'derived') {

        

    }
}

function fb_admin_print_scripts() {
    $id = get_current_screen()->id;

    if (($id == 'derived') || ($id == 'source')) {       
        wp_enqueue_script('jquery');
        wp_enqueue_script('jquery-ui-core');
        wp_enqueue_script('jquery-ui-tabs');
        wp_enqueue_script('jquery-ui-dialog');
        wp_enqueue_script('jquery-ui-selectable');
        wp_enqueue_script('jquery-ui-button');
        //wp_enqueue_script('jquery-ui-draggable'); 
    }
}

//-----------------------------------------------------------------------------------------------
// ajax action

function fb_source_query() {   
    // add a new tab
    
    
    // query the post content
    $post_content = "";
    
    $post_id = $_POST['id'];

    $post = get_post( $post_id );
    //$post_content = $post->post_content;
    //echo $post_content;
    
    $data = array(
        'content' => $post->post_content,
        'title' => $post->post_title,
        'modified' => $post->post_modified
    );

    echo json_encode($data);
	die(); // this is required to terminate immediately and return a proper response
}

function fb_source_revision_query() {
    $post_id = $_POST['id'];
    $post_modified = $_POST['post_modified'];
    
    $post_content = "";
    
    global $wpdb;
    $status = 'inherit';
    $post_revision = $wpdb->get_results(
        "
        SELECT * FROM $wpdb->posts 
        WHERE post_type = 'revision' 
            AND post_parent = '$post_id' 
            AND post_status = '$status' 
            AND post_modified = '$post_modified'
        ");
    
    if (count($post_revision) == 1) {
        $post_content = $post_revision[0]->post_content;       
    }
    
    $data = array(
        'content' => $post_content
    );

    echo json_encode($data);
	die(); // this is required to terminate immediately and return a proper response
}

function fb_source_element_revision_query() {
    $post_id = $_POST['id'];
    $post_modified = $_POST['post_modified'];
    $element_id = $_POST['element_id'];
    
    $outer_text = "";
    
    global $wpdb;
    $status = 'inherit';
    $post_revision = $wpdb->get_results(
        "
        SELECT * FROM $wpdb->posts 
        WHERE post_type = 'revision' 
            AND post_parent = '$post_id' 
            AND post_status = '$status' 
            AND post_modified = '$post_modified'
        ");
    
    if (count($post_revision) == 1) {
        $post_content = $post_revision[0]->post_content;
        
        $html_parser = str_get_html($post_content);     
        
        foreach ($html_parser->nodes as $node){       
            if(isset($node->attr['id']) && $node->attr['id'] == $element_id){
                $outer_text = $node->outertext;     
                break;
            }
        }
    }
    
    $data = array(
        'outertext' => $outer_text
    );

    echo json_encode($data);
	die(); // this is required to terminate immediately and return a proper response
}

//-----------------------------------------------------------------------------------------------
// derived meta boxes

function fb_add_meta_box_derived_document() {
    global $post;
    if ($post) {        
        if ($post->post_type == 'derived'){
            add_meta_box('meta_box_source_list', 'Source Versions', 'fb_add_meta_box_derived_document_callback', null, 'side', 'core' );
        }
    }
}

function fb_add_meta_box_derived_document_callback() {
    global $post;
    $custom = get_post_custom($post->ID);
    $derived_meta = (!empty($custom["_fb-derived-meta"][0])) ? $custom["_fb-derived-meta"][0] : '';
    
    // use js object and json encode for $derived_meta
    
        
?>
<table id="fb-table-derived-meta" cellspacing="10">
    <input id="fb-input-derived-meta" style="display:none;" name="fb-derived-meta" value="<?php echo htmlentities($derived_meta); ?>" />  
    <tr>
        <td>Derive Unit</td>
        <td>Source Unit</td>
        <td>Dependent Version</td>
        <td>Current Version</td>
        <td>Merge Requests</td>
    </tr>
</table>
<?php    

}

//-----------------------------------------------------------------------------------------------
// derived post boxes

function fb_add_post_box_derived_document() {
    global $post;
    if ($post) {        
        if ($post->post_type == 'derived'){
            fb_post_box_derived_document_callback();
        }
    }
}

function fb_post_box_derived_document_callback() {
    global $post;
    $custom = get_post_custom($post->ID);
    $source_posts_ids = (!empty($custom["_fb-opened-source-post-ids"][0])) ? $custom["_fb-opened-source-post-ids"][0] : '';
    //$content = (!empty($custom["_fb-derived-mce"][0])) ? $custom["_fb-derived-mce"][0] : '';
    
?>
<div id="fb-source-selection-dialog" title="Source Documents">
    <ol id="fb-selectable-source-list">
<?php
        $args = array( 'post_type' => 'source' );
        $source_posts = get_posts( $args );
    
        foreach( $source_posts as $source ) {       
            $source_id = $source->ID;
            $source_title = $source->post_title;
            echo "<li class='ui-widget-content' source-post-id='" . $source_id . "'>" . $source_title . "</li>";
        }    
?> 
    </ol>
</div>

<div id="fb-add-derive-dialog" title="Add Derive Documents">
    Title: <input id="fb-derive-document-title" type="text"/> 
</div>

<div id="fb-data-derive-mces" style="display:none;">
<?php
    $index_array = [];
    foreach($custom as $k => $v) {
        if(strpos($k, "_fb-derived-mce-tab-index") === 0) {
            $index_array[$k] = $v;
        }
    }
    
    asort($index_array);
    foreach ($index_array as $k => $v) {
        $number = substr($k, -1);
        $mce_key = "_fb-derived-mce-" . $number;
        $title_key = "_fb-derived-mce-title-" . $number;
        
        $content = (!empty($custom[$mce_key][0])) ? $custom[$mce_key][0] : '';      
        $title = (!empty($custom[$title_key][0])) ? $custom[$title_key][0] : '';
        
        echo "<div data-title='" . $title . "'>" . $content . "</div>";
    }
    
    /*    
    foreach($custom as $k => $v) {
        if(strpos($k, "_fb-derived-mce-title") === 0) {
            $title = (!empty($v[0])) ? $v[0] : '';
            $number = substr($k, -1);
            $mce_key = "_fb-derived-mce-" . $number;
            $content = (!empty($custom[$mce_key][0])) ? $custom[$mce_key][0] : '';
            
            echo "<div data-title='" . $title . "'>" . $content . "</div>";
        }
    }
    */  
?> 
</div>

<table id="fb-table-derive-document-editors" class="fb-source-and-derived-editors">
  <colgroup>
    <col span="1" style="width: 49%;">
    <col span="1" style="width: 2%;">
    <col span="1" style="width: 49%;">
  </colgroup>

  <tr id="fb-tr-derive-document-editors">
    <td id="fb-td-source-mces" style="vertical-align:top">
        <div> 
            <input id="fb-button-open-source-document" type="button" value="Open Source Document" class="button-secondary" style="margin-right:10px"/>      
            <!--input id="fb-button-show-previous-source" type="button" value="Show Previous Source" class="button-secondary" style="margin-right:10px"/-->   
            <!--input id="fb-button-floating-source" type="button" value="Turn Off Floating" class="button-secondary" style="margin-right:10px"-->
            <span id="fb-buttonset-floating-source" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-floating-source-on" name="fb-buttonset-floating-source" checked="checked"><label for="fb-buttonset-floating-source-on">Floating On</label>
                <input type="radio" id="fb-buttonset-floating-source-off" name="fb-buttonset-floating-source"><label for="fb-buttonset-floating-source-off">Off</label>
            </span>
            <input id="fb-button-highlight-source" type="button" value="Turn On Source Highlight" class="button-secondary">
            <!--textarea id="fb-invisible-editor" style="display:none;"></textarea-->
            <div style="display:none;">
<?php 
                //$derived_editor_args = array("media_buttons" => false, "quicktags" => false, 'tinymce' => array('resize' => false, 'wp_autoresize_on' => true, 'height' => 800));
                $derived_editor_args = array("media_buttons" => false, 'tinymce' => array('resize' => false, 'wp_autoresize_on' => true, 'height' => 800)); // test
                wp_editor('', 'fb-invisible-editor', $derived_editor_args);      
?>  
            </div>
            <input id="fb-input-source-tabs" style="display:none;" name="fb-opened-source-post-ids" value="<?php echo $source_posts_ids; ?>" />   
        </div>
        <div id="fb-tabs-sources" class="fb-tabs-sources-display-none">
            <ul id="fb-ul-source-tabs">
            </ul>
        </div>
    </td>
    <td id="fb-td-mid-column">
        <svg id="fb-svg-mid-column" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg"/></svg>
    </td>
    <td id="fb-td-derive-mces" style="vertical-align:top">
        <!--h3 style="margin-bottom:8px">Derived Document</h3-->
        <div> 
            <input id="fb-button-add-derive-document" type="button" value="Add Derive Section" class="button-secondary" style="margin-right:10px"/>    
            <span id="fb-buttonset-toggle-merge" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-toggle-merge-on" name="fb-buttonset-toggle-merge" checked="checked"><label for="fb-buttonset-toggle-merge-on">Merge On</label>
                <input type="radio" id="fb-buttonset-toggle-merge-off" name="fb-buttonset-toggle-merge"><label for="fb-buttonset-toggle-merge-off">Off</label>
            </span>
            <span id="fb-buttonset-teacher-student" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-teacher-student-t" name="fb-buttonset-teacher-student" checked="checked"><label for="fb-buttonset-teacher-student-t">Teacher</label>
                <input type="radio" id="fb-buttonset-teacher-student-s" name="fb-buttonset-teacher-student"><label for="fb-buttonset-teacher-student-s">Student</label>
            </span>
        </div>
        <div id="fb-tabs-derives" style="margin-top:14px;" class="fb-tabs-sources-display-none">
            <ul id="fb-ul-derive-tabs">
            </ul>
<?php 
    /*
    //$derived_editor_args = array("media_buttons" => false, "quicktags" => false, 'tinymce' => array('resize' => false, 'wp_autoresize_on' => true, 'height' => 800));
    $derived_editor_args = array("media_buttons" => false, 'tinymce' => array('resize' => false, 'wp_autoresize_on' => true, 'height' => 800)); // test
    wp_editor($content, 'fb-derived-mce', $derived_editor_args);      
    */
?>   
        </div>
    </td>		
  </tr>
</table>

<?php    
}

function fb_save_document($postid, $post){
    global $_POST;
    global $wpdb;
    // set the ID to the parent post, not the revision
    //$postid = (wp_is_post_revision( $postid )) ? wp_is_post_revision( $post ) : $postid;

    $mce_substring = "_fb-derived-mce";
    
    if ($post->post_type == 'derived') {
        $wpdb->query( 
	        $wpdb->prepare( 
		        "
                DELETE FROM $wpdb->postmeta
		        WHERE post_id = %d
		        AND meta_key LIKE %s
		        ",
	            $postid, '%' . $mce_substring . '%' 
                )
        );
        
        foreach($_POST as $k => $v) {
            if(strpos($k, "fb-derived-mce") === 0) {
                update_post_meta($postid, "_" . $k, $v); // save the data
            }
        }
        
        //update_post_meta($postid, "_fb-derived-mce", $_POST["fb-derived-mce"]); // save the data
        if (isset( $_POST['fb-opened-source-post-ids'])) {
            update_post_meta($postid, "_fb-opened-source-post-ids", $_POST["fb-opened-source-post-ids"]);
        }
        
        if (isset( $_POST['fb-derived-meta'])) {
            update_post_meta($postid, "_fb-derived-meta", $_POST["fb-derived-meta"]);
        }
    }
}

function fb_filter_post_data($data , $postarr) {
    if ($data['post_type'] == 'source') {
        $post_content = $data['post_content'];
        if (!isset($post_content) || strlen($post_content) <= 0) return;
        
        $html_parser = str_get_html($post_content);            
        
        foreach ($html_parser->nodes as $node){       
            // consider the top level tags first
            if ($node->parent()->tag == 'root'){                    
                if(!isset($node->attr['id'])){
                    $uid = uniqid(rand(), true);                        
                    $node->{'id'} = $uid;                    
                }                   
            }
        }
        
        // Dumps the internal DOM tree back into string 
        $str = $html_parser->save();     
        $data['post_content'] = $str;
    }
    
    return $data;
}

//-----------------------------------------------------------------------------------------------
// revisions

function fb_add_revision_compare_page(){
    $id = get_current_screen()->id;

    if (($id == 'derived') || ($id == 'source')) {  
        //$path = ABSPATH;
        $path = dirname(__FILE__);
    
        $func_content = "include_once('$path/revisionsdiff.php');";
        $func = create_function('', $func_content );	
    
        // set $parent_slug=NULL or set to 'options.php' if you want to create a page that doesn't appear in any menu 
        //add_submenu_page('none', 'Revisions test', 'Revisions test','visualdiff/revisioncompare.php');
        add_submenu_page('none', 'Revisions test', 'Revisions test', 'read', 'fb-revisions', $func);
    }
}

function fb_admin_footer() {
    //$screen = get_current_screen();
    
    // Only load js on revision screen
    if (get_current_screen()->id == 'post') {
	    wp_enqueue_script('visualdiff', plugins_url( 'js/visualdiff.js' , __FILE__ ), array( 'jquery' ));
    }    
}

function fb_add_meta_box_revision() {
    global $post;
    if ($post) {
        add_meta_box('meta_box_post_revision', 'Revision', 'fb_meta_box_post_revision_callback', null, 'side', 'core' );
    }
}

function fb_meta_box_post_revision_callback() { 
}


//-----------------------------------------------------------------------------------------------
// add custom post types

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
        'taxonomies' => array('category', 'post_tag'),
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
            'revisions',
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
            'taxonomies' => array('category', 'post_tag'),
            'menu_icon' => 'dashicons-admin-page',
            'public' => true,
            'has_archive' => true,
            'show_ui' => true,
            'hierarchical' => false,
            'rewrite' => true,
            'supports' => array(
                'title',
                //'editor',
                //'excerpt',
                //'trackbacks',
                //'custom-fields',
                //'comments',
                'revisions',
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
function fb_mce_editor_style($url) {
    if ( !empty($url) )
        $url .= ',';
    
    $url .= trailingslashit( plugin_dir_url(__FILE__) ) . 'css/editor.css';
    
    return $url;
}

function fb_allow_all_tinymce_elements_attributes( $init ) {

    // Allow all elements and all attributes
    $ext = '*[*]';

    // Add to extended_valid_elements if it already exists
    if ( isset( $init['extended_valid_elements'] ) ) {
        $init['extended_valid_elements'] .= ',' . $ext;
    } else {
        $init['extended_valid_elements'] = $ext;
    }

    // return value
    return $init;
}

?>