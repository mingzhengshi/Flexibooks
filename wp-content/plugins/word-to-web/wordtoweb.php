<?php  
/* 
Plugin Name: Word to Web Page
Description: Preprocess HTML and CSS files exported from Microsoft Word
Version: 1.0
Author: Mingzheng Shi
*/  

//$autoloader = plugins_url( "vendor/autoload.php", __FILE__ );
require_once( "vendor/autoload.php" );

add_action( 'admin_head', 'ww_admin_head' );

function ww_admin_head() {   
    $file = plugins_url( 'derived.css' , __FILE__ );
    //$content = file($file);
    $content = "html .mceContentBody {
	            max-width: 800px;
                }

                h1.main-heading-1 {
                    padding-left: 35px;
                    background-color: #d1e7f7;
                    color: #1f6ca5;
                    font-size: 35pt;
                }";
    $css_parser = new Sabberworm\CSS\Parser($content);
    $css_doc = $css_parser->parse();
}


?>