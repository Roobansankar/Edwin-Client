const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const filename = path.resolve(__dirname, '../src/lib/ai-erp.ts');
const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const helper = new Module(filename, module);
helper.filename = filename;
helper.paths = module.paths;
helper._compile(compiled, filename);
const { parseErpPlan, directPurchasePlan, purchaseIntent } = helper.exports;
const catalog = {
  projects: [
    { id: '11111111-1111-4111-8111-111111111111', name: 'River View Villa', projectCode: 'RV-001' },
    { id: '22222222-2222-4222-8222-222222222222', name: 'Office Block', projectCode: 'OB-002' },
  ], total: 2, truncated: false,
};
const question = 'Show pending purchase orders and outstanding vendor payments';

test('the reported combined question works without generated JSON', () => {
  const plan = directPurchasePlan(question, catalog);
  assert.deepEqual(plan.domains, ['purchases', 'accounts']);
  assert.equal(plan.projectId, null);
  assert.equal(plan.status, null);
  assert.deepEqual(purchaseIntent(question), { pending: true, outstanding: true });
});
test('project names and codes resolve independently of model-generated IDs', () => {
  for (const suffix of ['for River View Villa', 'for project RIVER VIEW VILLA', 'for RV-001']) {
    assert.equal(directPurchasePlan(`${question} ${suffix}`, catalog).projectId, catalog.projects[0].id);
  }
});
test('same-project follow-ups retain project scope', () => {
  assert.equal(directPurchasePlan(`${question} for the same project`, catalog, ['Tell me about River View Villa']).projectId, catalog.projects[0].id);
});
test('missing optional fields and JSON wrapped in commentary are accepted', () => {
  const plan = parseErpPlan('Here are the filters:\n```json\n{"domains":["purchases","accounts"]}\n```', catalog);
  assert.equal(plan.projectId, null);
  assert.equal(plan.clarification, null);
});
test('a model returning a project name instead of an ID is resolved safely', () => {
  assert.equal(parseErpPlan(JSON.stringify({ domains: ['purchases'], projectId: 'River View Villa', search: '', status: 'null' }), catalog).projectId, catalog.projects[0].id);
});
test('unknown projects and invalid domains are rejected instead of broadening scope', () => {
  assert.throws(() => parseErpPlan(JSON.stringify({ domains: ['purchases'], projectId: '33333333-3333-4333-8333-333333333333' }), catalog));
  assert.throws(() => parseErpPlan('{"domains":["users"]}', catalog));
  assert.equal(directPurchasePlan(`${question} for Unknown Project`, catalog), null);
});
test('dated requests use date planning and ambiguous names require clarification', () => {
  assert.equal(directPurchasePlan(`${question} this month`, catalog), null);
  const ambiguous = { ...catalog, projects: [...catalog.projects, { ...catalog.projects[0], id: '44444444-4444-4444-8444-444444444444' }] };
  assert.ok(directPurchasePlan(`${question} for River View Villa`, ambiguous).clarification);
});
