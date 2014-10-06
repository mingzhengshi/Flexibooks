<?php

$post_id = absint($_GET['postid']);
echo "Post ID:" . $post_id;

$this_post = get_post( $post_id );
$post_content = $this_post->post_content;

wp_editor( $post_content, 'content', array( 'media_buttons' => false  ) );    
    
    
    
?>