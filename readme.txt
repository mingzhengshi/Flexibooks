//------------------------------------------
tinymce advanced plugin has been modified:

1).
file: tinymce-advanced.php
function:mce_external_plugins()

//$suffix = defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min'; 
$suffix = ''; 

2)
file: mce/table/plugin.js

...
					unApplyAlign(tableElm);
					tableElm.className = tableElm.className.replace(/(?:^|\s)fb-aligncenter(?!\S)/g, '').trim(); // remove class
					if (data.align) {
					    if (data.align == 'center') {
					        tableElm.className += ' fb-aligncenter';
					    }
					    else {
					        editor.formatter.apply('align' + data.align, {}, tableElm);
					    }
					}
...

//------------------------------------------
duplicate post plugin has been modified: