// Scratch harness: pull every <script> block out of index.html and syntax-check it.
var fs = require('fs'), vm = require('vm');
var html = fs.readFileSync('index.html', 'utf8');
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g, m, i = 0, bad = 0;
while ((m = re.exec(html))) {
  i++;
  var body = m[1];
  var line = html.slice(0, m.index).split('\n').length;
  try { new vm.Script(body, { filename: 'block' + i }); console.log('block ' + i + ' (line ' + line + ', ' + body.split('\n').length + ' lines) — parses'); }
  catch (e) { bad++; console.log('block ' + i + ' (line ' + line + ') — PARSE ERROR: ' + e.message); }
}
console.log(bad ? '\nFAIL: ' + bad + ' block(s) failed to parse' : '\nAll ' + i + ' script blocks parse.');
process.exit(bad ? 1 : 0);
