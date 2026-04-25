const WordExtractor = require('word-extractor');
const mammoth = require('mammoth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  try {
    const { fileBase64, fileName } = req.body;
    if (!fileBase64) return res.status(400).json({ error: 'No file data' });

    const buffer = Buffer.from(fileBase64, 'base64');
    const isLegacyDoc = (fileName || '').toLowerCase().match(/\.doc$/) && !(fileName || '').toLowerCase().match(/\.docx$/);

    let plainText = '';
    let deletedCount = 0;

    if (isLegacyDoc) {
      // Use word-extractor for legacy .doc files
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      plainText = extracted.getBody()
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } else {
      // Use mammoth for .docx files
      const result = await mammoth.convertToHtml(
        { buffer },
        { styleMap: ["strike => s", "s => s"] }
      );
      let html = result.value;
      html = html.replace(/<s>([\s\S]*?)<\/s>/gi, (_, c) => {
        const t = c.replace(/<[^>]*>/g, '').trim();
        return t ? `[DELETED: ${t}]` : '';
      });
      plainText = html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n').trim();
      deletedCount = (plainText.match(/\[DELETED:/g) || []).length;
    }

    res.json({ text: plainText, deletedCount });

  } catch (err) {
    console.error('convert-doc error:', err);
    res.status(500).json({ error: err.message || 'Conversion failed' });
  }
};
