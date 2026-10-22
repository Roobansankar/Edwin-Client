const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const filename = path.resolve(__dirname, '../src/components/dashboard/AiMessageContent.tsx');
const component = new Module(filename, module);
component.filename = filename;
component.paths = module.paths;
component.require = function (name) {
  if (name.endsWith('.module.css')) return { content: 'content', tableScroll: 'tableScroll' };
  return Module.prototype.require.call(this, name);
};
component._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const { AiMessageContent } = component.exports;
const render = (content) => renderToStaticMarkup(React.createElement(AiMessageContent, { content }));

test('purchase order replies render headings, bold figures, and a real table', () => {
  const html = render('## Pending Purchase Orders\n\n**Count:** 1 pending order\n\n| PO Number | Vendor | Total incl. GST |\n|---|---|---:|\n| PO-2026-001 | UltraTech Cement Ltd | **₹16,430.00** |');
  assert.match(html, /<h2>Pending Purchase Orders<\/h2>/);
  assert.match(html, /<strong>Count:<\/strong>/);
  assert.match(html, /<table>/);
  assert.match(html, /<th>Vendor<\/th>/);
  assert.match(html, /<strong>₹16,430\.00<\/strong>/);
  assert.ok(!html.includes('## Pending') && !html.includes('|---|'));
});
test('wide report tables have a keyboard-accessible scrolling region', () => {
  const html = render('| PO | Vendor |\n|---|---|\n| 001 | Cement |');
  assert.match(html, /class="tableScroll" role="region" aria-label="Report table" tabindex="0"/);
});
test('model-generated HTML, external images, and unsafe links do not execute', () => {
  const html = render('<script>alert(1)</script>\n\n![tracking](https://example.com/pixel.png)\n\n[unsafe](javascript:alert%281%29)');
  assert.ok(!html.includes('<script') && !html.includes('<img') && !html.includes('javascript:'));
});
