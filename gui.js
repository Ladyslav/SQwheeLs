var execBtn = document.getElementById("execute");
var clearBtn = document.getElementById("clear");
var outputElm = document.getElementById('output');
var commandsElm = document.getElementById('commands');
var dbFileElm = document.getElementById('dbfile');;

var choiceA = document.getElementById('choiceA');
var choiceB = document.getElementById('choiceB');
var choiceC = document.getElementById('choiceC');
var choiceD = document.getElementById('choiceD');
var choiceE = document.getElementById('choiceE');

// Start the worker in which sql.js will run
var worker = new Worker("../dist/worker.sql-wasm.js");

// Open a database
worker.postMessage({ action: 'open' });

// Connect to the HTML element we 'print' to
function print(text) {
	outputElm.innerHTML = text.replace(/\n/g, '<br>');
}

// Run a command in the database
function execute(commands) {
	tic();
	worker.onmessage = function (event) {
		var results = event.data.results;
		toc("Executing SQL");
		if (!results) {
			return;
		}

		tic();
		outputElm.innerHTML = "";
		for (var i = 0; i < results.length; i++) {
			outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
		}
		toc("Displaying results");
	}
	worker.postMessage({ action: 'exec', sql: commands });
	outputElm.textContent = "Fetching results...";
}

// Create an HTML table
var tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		var open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
		var tbl = document.createElement('table');
		tbl.classList.add('table');
		tbl.classList.add('table-hover');
		tbl.classList.add('table-bordered');
		tbl.classList.add('table-sm');
		var html = '<thead>' + valconcat(columns, 'th') + '</thead>';
		var rows = values.map(function (v) { return valconcat(v, 'td'); });
		html += '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		return tbl;
	}
}();

// Execute the commands when the Execute button is clicked
function execEditorContents() {
	execute(editor.getValue() + ';');
}
execBtn.addEventListener("click", execEditorContents, true);

// Clear the commands when the Clear button is clicked
function clearEditorContents() {
	editor.setValue('');
	outputElm.innerHTML = '';
}
clearBtn.addEventListener("click", clearEditorContents, true);

function selectAnswer(btn, correct) {
	if (correct) {
		btn.innerHTML += '<div style="float: right;">Correct</div>';
		choiceA.classList.add('disabled');
		choiceB.classList.add('disabled');
		choiceC.classList.add('disabled');
		choiceD.classList.add('disabled');
		choiceE.classList.add('disabled');
		btn.style.opacity = 1.0;
	}
	else {
		btn.innerHTML += '<div style="float: right;">False</div>';
		btn.classList.add('disabled');
	}
}

// Performance measurement functions
var tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
function tic() { tictime = performance.now() }
function toc(msg) {
	var dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

// Add syntax highlihjting to the textarea
var editor = CodeMirror.fromTextArea(commandsElm, {
	mode: 'text/x-mysql',
	viewportMargin: Infinity,
	indentWithTabs: true,
	smartIndent: true,
	lineNumbers: true,
	matchBrackets: true,
	autofocus: true,
	extraKeys: {
		"Ctrl-Enter": execEditorContents,
	}
});

// Load a db from a file
dbFileElm.onchange = function () {
	var f = dbFileElm.files[0];
	var r = new FileReader();
	r.onload = function () {
		worker.onmessage = function () {
			toc("Loading database from file");
			// Show the schema of the loaded database
			execEditorContents();
		};
		tic();
		try {
			worker.postMessage({ action: 'open', buffer: r.result }, [r.result]);
		}
		catch (exception) {
			worker.postMessage({ action: 'open', buffer: r.result });
		}
	}
	r.readAsArrayBuffer(f);
}