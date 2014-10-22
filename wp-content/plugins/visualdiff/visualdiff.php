<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Differences
*/  
 
require_once( 'simple_html_dom.php' );

add_action( 'admin_menu', 'fb_add_revision_compare_page' );
add_action( 'admin_head', 'fb_derived_admin_head' );
add_action( 'admin_footer', 'fb_admin_footer' );
add_action( 'init', 'fb_create_post_type' );

add_action( 'add_meta_boxes', 'fb_add_meta_box_source_list' );
add_action( 'add_meta_boxes', 'fb_add_meta_box_derived_document' );
add_action( 'add_meta_boxes', 'fb_add_meta_box_revision' );

add_filter('mce_css', 'fb_mce_editor_style');

// ajax action
add_action( 'wp_ajax_fb_source_query', 'fb_source_query' );

// add js
add_action('admin_print_scripts', 'fb_admin_print_scripts');

// for derived post type only
function fb_derived_admin_head() {
    $type = get_current_screen()->post_type;
    if ($type == 'derived') {
        $derived_js_url = plugins_url( 'js/derived.js' , __FILE__ );
        $jstree_js_url = plugins_url( 'lib/jstree/jstree.min.js' , __FILE__ );
        
        $derived_css_url = plugins_url( 'css/derived.css' , __FILE__ );
        $jstree_css_url = plugins_url( 'lib/jstree/themes/default/style.min.css' , __FILE__ );

?>
        <script type="text/javascript">
		<?php
        echo 'var source_query_url = "' . plugins_url( 'source_query.php', __FILE__ ) . '";';
		?>
        </script>
<?php

        echo '<script type="text/javascript" src="' . $derived_js_url . '" ></script>';
        echo '<script type="text/javascript" src="' . $jstree_js_url . '" ></script>';
        
        echo '<link rel="stylesheet" type="text/css" href="' . $derived_css_url . '" />';
        echo '<link rel="stylesheet" type="text/css" href="' . $jstree_css_url . '" />';
    }    
}

function fb_admin_print_scripts() {
    wp_enqueue_script('jquery');
    wp_enqueue_script('jquery-ui-core');
}

//-----------------------------------------------------------------------------------------------
// ajax action

function fb_source_query() {
    /*
    $query_return = array(
        'htmltext' => ""
    );
    */
    $htmltext = "";
    
    $id = $_POST['id'];
    $ids = explode(';', $id);

    // the following code needs to be changed later
    if (count($ids) == 2) {
        $post_id = $ids[0];
        $tag_id = $ids[1];
        
        $post = get_post( $post_id );
        $post_content = $post->post_content;
        $html_parser = str_get_html($post_content);  
        
        $element = $html_parser->find('#' . $tag_id);
        foreach ($html_parser->nodes as $node) {
            if ($node->id == $tag_id){
                /*
                $query_return = array(
                    'htmltext' => $node->outertext
                );
                */
                $htmltext = $node->outertext;
                break;
            }
        }
    }

    echo $htmltext;
	die(); // this is required to terminate immediately and return a proper response
}

//-----------------------------------------------------------------------------------------------
// source and derive meta boxes

function fb_add_meta_box_source_list() {
    global $post;
    if ($post) {        
        if ($post->post_type == 'derived'){
        add_meta_box('meta_box_source_list', 'Source Documents', 'fb_meta_box_source_list_callback', null, 'side', 'core' );
        }
    }
}

function fb_meta_box_source_list_callback() {
    global $post;
    $args = array( 'post_type' => 'source' );
    $source_posts = get_posts( $args );
    
    $tree_root = array();
    $tree_root['title'] = 'root';
    $tree_root['children'] = array();
    
    foreach( $source_posts as $post ) {       
        setup_postdata($post); 
        $post_content = $post->post_content;
        $html_parser = str_get_html($post_content);  
        
        //$tree_post = array();
        //$tree_post['id'] = 'tree-' . $post->ID;
        //$tree_post['title'] = the_title();
        //$tree_post['children'] = array();     
        //array_push($tree_root['children'], $tree_post);
        
        $tree_nodes = array();
        
        // root node
        $count = 0;
        $tree_nodes[$count] = array();
        $tree_nodes[$count]['id'] = 'tree-' . $post->ID;
        $tree_nodes[$count]['post_id_and_tag_id'] = $post->ID;
        $tree_nodes[$count]['title'] = $post->post_title;
        //$tree_nodes[$count]['children'] = array();  
        
        $tree_nodes[$count]['parentID'] = 0;
        
        $current_parents = array($tree_nodes[$count]['id'], null, null, null); // corresponding to four levels of the tree
        
        
        foreach ($html_parser->nodes as $node) {
            // consider the top level tags first
            if ($node->parent()->tag == 'root'){
                // check white space
                if ($node->tag == 'text'){
                    $inner_text = $node->innertext.trim();
                    if (ctype_space($inner_text)){
                        continue;
                    }
                } 
                
                $count++;
                $tree_nodes[$count] = array();
                $tree_nodes[$count]['id'] = 'tree-' . $node->attr['id'];
                $tree_nodes[$count]['post_id_and_tag_id'] = $post->ID. ";" .$node->attr['id'];
                
                if (($node->tag == 'h1') ||
                    ($node->tag == 'h2') ||
                    ($node->tag == 'h3') ||
                    ($node->tag == 'p')) {
                    if (strlen($node->innertext) > 80) {
                        $tree_nodes[$count]['title'] = substr($node->innertext, 0, 80) . "...";                   
                    }
                    else {
                        $tree_nodes[$count]['title'] = $node->innertext;
                    }
                }
                else if (($node->tag == 'ol') ||
                    ($node->tag == 'ul')){
                    $tree_nodes[$count]['title'] = 'list...';
                }
                else if ($node->tag == 'div'){
                    $tree_nodes[$count]['title'] = 'section...';
                }
                else if ($node->tag == 'table'){
                    $tree_nodes[$count]['title'] = 'table...';
                }
                else if ($node->tag == 'a'){
                    $tree_nodes[$count]['title'] = 'image or link...';
                }
                
                if (($node->tag == 'h1') ||
                    ($node->tag == 'h2') ||
                    ($node->tag == 'h3')){
                    $this_level = (int)(substr($node->tag, 1, 1));
                    //$current_parents[$this_level] = &$tree_nodes[$count];
                    
                    // set all the parents that are higher than this level to null
                    for ($i = ($this_level+1); $i <= 3; $i++) {
                        $current_parents[$i] = null;
                    } 
                    
                    // append this node to its parent
                    for ($i = ($this_level-1); $i >= 0; $i--) {
                        if ($current_parents[$i] != null){
                            $tree_nodes[$count]['parentID'] = $current_parents[$i];                          
                            //array_push($current_parents[$i]['children'], $tree_nodes[$count]);
                            $current_parents[$this_level] = $tree_nodes[$count]['id'];
                            break;
                        }
                    }                   
                }
                else {
                    for ($i = 3; $i >= 0; $i--) {
                        if ($current_parents[$i] != null){
                            $tree_nodes[$count]['parentID'] = $current_parents[$i];
                            //array_push($current_parents[$i]['children'], $tree_nodes[$count]);
                            break;
                        }
                    }  
                }
            }
        }
       
        $new_nodes = array();
        foreach ($tree_nodes as $n){
            $new_nodes[$n['parentID']][] = $n;
        }
        $tree_post = fb_create_tree($new_nodes, array($tree_nodes[0]));
        array_push($tree_root['children'], $tree_post[0]);
    }

?>
    <table>
      <tr>
        <td>
            <div id="fb-div-jstree">
                <?php 
                    fb_array_to_ul($tree_root['children']);
                ?>
            </div>
            <input style="margin-top:10px" type="button" value="Add Source Item" class="button-secondary" />
        </td>
        <td>
            <div id="fb-div-show-jstree-selection" contenteditable="true">
            </div>
        </td>		
      </tr>
    </table>

<?php    
}

function fb_array_to_ul($arr) {
    echo "<ul>";
    foreach ($arr as $val) {
        if (!empty($val['children'])) {
            echo "<li id='". $val['post_id_and_tag_id'] ."'>" . $val['title'];
            fb_array_to_ul($val['children']);
            echo "</li>";
        } else {
            echo "<li id='". $val['post_id_and_tag_id'] ."'>" . $val['title'] . "</li>";
        }
    }
    echo "</ul>";
}

function fb_setup_tag_ids(){
    global $post;
    $args = array( 'post_type' => 'source' );
    $source_posts = get_posts( $args );
    foreach( $source_posts as $post ){  
        setup_postdata($post); 
        $post_content = $post->post_content;
        $html_parser = str_get_html($post_content);     
                
        //$tags = $html_parser->find('h1, h2, h3, p, ul, ol, table');

        // this section of code should move into the 'save' button in the source document edit page
                
        foreach ($html_parser->nodes as $node){       
            // consider the top level tags first
            if ($node->parent()->tag == 'root'){
                if ($node->tag == 'text'){
                    $inner_text = $node->innertext.trim();
                    if (!ctype_space($inner_text)){
                        $node->outertext = "<p>" . $node->innertext . "</p>";
                    }
                }                  
            }
        }
        
        $result_str = $html_parser->save();
        $html_parser = str_get_html($result_str); 
        
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
    }      
}

function fb_create_tree(&$list, $parent){
    $tree = array();
    foreach ($parent as $k=>$l){
        if(isset($list[$l['id']])){
            $l['children'] = fb_create_tree($list, $list[$l['id']]);
        }
        $tree[] = $l;
    } 
    return $tree;
}

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
<div id="fb-div-derived-sortables">
</div>

<input id="fb-button-add-new-derived-item" type="button" value="Add New Item" class="button-secondary" />
<?php    
}

//-----------------------------------------------------------------------------------------------
// revisions

function fb_add_revision_compare_page(){
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

function fb_admin_footer() {
    // Only load js on revision screen
    if (get_current_screen()->id == 'post') {
	    wp_enqueue_script('visualdiff', plugins_url( 'js/visualdiff.js' , __FILE__ ), array( 'jquery' ));
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

function fb_add_meta_box_revision() {
    global $post;
    if ($post) {
        add_meta_box('meta_box_post_revision', 'Revision', 'fb_meta_box_post_revision_callback', null, 'side', 'core' );
    }
}

function fb_meta_box_post_revision_callback() {
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


