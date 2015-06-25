<?php  
/* 
Plugin Name: Word to Web Page
Description: Preprocess HTML and CSS files exported from Microsoft Word
Version: 1.0
Author: Mingzheng Shi
*/  

require_once( "vendor/autoload.php" );

add_action( 'add_meta_boxes', 'ww_add_meta_box_word_to_web_page' );

function ww_add_meta_box_word_to_web_page() {
    global $FB_LEVEL_1_POST;
    global $FB_LEVEL_2_POST;
    global $FB_LEVEL_3_POST;
    global $post;
    $meta_box_title = 'Word to Web Page';
    if ($post) {        
        if (($post->post_type == $FB_LEVEL_1_POST) || ($post->post_type == $FB_LEVEL_2_POST)){
            add_meta_box('meta_box_source_list', $meta_box_title, 'ww_add_meta_box_word_to_web_page_callback', null, 'side', 'core' );
        }
    }
}

function ww_add_meta_box_word_to_web_page_callback() {       
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
    $filename = $ww_file_path . '25b_Health_information_teach.htm';
    $filename_output = $ww_file_path . 'output_' . '25b_Health_information_teach.htm';

    $content = ww_read_file($filename);
    if (!$content) {
        ww_log('error: html file error.');
        return;
    }        
    $html = str_get_html($content);  

    //----------------------------------------------------------
    // get body
    
    // get body content
    $body_content = '';
    $word_sections = $html->find('div[class^="WordSection"]'); 
    foreach ($word_sections as $section){   
        $body_content .= $section->innertext;
    }
    
    // remove special characters
    $body_content = str_replace("\xa0", "", $body_content);
    $body_content = str_replace("\xc2", "&nbsp;", $body_content);
    

    $body = str_get_html($body_content);  
    if (!$body) {
        ww_log('error: html body is empty.');
        return;
    }
    
    // remove table of content
    $body = ww_remove_toc($body); 
    
    // add comments
    $body = ww_add_comments($body, $html);
    if (!$body) {
        ww_log('error: html body is empty.');
        return;
    }
    
    $body_content_no_toc = $body->save(); 
    $body_content_no_toc = trim($body_content_no_toc);
    $body = str_get_html($body_content_no_toc);  
    if (!$body) {
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
    $number_of_chars_in_an_answer_line = 128;
    
    // first loop to create questions list
    foreach ($body->nodes as $node) {  
        // consider the top level tags 
        if ($node->parent()->tag == 'root'){   
            if ($node->tag == 'p') {
                if ($node->class == 'question') {
                    $node_dom = str_get_html($node->outertext); 
                    $img_outertext = ''; // move image tag to the end of a question class
                    foreach ($node_dom->find('img') as $img){                        
                        $img_outertext .= $img->outertext;
                        $img->outertext = '';
                    }
                    foreach ($node_dom->find('br') as $br){                        
                        $br->outertext = '';
                    }
                    $child = trim($node_dom->find('p')[0]->innertext);
                    $child .= $img_outertext;
                    //$child = $node->innertext;
                    $next_sibling = $node->nextSibling();
                    
                    while ( ($next_sibling !== null) &&   
                            ($next_sibling->class != 'Ahead') && 
                            ($next_sibling->class != 'Bhead') &&
                            ($next_sibling->class != 'Chead') && 
                            ($next_sibling->class != 'Dhead') && 
                            ($next_sibling->class != 'activity') &&
                            ($next_sibling->class != 'question')) {
                        if (($next_sibling->class == 'questionhi1') ||
                            ($next_sibling->class == 'answerline') ||
                            ($next_sibling->class == 'TNanswer') ||
                            ($next_sibling->class == 'bodytext') ||
                            ($next_sibling->class == 'bodytextHI') ||
                            ($next_sibling->class == 'diagram') ||
                            ($next_sibling->class == 'questionbold') ||
                            ($next_sibling->class == 'bodytextcentered') ||
                            ($next_sibling->class == 'Bodytextboldcentered')) {
                            if ($next_sibling->class == 'TNanswer') {
                                $outer = $next_sibling->outertext;
                                //$outer = str_replace("&nbsp;", "", $outer); // remove all &nbsp;
                                $child .= $outer;
                                
                                //$child .= '<p class=answerline>______________________________________________________________________________________________________________________________</p>';
                                //$child .= '<p class=answerline>_________________________________________________________________________________________</p>'; // original
                            }
                            else if ($next_sibling->class == 'answerline') {
                                $node_dom = str_get_html($next_sibling->outertext);  
                                foreach ($node_dom->find('p') as $p){ 
                                    $p->innertext = trim($p->innertext);
                                    $l = strlen($p->innertext);
                                    if ($l < $number_of_chars_in_an_answer_line) {
                                        $add = $number_of_chars_in_an_answer_line - $l;
                                        for ($i = 0; $i < $add; $i++) {
                                            $p->innertext .= '_';
                                        }
                                    }
                                    //$p->innertext = trim($p->innertext) . '_____________________________________'; 
                                }
                                $child .= $node_dom->find('p')[0]->outertext;
                            }
                            else {
                                $child .= $next_sibling->outertext;
                            }
                        }
                        else {
                            // <div align=center>
                            if ($next_sibling->tag == 'div' && $next_sibling->class == '') {
                                $all_attr = $next_sibling->getAllAttributes();
                                $align = $next_sibling->getAttribute('align');
                                if (count($all_attr) === 1 && $align === 'center') {
                                    $child .= $next_sibling->innertext;
                                }
                                else {
                                    ww_log('Info: unexpected attributes of a div: ' . $next_sibling->outertext);
                                }
                            }
                            else if ($next_sibling->tag == 'table') {
                                $table_border = $next_sibling->getAttribute('border');
                                if ($table_border === false) {
                                    $next_sibling->class = 'no-border';
                                }
                                $node_dom = str_get_html($next_sibling->outertext); 
                                ww_set_image_attribute($node_dom, '');
                                $child .= $node_dom->find('table')[0]->outertext;
                            }
                            else {
                                ww_log('Info: unexpected class (1): ' . $next_sibling->outertext);
                            }
                        }
                        //$child .= $next_sibling->outertext;
                        $next_sibling->outertext = '';
                        $next_sibling = $next_sibling->nextSibling();
                    }
                    
                    $node->tag = 'div';
                    $node->innertext = $child;
                    
                    /*
                    if ($child !== '') {
                        $node->tag = 'div';
                        $node->innertext .= $child;
                    }
                    else {
                        // there is no child for this question
                        $node->tag = 'div';
                    }
                    */
                }
            }           
        }        
    }
    
    $body_content = $body->save(); 
    $body_content = trim($body_content);
    $body = str_get_html($body_content);  
    
    // second loop to create questions list
    foreach ($body->nodes as $node) {  
        // consider the top level tags 
        if ($node->parent()->tag == 'root'){   
            if ($node->tag == 'div') {
                if ($node->class == 'question') {
                    /*
                    if ($ol_text === '') { // the first 'question' tag in the list
                        $first_question_node = $node;                                           
                    }
                    */
                    $ol_text = '';
                    $node->tag = 'li';
                    $node->class = 'question';
                    if (strlen($node->innertext) > 1) {
                        $node_dom = str_get_html($node->outertext);  
                        /*
                        foreach ($node_dom->find('span') as $span){ 
                            $span->outertext = ''; // remove all span tags
                        }
                        */
                        $node_text = $node_dom->find('li')[0]->innertext;
                        $first_char = substr($node_text, 0, 1);
                        if (is_numeric($first_char)) {
                            $node_text = substr($node_text, 1); // ms - trim the first char
                        }
                        if (strpos($node_text, "&nbsp;") === 0) {
                            $node_text = preg_replace("#(^(&nbsp;|\s)+|(&nbsp;|\s)+$)#", "", $node_text); // remove leading and ending "&nbsp;"
                        }

                        //$node_text = iconv("UTF-8", "UTF-8//IGNORE", $node_text);
                        /*
                        for($i=0; $i<strlen($node_text); $i++) {
                            $c = $node_text[$i];
                        }
                        */
                        //$node_text = trim($node_text);
                        $node->innertext = $node_text;
                    }

                    $ol_text .= $node->outertext;   
                    
                    $next_sibling = $node->nextSibling();
                    while ( ($next_sibling !== null) &&  
                            ($next_sibling->class != 'Ahead') && 
                            ($next_sibling->class != 'Bhead') &&
                            ($next_sibling->class != 'Chead') && 
                            ($next_sibling->class != 'Dhead') && 
                            ($next_sibling->class != 'activity')) {
                        if ($next_sibling->class == 'question') {
                            $next_sibling->tag = 'li';
                            $next_sibling->class = 'question';
                            if (strlen($next_sibling->innertext) > 1) {
                                $node_dom = str_get_html($next_sibling->outertext);  
                                /*
                                foreach ($node_dom->find('span') as $span){ 
                                    $span->outertext = ''; // remove all span tags
                                }
                                */
                                $node_text = $node_dom->find('li')[0]->innertext;
                                if (is_numeric($first_char)) {
                                    $node_text = substr($node_text, 1); // ms - trim the first char
                                }
                                if (strpos($node_text, "&nbsp;") === 0) {
                                    $node_text = preg_replace("#(^(&nbsp;|\s)+|(&nbsp;|\s)+$)#", "", $node_text); // remove leading and ending "&nbsp;"
                                }
                                
                                //$node_text = trim($node_text);
                                $next_sibling->innertext = $node_text;
                            }
                            $ol_text .= $next_sibling->outertext;
                            $next_sibling->outertext = '';
                        }
                        else {
                            ww_log('Info: unexpected class (2): ' . $next_sibling->outertext);
                        }
                        $next_sibling = $next_sibling->nextSibling();
                    }

                    $node->outertext = '<ol>' . $ol_text . '</ol>';
                }
                else {
                    /*
                    if ($ol_text !== '') {
                        $first_question_node->outertext = '<ol>' . $ol_text . '</ol>';
                    }
                    
                    $ol_text = '';
                    */
                }
            }           
        }        
    }
    
    $body_content = $body->save(); 
    $body_content = trim($body_content);
    $body = str_get_html($body_content);  
    
    // rewrite other body elements
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
                    ww_set_image_attribute($node_dom, 'align-right');
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
                    foreach ($node_dom->find('a') as $a){ 
                        $a->outertext = $a->innertext; // unwrap 'a' tag in 'p.Bhead' tag
                    }
                    ww_set_image_attribute($node_dom, 'align-right');
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
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    //$node->tag = 'h3';
                    //$node->class = 'Chead'; // unchanged
                }
                else if ($node->class == 'Dhead') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                }
                else if ($node->class == 'bodytext') {
                    $node_dom = str_get_html($node->outertext); 
                    foreach ($node_dom->find('a') as $a){ 
                        if (trim($a->innertext) === '') {
                            $a->outertext = ''; // remove 'a' tag if it is empty
                        }
                    }
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->class = '';
                }
                else if ($node->class == 'bodytextHI') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->class = '';
                } 
                else if ($node->class == 'activity') {
                    $node_dom = str_get_html($node->outertext);  
                    foreach ($node_dom->find('span') as $span){ 
                        $span->outertext = ''; // remove all span tags
                    }
                    foreach ($node_dom->find('a') as $a){ 
                        if (trim($a->innertext) === '') {
                            $a->outertext = ''; // remove 'a' tag if it is empty
                        }
                        else {
                            $a->outertext = $a->innertext; // unwrap 'a' tag in 'activity' class
                        }
                    }
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                    $node->tag = 'h2';
                    //$node->class = 'activity'; // unchanged
                }
                else if ($node->class == 'diagram') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                }
                else if ($node->class == 'diagram2') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                }
                else if ($node->class == 'question') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                }
                else if ($node->class == '') {
                    $node_dom = str_get_html($node->outertext); 
                    ww_set_image_attribute($node_dom, 'align-right');
                    $inner = $node_dom->find('p')[0]->innertext;
                    $node->innertext = $inner;
                }
                else {
                    ww_log('Info: other classes (class=' . $node->class . '): ' . $node->outertext);
                    //ww_log('Info: skip (class=' . $node->class . '): ' . $node->outertext);
                    //$node->outertext = ''; // test only
                }
            } 
            else if ($node->tag == 'ol') {
                $node_dom = str_get_html($node->outertext); 
                ww_set_image_attribute($node_dom, 'align-right');
                $inner = $node_dom->find('ol')[0]->innertext;
                $node->innertext = $inner;         
            }
            else if ($node->tag == 'table') {
                $table_border = $node->getAttribute('border');
                if ($table_border === false) {
                    $node->class = 'no-border';
                }
                $node_dom = str_get_html($node->outertext); 
                ww_set_image_attribute($node_dom, '');
                $node->outertext = $node_dom->find('table')[0]->outertext;                
            }
            else if ($node->tag == 'div') {
                $node_dom = str_get_html($node->outertext); 
                ww_set_image_attribute($node_dom, 'align-right');
                $inner = $node_dom->find('div')[0]->innertext;
                $node->innertext = $inner;                  
            }
            else {
                if (trim($node->outertext) !== '') {
                    ww_log('Info: other tags (tag= ' . $node->tag . '): ' . $node->outertext);
                //$node->outertext = ''; // test only
                }
            }
        }
    }
}

function ww_set_image_attribute(&$dom, $align) {
    foreach ($dom->find('img') as $img){ 
        $original_align = $img->getAttribute('align');
        if ($original_align == 'left') {
            if ($align == 'align-right') $img->setAttribute('align', 'right'); // assume images are aligned right.
        }
        else {
            //if ($align == 'align-right') $img->setAttribute('align', 'right'); // assume images are aligned right.
        }
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

function ww_add_comments($body, $html) {
    if ((!$body) || (!$html)) return null;
    foreach ($body->find('a.msocomanchor') as $a) { 
        $href = $a->href;  
        if (!$href) { 
            ww_log('Error: comment href is null.');
            //return null;
        }
        
        $as = $html->find('a[name='. substr($href, 1) .']');
        if (count($as) !== 1) { 
            ww_log('Error: comment href does not link to one comment.');
            return null;
        }
        
        $comment = $as[0]->parentNode();
        $node_dom = str_get_html($comment->outertext); 
        foreach ($node_dom->find('span.MsoCommentReference') as $span){ 
            $span->outertext = ''; // remove all span.MsoCommentReference tags
        }
        $outer_content = $node_dom->save();
        $node_dom = str_get_html($outer_content); 
        foreach ($node_dom->find('span') as $span){ 
            $span->outertext = $span->innertext; // unwrap span tags
        }
        $inner = $node_dom->find('p.TNcomment')[0]->innertext;
        $bubble_uid = uniqid(rand(), true);  
        $bubble_outer = '<div id="' . $bubble_uid . '" class="fb-comment fb-comment-bubble fb-teacher-bubble" style="position: absolute; width: 100px; min-height: 60px;">' . $inner . '</div>';
        $body->outertext .= $bubble_outer;
        
        $archor_text = $a->previousSibling();
        if ($archor_text == null) {
            $a_parent = $a->parentNode();
            $archor_text = $a_parent->previousSibling();
        }
        if ($archor_text->tag !== 'a') {
            ww_log('Info: "a" tag expected for archor text');
            return null;
        }
        $archor_text->outertext = "<span class='fb-comment fb-comment-content' data-comment-id='" . $bubble_uid . "'>" . $archor_text->innertext . "</span>";        
    }
    
    return $body;
}

function ww_remove_toc($body) {
    if (!$body) return null;
    foreach ($body->find('p') as $p) { 
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