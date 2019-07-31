<?php

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

$output = shell_exec("java -jar closure-compiler-v20190709.jar" .
	" --warning_level VERBOSE" .
	" --jscomp_warning=reportUnknownTypes" .
	" --jscomp_warning '*'" .
	" --compilation_level ADVANCED_OPTIMIZATIONS" .
	" --language_in=ECMASCRIPT6" .
	" --language_out=ECMASCRIPT6" .
	" --js_output_file dist.min.js dist.js 2>&1");

var_dump($output);

$output = shell_exec("gzip --force --keep dist.min.js 2>&1");

var_dump($output);

$output = shell_exec("brotli --force --keep dist.min.js 2>&1");

var_dump($output);
