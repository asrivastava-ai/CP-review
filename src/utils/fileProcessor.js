// ============================================================
// GEOSERVE File Processor
// Handles PDF and Word files with proper strikethrough detection
// ============================================================

/**
 * Process a Word (.docx) file:
 * - Extracts HTML using mammoth
 * - Finds all struck-through text
 * - Replaces with [DELETED: text] markers
 * - Returns clean text for GeoAI
 */
export async function processWordFile(file) {
  const mammoth = await import('mammoth');
  
  const arrayBuffer = await file.arrayBuffer();
  
  // Convert to HTML — mammoth preserves strikethrough as <s> tags
  const mammothLib = mammoth.default || mammoth;
  const result = await mammothLib.convertToHtml(
    { arrayBuffer: arrayBuffer },
    {
      styleMap: [
        "strike => s",
        "s => s"
      ]
    }
  );
  
  let html = result.value;
  
  // Replace struck-through text with [DELETED: ...] markers
  // This handles <s>, <del>, and <strike> tags
  html = html.replace(/<s>([\s\S]*?)<\/s>/gi, (match, content) => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    return plainText ? `[DELETED: ${plainText}]` : '';
  });
  
  html = html.replace(/<del>([\s\S]*?)<\/del>/gi, (match, content) => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    return plainText ? `[DELETED: ${plainText}]` : '';
  });
  
  html = html.replace(/<strike>([\s\S]*?)<\/strike>/gi, (match, content) => {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    return plainText ? `[DELETED: ${plainText}]` : '';
  });
  
  // Convert remaining HTML to plain text
  const plainText = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  return {
    type: 'text',
    content: plainText,
    fileName: file.name,
    deletedCount: (plainText.match(/\[DELETED:/g) || []).length
  };
}

/**
 * Process a PDF file:
 * - Converts to base64
 * - Returns for direct sending to Claude API
 */
export async function processPdfFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      type: 'pdf',
      content: reader.result.split(',')[1], // base64
      fileName: file.name,
      deletedCount: null // unknown for PDF — Claude detects visually
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Main file processor — detects file type and routes accordingly
 */
export async function processFile(file) {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.pdf')) {
    return processPdfFile(file);
  } else if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return processWordFile(file);
  } else {
    throw new Error('Unsupported file type. Please upload PDF or Word (.docx) files.');
  }
}

/**
 * Build the message content array for Claude API
 * Handles single file or two files (base CP + rider)
 */
export function buildMessageContent(file1Data, file2Data, party, charterType, cargo, specificInstructions) {
  const content = [];
  
  // File 1 — Base CP
  if (file1Data.type === 'pdf') {
    content.push({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: file1Data.content }
    });
  } else {
    content.push({
      type: 'text',
      text: `=== BASE CHARTERPARTY (${file1Data.fileName}) ===\n\n${file1Data.content}`
    });
  }
  
  // File 2 — Rider clauses (optional)
  if (file2Data) {
    if (file2Data.type === 'pdf') {
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: file2Data.content }
      });
    } else {
      content.push({
        type: 'text',
        text: `=== RIDER CLAUSES (${file2Data.fileName}) ===\n\n${file2Data.content}`
      });
    }
  }
  
  // Final instruction
  const instruction = `Review this charterparty as ${party.toUpperCase()} for a ${charterType === 'period' ? 'Period TC' : 'Trip TC'}${cargo ? ` with intended cargo: ${cargo}` : ''}${file2Data ? '. The second document contains the rider clauses — treat both documents together as one complete charterparty.' : ''}${specificInstructions ? `. Pay special attention to: ${specificInstructions}` : ''}. Return only the JSON array.`;
  
  content.push({ type: 'text', text: instruction });
  
  return content;
}
