const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const NOTES_DIR = path.resolve(__dirname, '../notes');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve notes' own style.css if requested from notes dir
app.use('/notes', express.static(NOTES_DIR));

function listNotes() {
  return fs.readdirSync(NOTES_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

app.get('/api/notes', (req, res) => {
  try {
    res.json(listNotes());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/notes/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const filePath = path.join(NOTES_DIR, name);
  if (!filePath.startsWith(NOTES_DIR)) return res.status(403).end();
  try {
    res.send(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    res.status(404).json({ error: 'Not found' });
  }
});

app.post('/api/notes', (req, res) => {
  const { name, content } = req.body;
  if (!name || !content) return res.status(400).json({ error: 'name and content required' });
  const safeName = name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim();
  const fileName = safeName.endsWith('.html') ? safeName : safeName + '.html';
  const filePath = path.join(NOTES_DIR, fileName);
  if (!filePath.startsWith(NOTES_DIR)) return res.status(403).end();
  if (fs.existsSync(filePath)) return res.status(409).json({ error: 'Note already exists' });
  fs.writeFileSync(filePath, content, 'utf8');
  res.json({ name: fileName });
});

app.put('/api/notes/:name', (req, res) => {
  const name = path.basename(req.params.name);
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const filePath = path.join(NOTES_DIR, name);
  if (!filePath.startsWith(NOTES_DIR)) return res.status(403).end();
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  fs.writeFileSync(filePath, content, 'utf8');
  res.json({ name });
});

app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);
  const results = [];
  for (const file of listNotes()) {
    if (file.toLowerCase().includes(q)) {
      results.push({ name: file, matchType: 'name' });
      continue;
    }
    try {
      const content = fs.readFileSync(path.join(NOTES_DIR, file), 'utf8');
      if (content.toLowerCase().includes(q)) {
        results.push({ name: file, matchType: 'content' });
      }
    } catch {}
  }
  res.json(results);
});

app.listen(PORT, () => {
  console.log(`Notes app running at http://localhost:${PORT}`);
  console.log(`Notes directory: ${NOTES_DIR}`);
});
