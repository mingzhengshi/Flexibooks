<?php  
/* 
Plugin Name: Word to Web Page
Description: Preprocess HTML and CSS files exported from Microsoft Word
Version: 1.0
Author: Mingzheng Shi
*/  

require_once( "vendor/autoload.php" );
//require_once( 'simple_html_dom.php' );

add_action( 'admin_head', 'ww_admin_head' );



function ww_admin_head() {   
    //$filename = plugins_url( 'derived.txt' , __FILE__ );
    $ww_file_path = 'C:/Users/Mingzheng/Documents/GitHub/Macmillan/Files/html/';
    
    $filename = $ww_file_path . '34_Risk-taking_combo.htm';
    $file = fopen($filename, "r");
    if (!$file) return;
    $content = fread($file,filesize($filename));
    fclose($file);
    
    $html = str_get_html($content);  
    
    //----------------------------------------------------------
    // css
    
    $style = null;
    foreach($html->find('style') as $element) {
        $style = $element->innertext;        
        break;
    }
    if (!$style) return;
    $style = trim($style);
    
    // clean beginning and end of a string
    $prefix = '<!--';
    if (substr($style, 0, strlen($prefix)) == $prefix) {
        $style = substr($style, strlen($prefix));
    } 
    $appendix = '-->';
    if (substr($style, strlen($style) - strlen($appendix), strlen($style)) == $appendix) {
        $style = substr($style, 0, strlen($style) - strlen($appendix));
    } 
    $style = trim($style);
    
    $css_parser = new Sabberworm\CSS\Parser($style);
    $css = $css_parser->parse();
    ww_check_css($css); 
}

function ww_check_css() {
    // 1. remove all styles started with 'mso' if they are not used in the html
    
    // 2. for all other styles
    // if it is not used in html, then remove and skip
    // if it is used in html, check if it already exists in the current css list; if yes, rename it if necessary
}

?>