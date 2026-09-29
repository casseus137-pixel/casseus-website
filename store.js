/**
 * Simple JSON file store for surveys and notifications log.
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readList(name) {
  ensureDir();
  const fp = filePath(name);
  if (!fs.existsSync(fp)) return [];
  try {
    return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch {
    return [];
  }
}

function writeList(name, list) {
  ensureDir();
  fs.writeFileSync(filePath(name), JSON.stringify(list, null, 2), 'utf8');
}

function append(name, item) {
  const list = readList(name);
  list.push(item);
  writeList(name, list);
  return item;
}

module.exports = { readList, writeList, append, DATA_DIR };
