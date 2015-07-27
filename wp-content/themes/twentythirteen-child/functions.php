<?php 

add_action( 'wp_enqueue_scripts', 'fb_enqueue_parent_styles' );

function fb_enqueue_parent_styles() {
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
}





















?>