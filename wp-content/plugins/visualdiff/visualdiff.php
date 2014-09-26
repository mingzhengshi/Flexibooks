<?php  
/* 
Plugin Name: Visual Diff 
Description: Visual Display of Revision Comparisons
*/  
?>  

<?php  
add_filter( 'the_content', 'add_content' );
 
function add_content( $content ) {
    $x = 1;
    $y = 2;
    $z = $x + $y;
    return $content . '<p>Thanks for Reading! </p>' . $z;
}
?>  