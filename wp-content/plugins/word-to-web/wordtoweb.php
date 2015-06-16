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
    if (!$content) {
        ww_log('error: css file error.');
        return;
    }      
    $editor_css_parser = new Sabberworm\CSS\Parser($content);
    $editor_css = $editor_css_parser->parse();
    
    //----------------------------------------------------------
    // open target html file
    $filename = $ww_file_path . '34_Risk-taking_combo.htm';
    $filename_output = $ww_file_path . 'output_' . '34_Risk-taking_combo.htm';
    //$filename = $ww_file_path . '22_About_alcohol_teach.htm';
    $content = ww_read_file($filename);
    if (!$content) {
        ww_log('error: html file error.');
        return;
    }        
    $html = str_get_html($content);  

    //----------------------------------------------------------
    // get body
   
    /*
    $word_section = $html->find('div.WordSection1');
    if (count($word_section) != 1) {
        ww_log('error: div.WordSection1 tag count != 1.');
        return;
    }
    $body_content = $word_section[0]->innertext;   
    */
    
    $body_content = '';
    $word_sections = $html->find('div[class^="WordSection"]'); 
    foreach ($word_sections as $section){   
        $body_content .= $section->innertext;
    }
    
    $body = str_get_html($body_content);  
    $body = ww_remove_toc($body); // remove table of content
    $body_content_no_toc = $body->save(); 
    $body_content_no_toc = trim($body_content_no_toc);
    $body = str_get_html($body_content_no_toc);  
    if (!body) {
        ww_log('error: html body is empty.');
        return;
    }
    
    //----------------------------------------------------------
    // get style  
    $style = null;
    $style_section = $html->find('style');
    if (count($style_section) != 1) {
        ww_log('error: style tag count != 1.');
        return;
    }
    $style = $style_section[0]->innertext; 
    $style = ww_clean_style_content($style);
    if (!$style) {
        ww_log('error: style is empty.');
        return;
    }
        
    $css_parser = new Sabberworm\CSS\Parser($style);
    $css = $css_parser->parse();
    ww_add_new_styles($editor_css, $css, $body); 
    
    $new_editor_css_content = $editor_css->render(Sabberworm\CSS\OutputFormat::createPretty());
    $write_result = ww_write_file($edito_css_file_name, $new_editor_css_content);
    if ($write_result === false) {
        ww_log('error: cannot write to editor.css file.');
        return;    
    }
    
    //----------------------------------------------------------
    // check all elements in body
    ww_rewrite_all_body_elements($body);
    $body_result = $body->save(); 
    $write_result = ww_write_file($filename_output, $body_result);
}

function ww_rewrite_all_body_elements(&$body) {
    // first loop to create questions list
    foreach ($body->nodes as $node) {  
        // consider the top level tags 
        if ($node->parent()->tag == 'root'){   
            if ($node->tag == 'p') {
                if ($node->class == 'question') {
                    //$ol = '';
                    //$ol .= $node->outertext;
                    
                    $child = '';
                    $next_sibling = $node->nextSibling();
                    
                    
                    
                    // should be rewrited similar to the second loop
                    
                    while ( ($next_sibling->class != 'Ahead') && 
                            ($next_sibling->class != 'Bhead') &&
                            ($next_sibling->class != 'Chead') && 
                            ($next_sibling->class != 'activity') &&
                            ($next_sibling->class != 'question')) {
                        if ($next_sibling->class == 'TNanswer') {
                            $next_sibling->outertext = '<hr class="answer" /><hr class="answer" />'; // test only
                        }
                        $child .= $next_sibling->outertext;
                        $next_sibling->outertext = '';
                        $next_sibling = $next_sibling->nextSibling();
                    }
                    
                    if ($child !== '') {
                        //$child = '<ol>' . $child . '</ol>';
                        $node->innertext .= $child;
                    }
                }
            }           
        }        
    }
    
    // second loop to create questions list
    $ol_text = '';
    $first_question_node = null;
    foreach ($body->nodes as $node) {  
        // consider the top level tags 
        if ($node->parent()->tag == 'root'){   
            if ($node->tag == 'p') {
                if ($node->class == 'question') {
                    if ($ol_text === '') { // the first 'question' tag in the list
                        $first_question_node = $node;                                           
                    }

                    $node->tag = 'li';
                    $node->class = '';
                    $ol_text .= $node->outertext;   
                    
                    /*
                    $next_sibling = $node->nextSibling();
                    while ( ($next_sibling->class != 'Ahead') && 
                            ($next_sibling->class != 'Bhead') &&
                            ($next_sibling->class != 'Chead') && 
                            ($next_sibling->class != 'activity')) {
                        if ($next_sibling->class == 'question') {
                            $next_sibling->tag = 'li';
                            $next_sibling->class = '';
                            $ol_text .= $next_sibling->outertext;
                            $next_sibling->outertext = '';
                        }
                        else {
                            ww_log('Info: unexpected content');
                        }
                        $next_sibling = $next_sibling->nextSibling();
                    }

                    $node->outertext .= $child;
                    */
                }
                else {
                    if ($ol_text !== '') {
                        $first_question_node->outertext = '<ol>' . $ol_text . '</ol>';
                    }
                    
                    $ol_text = '';
                }
            }           
        }        
    }
    
    foreach ($body->nodes as $node){   
        // consider the top level tags 
        if ($node->parent()->tag == 'root'){   
            if ($node->tag == 'p') {
                //$class = $node->getAttribute('class');
                if ($node->class == 'Ahead') {
                    $node_dom = str_get_html($node->outertext);  
                    foreach ($node_dom->find('a') as $a){ 
                        $a->outertext = $a->innertext; // unwrap 'a' tag in 'p.Ahead' tag
                    }
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    //$node_inner = $node->innertext;
                    $node->tag = 'h1';
                    $node->class = 'main-heading-1';
                }
                else if ($node->class == 'Bhead') {
                    $node_dom = str_get_html($node->outertext);  
                    foreach ($node_dom->find('span') as $span){ 
                        $span->outertext = ''; // remove all span tags
                    }
                    ww_set_image_attribute($node_dom);
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->tag = 'h2';
                    $node->class = 'main-heading-2';
                }
                else if ($node->class == 'Chead') {
                    $node_dom = str_get_html($node->outertext);  
                    foreach ($node_dom->find('span') as $span){ 
                        $span->outertext = ''; // remove all span tags
                    }
                    ww_set_image_attribute($node_dom);
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    //$node->tag = 'h3';
                    //$node->class = 'Chead'; // unchanged
                }
                else if ($node->class == 'activity') {
                    $node_dom = str_get_html($node->outertext);  
                    foreach ($node_dom->find('span') as $span){ 
                        $span->outertext = ''; // remove all span tags
                    }
                    ww_set_image_attribute($node_dom);
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->tag = 'h2';
                    //$node->class = 'activity'; // unchanged
                }
                else if ($node->class == 'bodytext') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom);
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->class = '';
                }
                else {
                    $node->outertext = ''; // test only
                }
            } 
            else {
                $node->outertext = ''; // test only
            }
        }
    }
}

function ww_set_image_attribute(&$dom) {
    foreach ($dom->find('img') as $img){ 
        $img->setAttribute('align', 'right'); // assume images are aligned right.
        //$filename = basename($img->getAttribute('src'));
        $filepath = $img->getAttribute('src');
        $fullpath = content_url() . '/uploads/' . $filepath;
        $img->setAttribute('src', $fullpath);
    }
}

function ww_log($message) {
    echo "<p style='margin-left:200px'>" . $message . "</p>"; // ms - temp
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

function ww_write_file($name, $content) {
    $file = fopen($name, "w");
    if (!$file) return null;
    $result = fwrite($file, $content);
    fclose($file);
    return $result;
}


function ww_add_new_styles(&$editor_css, $css, &$body) {
    // 1. remove all styles if they are not used in the html
    $list = $editor_css->getContents(); // this is a full copy of the array not a reference to the array
    $csslist = $css->getContents();
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
    
    // 2. check the format of the selectors 
    // have to use foreach here, due to the use of unset function above
    foreach ($csslist as $b) {
        if (count($b->getSelectors()) > 1) {
            if (count($b->getSelectors()) != 3) {
                ww_log('Info: the selectors count is not equal to 1 or 3 (list below):');
                foreach($b->getSelectors() as $selector) {
                    $s = $selector->getSelector();
                    ww_log($s);
                }
            }
            
            $classname = null;
            foreach($b->getSelectors() as $selector) {
                $s = $selector->getSelector();
                $subs = explode(".", $s);
                if (count($subs) != 2) {
                    ww_log('Info: unexpected selector format: ' . $s);
                }
                else {
                    if ($classname == null) {
                        $classname = $subs[1];
                    }
                    else {
                        if ($classname != $subs[1]) ww_log('Info: selector class names are not unique: ' . $classname . ' != ' . $subs[1]);
                    }
                }
            }
        }
    }
    
    // 3. if the style is used in html, check if it already exists in the editor.css list; if yes, rename it if necessary
    // have to use foreach here
    foreach ($csslist as $b) {
        if (count($list) == 0) {
            $editor_css->appendToContent($b);
        }
        else {
            for ($j = 0; $j < count($list); $j++) {
                
                
            }        
        }
    }
}



?>