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
        
    //----------------------------------------------------------
    // open editor.css
    $edito_css_file_name = $ww_file_path . 'editor.css';
    $content = ww_read_file($edito_css_file_name);
    if (!$content) return;
    $editor_css_parser = new Sabberworm\CSS\Parser($content);
    $editor_css = $editor_css_parser->parse();
    
    //----------------------------------------------------------
    // open html file
    $filename = $ww_file_path . '34_Risk-taking_combo.htm';
    $content = ww_read_file($filename);
    if (!$content) return;  
    $html = str_get_html($content);  

    //----------------------------------------------------------
    // body
    $word_section = $html->find('div.WordSection1');
    if (count($word_section) != 1) {
        echo "<p style='margin-left:200px'>error: div.WordSection1 tag count != 1.</p>"; // ms - temp
        return;
    }
    $body_content = $word_section[0]->innertext;   
    
    $body = str_get_html($body_content);  
    $body = ww_remove_toc($body); // remove table of content
    $body_content_no_toc = $body->save(); 
    $body_content_no_toc = trim($body_content_no_toc);
    $body = str_get_html($body_content_no_toc);  
    if (!body) {
        echo "<p style='margin-left:200px'>error: html body is empty.</p>"; // ms - temp
        return;
    }
    
    //----------------------------------------------------------
    // css  
    $style = null;
    $style_section = $html->find('style');
    if (count($style_section) != 1) {
        echo "<p style='margin-left:200px'>error: style tag count != 1.</p>"; // ms - temp
        return;
    }
    $style = $style_section[0]->innertext; 
    $style = ww_clean_style_content($style);
    if (!$style) {
        echo "<p style='margin-left:200px'>error: style is empty.</p>"; // ms - temp
        return;
    }
        
    $css_parser = new Sabberworm\CSS\Parser($style);
    $css = $css_parser->parse();
    ww_check_css($editor_css, $css, $body); 
}

function ww_clean_style_content($style) {
    if (!style) return null;
    
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
    
    return $style;
}

function ww_remove_toc($body) {
    if (!body) return null;
    foreach ($body->find('p') as $p){ 
        $class = $p->class;
        $class = strtolower($class);
        if ((strpos($class, 'unitopening') !== false) || 
            (strpos($class, 'msotoc') !== false)) {
            $p->outertext = '';
        }
    }   
    return $body;
}

function ww_read_file($name) {
    $file = fopen($name, "r");
    if (!$file) return null;
    $content = fread($file,filesize($name));
    fclose($file);
    return $content;
}

function ww_check_css($editor_css, $css, $body) {
    // remove all styles if they are not used in the html
    $list = $editor_css->getContents(); // this is a full copy of the array not a reference to the array
    $csslist = $css->getContents();
    //$csslist = $css->getAllDeclarationBlocks();
    for ($i = count($csslist)-1; $i >= 0; $i--) {
        $b = $csslist[$i];
        $used = false;
        foreach($b->getSelectors() as $selector) {
            $s = $selector->getSelector();
            $elements = $body->find($s);
            if (count($elements) > 0) {
                $used = true;
                break;
            }
        }
        if ($used == false) {
            unset($csslist[$i]);
        }
    } 
    
    // if the style is used in html, check if it already exists in the editor.css list; if yes, rename it if necessary
    
    // have to use foreach here, due to the use of unset function above
    foreach ($csslist as $b) {
        if (count($list) == 0) {
            $editor_css->appendToContent($b);
        }
        else {
            for ($j = 0; $j < count($list); $j++) {
                
                
            }        
        }
    }
    
    $output = $editor_css->render();
    
   
}

?>