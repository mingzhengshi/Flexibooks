<?php

global $wpdb;

$wp_content = ( is_ssl() || ( is_admin() && defined('FORCE_SSL_ADMIN') && FORCE_SSL_ADMIN ) ) ? str_replace( 'http:', 'https:', WP_CONTENT_URL ) : WP_CONTENT_URL;
$fb_urlpath = $wp_content . '/plugins/visualdiff/';

echo '<link rel="stylesheet" type="text/css" href="' . $fb_urlpath . '/css/revisionsdiff.css" />'."\n";

$post_id = absint($_GET['postid']);
echo "Post ID:" . $post_id;

$this_post = get_post( $post_id );
//$right_content = $this_post->post_content;

$status = 'inherit';
$last_revision = $wpdb->get_results("SELECT * FROM $wpdb->posts WHERE post_type = 'revision' AND post_parent = '$post_id' AND post_status = '$status' ORDER BY post_date DESC LIMIT 2");
$left_content = "";
$right_content = "";
if ($last_revision){
    $left_content = $last_revision[1]->post_content;
    $right_content = $last_revision[0]->post_content;
}

?>

<table class="fb-editor-table">
  <tr>
    <td>
<?php
wp_editor( $left_content, 'content_left', array( 'media_buttons' => false  ) );      
?>        
    </td>
    <td>
<?php
wp_editor( $right_content, 'content_right', array( 'media_buttons' => false  ) );      
?>   
    </td>		
  </tr>
</table>

