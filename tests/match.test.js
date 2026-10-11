/* Answer-matching tests: run with `node tests/match.test.js` (no browser needed). */
const fs = require('fs');
const path = require('path');
global.window = {};
global.document = { documentElement: {} };
global.localStorage = { getItem() { return null; }, setItem() {} };
const JS = path.join(__dirname, '..', 'js');
eval(fs.readFileSync(path.join(JS, 'data.js'), 'utf8'));
eval(fs.readFileSync(path.join(JS, 'core.js'), 'utf8'));
const BB = window.BB, M = BB.match;
let fails = 0;
const expect = (label, got, want) => { if (got !== want) { fails++; console.log('FAIL', label, '→', got, 'expected', want); } };

// [typed answer, expected book number] — 0 means "should not be accepted"
const cases = [['genesis', 1], ['1 Sam', 9], ['First Samuel', 9], ['1samuel', 9], ['I Samuel', 9], ['Samuel 1', 9], ['2nd timothy', 62],
  ['song of solomon', 26], ['Song of Songs', 26], ['Ecclesiasticus', 28], ['Apocalypse', 73], ['revelations', 73], ['Deuteronmy', 5], ['Deutoronomy', 5],
  ['habbakuk', 42], ['Zephania', 43], ['Philipians', 57], ['Philemon', 64], ['phlm', 64], ['1 thesalonians', 59], ['Acts', 51], ['acts of the apostles', 51],
  ['Gospel of John', 50], ['1 John', 69], ['3 jn', 71], ['jude', 72], ['judges', 7], ['judith', 18], ['Eclesiastes', 25], ['Levitcus', 3], ['mathew', 47],
  ['Lamentation', 31], ['Maccabees', 0], ['1 Maccabes', 20], ['samuel', 0], ['Joel', 36], ['Job', 22], ['Jon', 39], ['Psalm', 23], ['Letter to the Romans', 52],
  ["Paul's letter to the Galatians", 55], ['The First Letter of Peter', 67], ['Ezekial', 33], ['Zecharia', 45], ['Hagai', 44], ['Obediah', 38], ['Nehemia', 16],
  ['Tobias', 17], ['Wisdom of Solomon', 27], ['Sirach', 28], ['Hebrew', 65], ['Colosians', 58], ['Galations', 55], ['corinthians', 0], ['2 corinthans', 54],
  ['Malachai', 46], ['Micha', 40], ['Nahim', 41]];
for (const [input, want] of cases) expect(`identify("${input}")`, M.identify(input), want);
BB.BOOKS.forEach((b) => { expect(`self ${b.name}`, M.identify(b.name), b.n); expect(`strict ${b.name}`, M.check(b.name, b.n, true), true); });
expect('strict accepts "Acts"', M.check('acts', 51, true), true);
expect('strict rejects variants', M.check('Song of Solomon', 26, true), false);
// auto-accept while typing must wait when a longer name could follow
for (const [w, want] of [['phil', 0], ['song', 0], ['jon', 0], ['john', 50], ['jude', 72], ['genesis', 1], ['wisdom', 0]]) expect(`exact("${w}")`, M.exact(w), want);
// every book sits in exactly one timeline era
const seen = {};
BB.ERAS.forEach((e) => e.books.forEach((n) => (seen[n] = (seen[n] || 0) + 1)));
for (let n = 1; n <= 73; n++) expect(`era coverage #${n}`, seen[n], 1);
expect('73 books', BB.BOOKS.length, 73);
console.log(fails ? `${fails} failure(s)` : `All matching tests passed (${cases.length} variants + 73 names).`);
process.exit(fails ? 1 : 0);
