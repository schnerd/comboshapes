<?php


//<script src="object_utils.js?l"></script>
//<script src="canvas_utils.js?l"></script>
//<script src="GameObject.js?l"></script>
//<script src="Game.js?l"></script>
//<script src="Menu.js?l"></script>
//<script src="Button.js?l"></script>
//<script src="Board.js?l"></script>
//<script src="Card.js?l"></script>
//<script src="combo_shapes.js?l"></script>

$files = [
	'object_utils.js',
	'canvas_utils.js',
	'GameObject.js',
	'Game.js',
	'Menu.js',
	'Button.js',
	'Board.js',
	'Card.js',
	'combo_shapes.js',
];
$str = '(function(window,document,undefined){';
foreach ($files as $file) {
	$str .= file_get_contents($file) . "\n";
}
$str .= '})(window,document,undefined);';

file_put_contents('dist.js', $str);

$output = shell_exec("java -jar closure-compiler-v20200406.jar" .
	" --warning_level VERBOSE" .
	" --jscomp_warning=reportUnknownTypes" .
	" --jscomp_warning '*'" .
	" --compilation_level ADVANCED_OPTIMIZATIONS" .
	" --language_in=ECMASCRIPT6" .
//	" --language_out=ECMASCRIPT6" .
	" --js_output_file dist.min.js dist.js 2>&1");

unlink('dist.js');

var_dump($output);
