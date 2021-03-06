<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
Version: 1.5.1
Author: Mingzheng Shi
*/  

require_once( 'simple_html_dom.php' );


//add_action( 'admin_menu', 'fb_add_revision_compare_page' );
add_action( 'admin_head', 'fb_admin_head' );
add_action( 'admin_footer', 'fb_derived_admin_footer' );
add_action( 'admin_footer', 'fb_admin_footer' );
add_action( 'init', 'fb_create_post_type' );

//add_action( 'add_meta_boxes', 'fb_add_meta_box_source_list' );
add_action( 'add_meta_boxes', 'fb_add_meta_box_derived_document' );
//add_action( 'add_meta_boxes', 'fb_add_meta_box_revision' );

add_action( 'edit_page_form', 'fb_add_post_box_derived_document' );
add_action( 'edit_form_advanced', 'fb_add_post_box_derived_document' );
add_action( 'admin_notices', 'fb_error_notice' );    
add_action( 'save_post', 'fb_save_document', 1, 2);
add_filter( 'wp_insert_post_data' , 'fb_filter_post_data' , '99', 2 );

// ajax action
add_action( 'wp_ajax_fb_source_query_level_1', 'fb_source_query_level_1' );
add_action( 'wp_ajax_fb_source_query_level_2', 'fb_source_query_level_2' );
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
add_filter( 'tiny_mce_before_init', 'fb_mce_settings' );

// add js
add_action('admin_print_scripts', 'fb_admin_print_scripts');

// include wordpress dashicons
add_action( 'admin_enqueue_scripts', 'fb_custom_tinymce_dashicons' );

// global variable
$FB_LEVEL_1_POST = 'source';
$FB_LEVEL_2_POST = 'master';
$FB_LEVEL_3_POST = 'derived';

//add_action( 'publish_source', 'fb_publish_post', 10, 2);
add_action( 'publish_' . $FB_LEVEL_1_POST, 'fb_publish_post', 10, 2);
add_action( 'publish_' . $FB_LEVEL_2_POST, 'fb_publish_post', 10, 2);
add_action( 'publish_' . $FB_LEVEL_3_POST, 'fb_publish_post', 10, 2);

$FB_LEVEL_1_LABEL = 'Source';
$FB_LEVEL_2_LABEL = 'Master';
$FB_LEVEL_3_LABEL = 'Derived';

add_action('admin_print_styles', 'fb_remove_buttons');

function fb_remove_buttons() {
?>
<style>
  #minor-publishing-actions { display:none; }
</style>
<?php 
}

//-----------------------------------------------------------------------------------------------
// Called on the admin_enqueue_scripts action, enqueues CSS to 
// make all WordPress Dashicons available to TinyMCE. This is
// where most of the magic happens.
//
function fb_custom_tinymce_dashicons() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    
    $id = get_current_screen()->id;

    if (($id == $FB_LEVEL_3_POST) || ($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_1_POST)) {      
	    wp_enqueue_style( 'custom_tinymce_dashicons', plugins_url( 'css/custom-tinymce-dashicons.css', __FILE__ ) );
    }
}

//-----------------------------------------------------------------------------------------------
// load external TinyMCE plugins
//
function fb_tinymce_plugin( $tinymce_vb ) {
	$tinymce_vb[ 'fb_folding_editor' ] = plugins_url( 'js/tinymce.js', __FILE__ );
	return $tinymce_vb;
}

//-----------------------------------------------------------------------------------------------
// tinymce custom buttons
//
function fb_mce_editor_buttons_second_row( $buttons ) {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
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
    $id = get_current_screen()->id;
    // add custom buttons    
    if (($id == $FB_LEVEL_3_POST) || ($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_1_POST)) {
        array_push( $buttons, 'fb_custom_button_comment_bubble' );
        array_push( $buttons, 'fb_custom_button_comment_delete' );
    }
    
    return $buttons;
}

//-----------------------------------------------------------------------------------------------
// add the third row of tinymce toolbar
// custom buttons will be put in this row
//
function fb_mce_editor_buttons_third_row( $buttons ) {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    //$type = get_current_screen()->post_type;
    $id = get_current_screen()->id;
    // add custom buttons    
    if (($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_3_POST)) {
        array_push( $buttons, 'fb_custom_button_table_of_content' );
        array_push( $buttons, 'fb_custom_button_page_boundary' );
    }
    
    return $buttons;
}

function fb_mce_settings( $init ) {
	//unset( $init['wp_autoresize_on'] );
    unset($init['preview_styles']); // allow tinymce format dropdown to show style previews
	return $init;
}

//-----------------------------------------------------------------------------------------------
// add styles into the 'Format' drop down list in the toolbar
// the styles in this method is defined in editor.css file
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
            'title' => 'body text',
            'block' => 'p',
            'classes' => 'bodytext'
        ),
        array(
            'title' => 'body text HI',
            'block' => 'p',
            'classes' => 'bodytextHI'
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
        ),
        array(
            'title' => 'TN Answers - Show',
            'inline' => 'span',
            'classes' => 'TNAnswers-Show'
        ),
        array(
            'title' => 'TN Answers - Hide',
            'inline' => 'span',
            'classes' => 'TNAnswers-Hide'
        )
    );

    $settings['style_formats'] = json_encode( $style_formats );

    return $settings;

}

//-----------------------------------------------------------------------------------------------
// change the style of wp editor - see http://codex.wordpress.org/TinyMCE_Custom_Styles
// apply styles in editor.css to the visual editor
//
function fb_mce_editor_style($url) {
    if ( !empty($url) )
        $url .= ',';
    
    global $editor_styles;

    $url .= trailingslashit( plugin_dir_url(__FILE__) ) . 'css/editor.css';
    //$url .= ',';
    //$url .= trailingslashit( plugin_dir_url(__FILE__) ) . 'css/editor-v2.css'; 
    return $url;
}

//-----------------------------------------------------------------------------------------------
// during the init of the admin page, add js and css files to the admin page
//
function fb_admin_head() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    
    $id = get_current_screen()->id;
    //$type = get_current_screen()->post_type;
    //$single = is_single();
    
    // Remove "Add New" button in the post edit page
    if (($id == $FB_LEVEL_3_POST) || ($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_1_POST)) {
        echo '<style type="text/css">
            .add-new-h2 { display:none; }
        </style>';            
    }
        
    if (($id == $FB_LEVEL_3_POST) || ($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_1_POST)) {
        $fb_js_url = plugins_url( 'js/fb.js' , __FILE__ );
        echo '<script type="text/javascript" src="' . $fb_js_url . '" ></script>';
    }
    
    if ($id == $FB_LEVEL_1_POST) {
        $source_js_url = plugins_url( 'js/source.js' , __FILE__ );
        echo '<script type="text/javascript" src="' . $source_js_url . '" ></script>';
    }
    
    if (($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_3_POST)) {
        $htmldiff_js_url = plugins_url( 'js/htmldiff.js' , __FILE__ );
        $underscore_js_url = plugins_url( 'js/underscore.js' , __FILE__ );
        $derived_js_url = plugins_url( 'js/derived.js' , __FILE__ );
        
        $derived_css_url = plugins_url( 'css/derived.css' , __FILE__ );
        $jquery_css_url = plugins_url( 'css/jquery-ui-themes-1.11.2/themes/smoothness/jquery-ui.css' , __FILE__ );
    
        echo '<script type="text/javascript" src="' . $htmldiff_js_url . '" ></script>'; // need to come first; to be used in other js files;
        echo '<script type="text/javascript" src="' . $underscore_js_url . '" ></script>'; // need to come first; to be used in other js files;
        echo '<script type="text/javascript" src="' . $derived_js_url . '" ></script>';
        
        echo '<link rel="stylesheet" type="text/css" href="' . $derived_css_url . '" />';
        echo '<link rel="stylesheet" type="text/css" href="' . $jquery_css_url . '" />';
    }   
}

function fb_derived_admin_footer() {

}

//-----------------------------------------------------------------------------------------------
// add jquery ui libraries
//
function fb_admin_print_scripts() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    
    $id = get_current_screen()->id;

    if (($id == $FB_LEVEL_3_POST) || ($id == $FB_LEVEL_2_POST) || ($id == $FB_LEVEL_1_POST)) {       
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
//-----------------------------------------------------------------------------------------------

function fb_source_query_level_1() {   
    // query the post content
    $post_content = ""; 
    $post_id = $_POST['id'];
    $post = get_post( $post_id );
    
    $data = array(
        'content' => $post->post_content,
        'title' => $post->post_title,
        'modified' => $post->post_modified
    );

    echo json_encode($data);
	die(); // this is required to terminate immediately and return a proper response
}

function fb_source_query_level_2() {   
    // query the post content
    $post_content = "";   
    $post_id = $_POST['id'];
    $post = get_post( $post_id );

    $custom = get_post_custom($post_id);
    // assume level 2 document has only one tab
    $content = '';
    $title = '';
    foreach($custom as $k => $v) {
        if(strpos($k, "_fb-derived-mce") === 0) {
            $mce_key = $k;
            $number = substr($k, -1); // ms - need to fix
            $title_key = "_fb-derived-mce-title-" . $number;
            
            $content = (!empty($custom[$mce_key][0])) ? $custom[$mce_key][0] : '';      
            $title = (!empty($custom[$title_key][0])) ? $custom[$title_key][0] : '';
            break;
        }
    }
    
    $data = array(
        'content' => $content,
        //'title' => $post->post_title,
        'title' => $title,
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
// add a meta box in derive document
// 
function fb_add_meta_box_derived_document() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $FB_LEVEL_1_LABEL;
    global $FB_LEVEL_2_LABEL;
    global $FB_LEVEL_3_LABEL;
    global $post;
    $meta_box_title = null;
    if ($post->post_type == $FB_LEVEL_2_POST) {
        $meta_box_title = $FB_LEVEL_1_LABEL . ' Versions';
    }
    else if ($post->post_type == $FB_LEVEL_3_POST) {
        $meta_box_title = $FB_LEVEL_2_LABEL . ' Versions';
    }
    if ($post) {        
        if (($post->post_type == $FB_LEVEL_3_POST) || ($post->post_type == $FB_LEVEL_2_POST)){
            add_meta_box('meta_box_source_list', $meta_box_title, 'fb_add_meta_box_derived_document_callback', null, 'side', 'core' );
        }
    }
}

//-----------------------------------------------------------------------------------------------
// callback function when the meta box is added into derive document
//
function fb_add_meta_box_derived_document_callback() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $FB_LEVEL_1_LABEL;
    global $FB_LEVEL_2_LABEL;
    global $FB_LEVEL_3_LABEL;
    global $post;
    $custom = get_post_custom($post->ID);
    $derived_meta = (!empty($custom["_fb-derived-meta"][0])) ? $custom["_fb-derived-meta"][0] : '';
    
    // use js object and json encode for $derived_meta
    
        
?>
<table id="fb-table-derived-meta" cellspacing="10">
    <input id="fb-input-derived-meta" style="display:none;" name="fb-derived-meta" value="<?php echo htmlentities($derived_meta); ?>" />  
<?php if ($post->post_type == $FB_LEVEL_2_POST) { ?>
    <tr>
        <td><?php echo $FB_LEVEL_2_LABEL; ?> Unit</td>
        <td><?php echo $FB_LEVEL_1_LABEL; ?> Unit</td>
        <td>Dependent Version</td>
        <td>Current Version</td>
        <td>Changes</td>
    </tr>
<?php } ?>  
<?php if ($post->post_type == $FB_LEVEL_3_POST) { ?>
    <tr>
        <td><?php echo $FB_LEVEL_3_LABEL; ?> Unit</td>
        <td><?php echo $FB_LEVEL_2_LABEL; ?> Unit</td>
        <td>Dependent Version</td>
        <td>Current Version</td>
        <td>Changes</td>
    </tr>
<?php } ?> 



</table>
<?php    

}

//-----------------------------------------------------------------------------------------------
// add a post box to derive document
//
function fb_add_post_box_derived_document() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $post;
    if ($post) {        
        if (($post->post_type == $FB_LEVEL_3_POST) || ($post->post_type == $FB_LEVEL_2_POST)){
            fb_post_box_derived_document_callback($post->post_type);
        }
    }
}

//-----------------------------------------------------------------------------------------------
// callback function when the post box is added into derive document
//
function fb_post_box_derived_document_callback($post_type) {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $FB_LEVEL_1_LABEL;
    global $FB_LEVEL_2_LABEL;
    global $FB_LEVEL_3_LABEL;
    global $post;
    $p_label = null;
    $c_label = null;
    
    // tooltip variables
    $open_source_title = "";
    $select_style_sheet_title = "Switch among style sheets for all opened editors";
    $add_derive_title = "";
    $master_toc_title = "";
    $rename_tab_title = "Rename the selected tab";
    $toggle_merge_mode_title = "";
    $toggle_source_column_title = "";
    $toggle_student_teacher_title = "";
    
    if ($post_type == $FB_LEVEL_2_POST) {
        $p_label = $FB_LEVEL_1_LABEL;
        $c_label = $FB_LEVEL_2_LABEL;
        $open_source_title = "You can open only one source document";
        $add_derive_title = "You can add only one master tab";
        $master_toc_title = "Create or update the book's table of content for the master document";
        $toggle_merge_mode_title = "Show or hide all the changes in the master unit that have descended from source unit";
        $toggle_source_column_title = "Show or hide the source tab/editor";
        $toggle_student_teacher_title = "Switch between student and teacher versions in the master document";
    }
    else if ($post_type == $FB_LEVEL_3_POST) {
        $p_label = $FB_LEVEL_2_LABEL;
        $c_label = $FB_LEVEL_3_LABEL;
        $open_source_title = "You can open one or more master documents";
        $add_derive_title = "You can add one or more derive tabs";
        $master_toc_title = "Create or update the book's table of content for the derive document";
        $toggle_merge_mode_title = "Show or hide all the changes in the derive unit that have descended from master unit";
        $toggle_source_column_title = "Show or hide the master tab(s)/editor(s)";
        $toggle_student_teacher_title = "Switch between student and teacher versions in the derive document";
    }
    
    $custom = get_post_custom($post->ID);
    $source_posts_ids = (!empty($custom["_fb-opened-source-post-ids"][0])) ? $custom["_fb-opened-source-post-ids"][0] : '';
    //$content = (!empty($custom["_fb-derived-mce"][0])) ? $custom["_fb-derived-mce"][0] : '';
    
?>
<div id="fb-source-selection-dialog" title="<?php echo $p_label; ?> Documents">
    <div style="position:absolute;right:20px;">
        <input id="fb-input-search-source-list" type="text"/>
        <input id="fb-button-search-source-list" type="button" value="Search"/> 
    </div>
    <ol id="fb-selectable-source-list" style="margin-top:40px; margin-bottom:15px">
<?php
    $args = null;
    if ($post_type == $FB_LEVEL_2_POST) {
        $args = array( 'posts_per_page' => -1, 'post_type' => $FB_LEVEL_1_POST );
    }
    else if ($post_type == $FB_LEVEL_3_POST) {
        $args = array( 'posts_per_page' => -1, 'post_type' => $FB_LEVEL_2_POST );
    }
    $source_posts = get_posts( $args );
        
    foreach( $source_posts as $source ) {       
        $source_id = $source->ID;
        $source_title = $source->post_title;
        echo "<li class='ui-widget-content fb-li-source-list' source-post-id='" . $source_id . "'>" . $source_title . "</li>";
    }
     
?>
    </ol>
    <input type="checkbox" id="fb-checkbox-add-all-selected-sources" style="margin-left:5px"/>Add all selected <?php echo strtolower($p_label); ?> to <?php echo strtolower($c_label); ?>
</div>

<div id="fb-add-derive-dialog" title="Add <?php echo $c_label; ?> Document">
    Title: <input id="fb-derive-document-title" type="text"/> 
</div>

<div id="fb-rename-derive-tab-dialog" title="Rename <?php echo $c_label; ?> Document">
    Title: <input id="fb-input-rename-derive-tab" type="text" style="width:88%;"/> 
</div>

<div id="fb-data-post-type" style="display:none;"><?php echo $post_type; ?></div>
<div id="fb-data-derive-mces" style="display:none;">
<?php
    $index_array = array();
    foreach($custom as $k => $v) {
        if(strpos($k, "_fb-derived-mce-tab-index") === 0) {
            $index_array[$k] = $v;
        }
    }
    
    asort($index_array);
    foreach ($index_array as $k => $v) {
        $number = substr($k, -1); // ms - need to fix
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
            <input id="fb-button-open-source-document" type="button" value="Open <?php echo $p_label; ?>" class="button-secondary" title="<?php echo $open_source_title; ?>" style="margin-right:10px"/>  
            <select id="fb-select-style-sheet" title="<?php echo $select_style_sheet_title; ?>" data-css-href-1="<?php echo plugins_url( 'css/editor.css' , __FILE__ ); ?>" data-css-href-2="<?php echo plugins_url( 'css/editor-v2.css' , __FILE__ ); ?>">
                <option selected="selected">Style 1</option>
                <option>Style 2</option>
            </select>   
            <!--input id="fb-button-floating-source" type="button" value="Turn Off Floating" class="button-secondary" style="margin-right:10px"-->
            <!--span id="fb-buttonset-floating-source" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-floating-source-on" name="fb-buttonset-floating-source" checked="checked"><label for="fb-buttonset-floating-source-on">Floating On</label>
                <input type="radio" id="fb-buttonset-floating-source-off" name="fb-buttonset-floating-source"><label for="fb-buttonset-floating-source-off">Off</label>
            </span-->
            <!--input id="fb-button-highlight-source" type="button" value="Turn On <?php echo $p_label; ?> Highlight" class="button-secondary"-->
            <!--textarea id="fb-invisible-editor" style="display:none;"></textarea-->
            <div style="display:none;">
<?php 
                //$derived_editor_args = array("media_buttons" => false, "quicktags" => false, 'tinymce' => array('resize' => false, 'wp_autoresize_on' => true, 'height' => 800));
                $derived_editor_args = array("media_buttons" => false, 'tinymce' => array('resize' => true, 'wp_autoresize_on' => false, 'height' => 800)); // test
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
    <td id="fb-td-mid-column" style="overflow-y:hidden;">
        <svg id="fb-svg-mid-column" style="position:relative;top:100px;height:100%;width:100%;" xmlns="http://www.w3.org/2000/svg"/></svg>
    </td>
    <td id="fb-td-derive-mces" style="vertical-align:top">
        <!--h3 style="margin-bottom:8px">Derived Document</h3-->
        <div> 
            <input id="fb-button-add-derive-document" type="button" value="Add <?php echo $c_label; ?> Section" title="<?php echo $add_derive_title; ?>" class="button-secondary" style="margin-right:10px"/>  
<?php if ($post_type == $FB_LEVEL_3_POST) { ?>
            <input id="fb-button-table-of-content" type="button" value="Table of Content" title="<?php echo $master_toc_title; ?>" class="button-secondary" style="margin-right:10px"/>   
<?php } ?>           
            <input id="fb-button-rename-derive-tab" type="button" value="Rename" title="<?php echo $rename_tab_title; ?>" class="button-secondary" style="margin-right:10px"/>  
<?php if ($post_type == $FB_LEVEL_2_POST) { ?>
            <input id="fb-button-approve-all" type="button" value="Approve All" class="button-secondary" style="margin-right:10px"/>   
<?php } ?> 
            <span id="fb-buttonset-toggle-merge" title="<?php echo $toggle_merge_mode_title; ?>" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-toggle-merge-on" name="fb-buttonset-toggle-merge" checked="checked"><label for="fb-buttonset-toggle-merge-on">Update On</label>
                <input type="radio" id="fb-buttonset-toggle-merge-off" name="fb-buttonset-toggle-merge"><label for="fb-buttonset-toggle-merge-off">Off</label>
            </span>
            <!--input type="checkbox" id="fb-checkbox-toggle-merge" style="margin-right:10px"><label for="fb-checkbox-toggle-merge">Approve Updates</label-->
            <span id="fb-buttonset-toggle-sources" title="<?php echo $toggle_source_column_title; ?>" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-toggle-sources-on" name="fb-buttonset-toggle-sources" checked="checked"><label for="fb-buttonset-toggle-sources-on"><?php echo $p_label; ?> On</label>
                <input type="radio" id="fb-buttonset-toggle-sources-off" name="fb-buttonset-toggle-sources"><label for="fb-buttonset-toggle-sources-off">Off</label>
            </span>
<?php if ($post_type == $FB_LEVEL_3_POST) { ?>
            <span id="fb-buttonset-teacher-student" title="<?php echo $toggle_student_teacher_title; ?>" style="margin-right:10px">
                <input type="radio" id="fb-buttonset-teacher-student-t" name="fb-buttonset-teacher-student" checked="checked"><label for="fb-buttonset-teacher-student-t">Teacher</label>
                <input type="radio" id="fb-buttonset-teacher-student-s" name="fb-buttonset-teacher-student"><label for="fb-buttonset-teacher-student-s">Student</label>
            </span>
<?php } ?> 
        </div>
        <div id="fb-tabs-derives" style="margin-top:14px;" class="fb-tabs-sources-display-none">
            <ul id="fb-ul-derive-tabs">
            </ul>


 
        </div>
    </td>		
  </tr>
</table>

<?php    
}

function fb_error_notice() {
    if(isset($_GET['fb-error']) &&  1 == isset($_GET['fb-error'])){
    ?>
        <div class="error">
            <p>The title is a duplicate. Please modify the title.</p>
        </div>
    <?php
    }
}

//-----------------------------------------------------------------------------------------------
// check if a title of a document is used by other documents
//
function checkDuplicateTitle($postid, $post) {
    global $_POST;
    global $wpdb;

    // firstly, check duplicate post title
    $post_title = $_POST['post_title'];
    $post_type = $_POST['post_type'];
    $q = "SELECT ID FROM $wpdb->posts 
          WHERE post_status = 'publish' 
              AND post_type = '{$post_type}' 
			  AND post_title = '{$post_title}'
              AND ID != {$postid}
         ";
    
	$ids = $wpdb->get_results( $q ) ;
    
    if ($ids && count($ids) > 0) {
        // the post type can be 'revision'; in that case, check if its parent id, i.e. $_POST[ID], is equal to the query result above. If yes, then return.
        if (count($ids) == 1 && $ids[0]->ID == $_POST[ID]) {
            return;
        }           
        //$p_id = $wpdb->get_results( "SELECT * FROM $wpdb->posts WHERE ID == {$postid}" ) ;      
        
        $wpdb->update( $wpdb->posts, array( 'post_status' => 'draft' ), array( 'ID' => $postid ) );      
        $args = array( 'fb-error' => '1' );      
		$loc = add_query_arg( $args , get_edit_post_link( $post->id , 'url' ) );
		wp_redirect( $loc ) ; 
        exit;
    }
}

//-----------------------------------------------------------------------------------------------
// Called when the publish button is clicked
//
function fb_publish_post($postid, $post) {
    checkDuplicateTitle($postid, $post);
}

//-----------------------------------------------------------------------------------------------
// Called when the document is been saved
//
function fb_save_document($postid, $post) {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $_POST;
    global $wpdb;
    // set the ID to the parent post, not the revision
    //$postid = (wp_is_post_revision( $postid )) ? wp_is_post_revision( $post ) : $postid;

    // firstly, check duplicate post title
    checkDuplicateTitle($postid, $post);
       
    // update post meta
    $mce_substring = "_fb-derived-mce";
    
    if (($post->post_type == $FB_LEVEL_3_POST) || ($post->post_type == $FB_LEVEL_2_POST)) {
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
    
    // save each derived unit as a special post
    if ($post->post_type == $FB_LEVEL_3_POST) {
        $wpdb->query( 
		    "
            DELETE FROM $wpdb->posts
		    WHERE post_excerpt = '$postid'
		    "
        );
        
        $index_array = array();
        foreach($_POST as $k => $v) {
            if(strpos($k, "fb-derived-mce-tab-index") === 0) {
                $index_array[$k] = $v;
            }
        }
        
        asort($index_array);
        foreach ($index_array as $k => $v) {
            $number = substr($k, -1); // ms - need to fix
            $mce_key = "fb-derived-mce-" . $number;
            $title_key = "fb-derived-mce-title-" . $number;
            
            $content = (!empty($_POST[$mce_key])) ? $_POST[$mce_key] : '';      
            $title = (!empty($_POST[$title_key])) ? $_POST[$title_key] : '';
            
            $html_parser = str_get_html($content);            
            
            foreach($html_parser->find('div') as $element) {
                if (strpos($element->attr['class'], 'fb_tinymce_left_column_icon') != false) {
                    $element->outertext = '';
                }
            }
            $content = $html_parser->save();  
            
            $inserted_post_id = wp_insert_post(
                array(
                  'post_title'      => $title,
                  'post_status'     => 'publish',
                  'post_type'       => 'post',
                  'post_excerpt'    => $postid,
                  'post_content'    => $content
                )      
            );
        }      
    }
    
    // update index page for derived document
    if ($post->post_type == $FB_LEVEL_3_POST) {  
        $page_content = "<ul class='fb-childtheme-ul'>";
        
        $index_array = array();
        foreach($_POST as $k => $v) {
            if(strpos($k, "fb-derived-mce-tab-index") === 0) {
                $index_array[$k] = $v;
            }
        }
        
        asort($index_array);
        foreach ($index_array as $k => $v) {
            $number = substr($k, -1); // ms - need to fix
            //$mce_key = "fb-derived-mce-" . $number;
            $title_key = "fb-derived-mce-title-" . $number;
            
            //$content = (!empty($_POST[$mce_key])) ? $_POST[$mce_key] : '';      
            $title = (!empty($_POST[$title_key])) ? $_POST[$title_key] : '';
            $p_id = $post->ID;
            $documents = $wpdb->get_results(
            "
                SELECT * FROM $wpdb->posts 
                WHERE post_type = 'post' 
                    AND post_excerpt = '$postid'
                    AND post_title = '$title' 
            ");
            
            if (count($documents) === 1) {
                $p = $documents[0];
                $page_content .= "<li>";  
                $permalink = get_permalink($p->ID);
                $page_content .= "<a href='" . $permalink . "'>";
                $page_content .= $title;
                $page_content .= "</a>";
                $page_content .= "</li>";    
            }
        }
        
        $page_content .= "</ul>";
        
        $q_result = $wpdb->query( $wpdb->prepare( "UPDATE $wpdb->posts SET post_content = %s WHERE ID = %d", $page_content, $postid ) );
        /*
        $q_result = $wpdb->get_results(
            "
            UPDATE $wpdb->posts 
            SET post_content = '$page_content'
            WHERE ID = '$postid'
        ");
        */ 
    }
    
    // update Source page, Master page, and Derive page
    $p_post_type = null;
    $p_page_title = null;
    if ($post->post_type == $FB_LEVEL_1_POST) {
        $p_post_type = 'source';
        $p_page_title = 'Source' ;
    }
    else if ($post->post_type == $FB_LEVEL_2_POST) {
        $p_post_type = 'master';
        $p_page_title = 'Master' ;
    }    
    else if ($post->post_type == $FB_LEVEL_3_POST) {
        $p_post_type = 'derived';
        $p_page_title = 'Derive' ;
    }   
    
    if (($p_post_type !== null) && ($p_page_title != null)) {
        $page_content = "<ul class='fb-childtheme-ul'>";
     
        $documents = $wpdb->get_results(
        "
            SELECT * FROM $wpdb->posts 
            WHERE post_type = '$p_post_type' 
                AND post_status = 'publish' 
        ");
        
        for ($i = 0; $i < count($documents); $i++) {
            $p = $documents[$i];            
            $page_content .= "<li>";  
            $permalink = get_permalink($p->ID);
            $page_content .= "<a href='" . $permalink . "'>";
            $page_content .= get_the_title($p->ID);
            $page_content .= "</a>";
            $page_content .= "</li>";    
        }
              
        $page_content .= "</ul>";
        
        /*
        global $wpdb;
        $source_page = $wpdb->query(
            "
            UPDATE $wpdb->posts 
            SET post_content = '$page_content'
            WHERE post_type = 'page' 
                AND post_title = 'Source' 
        ");
        */
        
       
        $source_page = $wpdb->get_results(
            "
            SELECT * FROM $wpdb->posts 
            WHERE post_type = 'page' 
                AND post_title = '$p_page_title' 
        ");
        
        if (count($source_page) == 1) {
            $source_page_id = $source_page[0]->ID;
            //wp_update_post( array( 'ID' => $source_page_id, 'post_content' => $page_content ) );
            $q_result = $wpdb->query( $wpdb->prepare( "UPDATE $wpdb->posts SET post_content = %s WHERE ID = %d", $page_content, $source_page_id ) );
        }            
    }
}

function fb_filter_post_data($data , $postarr) {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $_POST;
    global $post;
    global $wpdb;
    
    if ($data['post_type'] == $FB_LEVEL_1_POST) {
        $post_content = $data['post_content'];
        if (!isset($post_content) || strlen($post_content) <= 0) return $data;
        
        $html_parser = str_get_html($post_content);            
        
        foreach($html_parser->find('div') as $element) {
            if (strpos($element->attr['class'], 'fb_tinymce_left_column_icon') != false) {
                $element->outertext = '';
            }
        }
        
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
    else if ($data['post_type'] == $FB_LEVEL_2_POST) {   
        // assume level 2 document has only one tab
        foreach($_POST as $k => $v) {
            if(strpos($k, "fb-derived-mce") === 0) {
                $post_content = $v;
                $html_parser = str_get_html($post_content);            
                
                foreach($html_parser->find('div') as $element) {
                    if (strpos($element->attr['class'], 'fb_tinymce_left_column_icon') != false) {
                        $element->outertext = '';
                    }
                }
                $str = $html_parser->save();  
                $data['post_content'] = $str;
                break;
            }
        }
    }
    /*
    // update index page for derived document
    if ($data['post_type'] == $FB_LEVEL_3_POST) {  
        $page_content = "<ul class='fb-childtheme-ul'>";
        
        $index_array = array();
        foreach($_POST as $k => $v) {
            if(strpos($k, "fb-derived-mce-tab-index") === 0) {
                $index_array[$k] = $v;
            }
        }
        
        asort($index_array);
        foreach ($index_array as $k => $v) {
            $number = substr($k, -1); // ms - need to fix
            //$mce_key = "fb-derived-mce-" . $number;
            $title_key = "fb-derived-mce-title-" . $number;
            
            //$content = (!empty($_POST[$mce_key])) ? $_POST[$mce_key] : '';      
            $title = (!empty($_POST[$title_key])) ? $_POST[$title_key] : '';
            $p_id = $post->ID;
            $documents = $wpdb->get_results(
            "
                SELECT * FROM $wpdb->posts 
                WHERE post_type = '$p_id' 
                    AND post_title = '$title' 
            ");
            
            if (count($documents) === 1) {
                $p = $documents[0];
                $page_content .= "<li>";  
                $permalink = get_permalink($p->ID);
                $page_content .= "<a href='" . $permalink . "'>";
                $page_content .= $title;
                $page_content .= "</a>";
                $page_content .= "</li>";    
            }
        }
        
        $page_content .= "</ul>";
        
        $data['post_content'] = $page_content;
    }
    */
    return $data;
}

//-----------------------------------------------------------------------------------------------
// revisions

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
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    
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
    
    register_post_type($FB_LEVEL_1_POST, $args);
    
    $args2 = array(
        'labels' => array(
            'name' => 'Masters',
            'singular_name' => 'Master',
            'add_new' => 'Add New',
            'add_new_item' => 'Add New Master Document',
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
    
    register_post_type($FB_LEVEL_2_POST, $args2);
    
    $args3 = array(
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
    
    register_post_type($FB_LEVEL_3_POST, $args3);
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