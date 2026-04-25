import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import {
  Ship, ArrowLeft, BookOpen, Trash2, Edit3, Check, X,
  Search, Users, Shield, Upload, FileText, RefreshCw, Eye, Save
} from 'lucide-react';

const ADMIN_EMAIL = 'aloksrius@yahoo.com';

// ── Extraction preview card ────────────────────────────────
function ExtractedEntryCard({ entry, index, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ ...entry });

  function save() { onUpdate(index, draft); setEditing(false); }

  return (
    <div style={{
      background: 'var(--white)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--gold)', borderRadius: '0 8px 8px 0',
      padding: '14px 18px', marginBottom: 10
    }}>
      {editing ? (
        <div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Topic</label>
            <input className="form-input" value={draft.topic}
              onChange={e => setDraft(p => ({ ...p, topic: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 10 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Knowledge Entry</label>
            <textarea className="form-textarea" rows={3} value={draft.text}
              onChange={e => setDraft(p => ({ ...p, text: e.target.value }))} />
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label" style={{ fontSize: 11 }}>Suggested Amendment (optional)</label>
            <textarea className="form-textarea" rows={2} value={draft.suggestedAmendment || ''}
              onChange={e => setDraft(p => ({ ...p, suggestedAmendment: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={save}><Check size={13} /> Save</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}><X size={13} /> Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--gold)',
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5
              }}>{entry.topic}</div>
              <p style={{ fontSize: 14, color: '#2c2c3e', lineHeight: 1.7, marginBottom: entry.suggestedAmendment ? 8 : 0 }}>
                {entry.text}
              </p>
              {entry.suggestedAmendment && (
                <div style={{
                  background: '#f0f7ff', border: '1px dashed #aed6f1',
                  padding: '7px 11px', borderRadius: 4, fontSize: 13,
                  color: '#1a3a5c', fontStyle: 'italic', marginTop: 6
                }}>
                  <strong style={{ fontStyle: 'normal' }}>Suggested: </strong>{entry.suggestedAmendment}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }} onClick={() => setEditing(true)}>
                <Edit3 size={13} />
              </button>
              <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: 'var(--accent)' }} onClick={() => onRemove(index)}>
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  // Upload flow state
  const [uploadMode, setUploadMode] = useState(false); // show upload panel
  const [uploadFile, setUploadFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extractedEntries, setExtractedEntries] = useState([]);
  const [previewMode, setPreviewMode] = useState(false); // show preview
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    loadEntries();
  }, []);

  async function loadEntries() {
    setLoading(true);
    try {
      const q = query(collection(db, 'knowledge'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const snap = await getDocs(collection(db, 'knowledge'));
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch { toast.error('Could not load knowledge base'); }
    } finally { setLoading(false); }
  }

  // ── Read uploaded file ──
  async function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      if (file.type === 'application/pdf' ||
          file.name.endsWith('.docx') || file.name.endsWith('.doc')) {
        // For binary files, convert to base64
        reader.onload = () => resolve({ type: 'base64', data: reader.result.split(',')[1], mimeType: file.type || 'application/octet-stream' });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else {
        // Plain text / markdown
        reader.onload = () => resolve({ type: 'text', data: reader.result });
        reader.onerror = reject;
        reader.readAsText(file);
      }
    });
  }

  // ── Extract knowledge via GeoAI ──
  async function extractKnowledge() {
    if (!uploadFile) return toast.error('Please select a file first');
    setExtracting(true);
    toast.loading('GeoAI is reading your document...', { id: 'extract' });

    try {
      const fileData = await readFile(uploadFile);

      const systemPrompt = `You are GeoAI, an expert maritime charterparty analyst. 
You are reading an experience document written by a senior maritime professional.
Extract ALL knowledge entries from this document as structured JSON.

The document may have:
- Section headers (matching CP clause topics like "Cargo Exclusions", "Hire", "Trading", etc.)
- Bullet points of lessons learned, preferred positions, red flags
- Mixed free text paragraphs

For each distinct piece of knowledge/experience, create one entry.
Group under the nearest section header as the topic.
If no clear header, infer a topic from the content.

Return ONLY a valid JSON array (no markdown, no preamble):
[
  {
    "topic": "Cargo Exclusions — Coal",
    "text": "The knowledge/experience point as a clear statement",
    "suggestedAmendment": "Specific wording to add/change in CP if applicable, otherwise empty string"
  }
]

Be thorough — extract every piece of knowledge, even if it seems minor. Minimum 1 entry per bullet point.`;

      let messageContent;
      if (fileData.type === 'base64') {
        const mimeType = uploadFile.name.endsWith('.docx') || uploadFile.name.endsWith('.doc')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : fileData.mimeType;
        messageContent = [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileData.data } },
          { type: 'text', text: 'Extract all knowledge entries from this experience document as instructed. Return only the JSON array.' }
        ];
      } else {
        messageContent = [
          { type: 'text', text: `Experience document content:\n\n${fileData.data}\n\nExtract all knowledge entries as instructed. Return only the JSON array.` }
        ];
      }

      const response = await fetch('/api/anthropic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 8000,
          system: systemPrompt,
          messages: [{ role: 'user', content: messageContent }]
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const raw = data.content?.[0]?.text || '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const extracted = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

      setExtractedEntries(extracted);
      setPreviewMode(true);
      toast.success(`${extracted.length} knowledge entries extracted — review before saving`, { id: 'extract' });
    } catch (e) {
      console.error(e);
      toast.error(`Extraction failed: ${e.message}`, { id: 'extract' });
    } finally { setExtracting(false); }
  }

  // ── Save approved entries to Firestore ──
  async function saveToKnowledgeBase() {
    if (extractedEntries.length === 0) return toast.error('No entries to save');
    setSaving(true);
    try {
      const batch = writeBatch(db);
      extractedEntries.forEach(entry => {
        const ref = doc(collection(db, 'knowledge'));
        batch.set(ref, {
          topic: entry.topic,
          text: entry.text,
          suggestedAmendment: entry.suggestedAmendment || '',
          source: 'admin-document',
          createdAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast.success(`${extractedEntries.length} entries saved to Knowledge Base!`);
      setPreviewMode(false);
      setUploadMode(false);
      setUploadFile(null);
      setExtractedEntries([]);
      await loadEntries();
    } catch (e) {
      toast.error('Failed to save entries');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteDoc(doc(db, 'knowledge', id));
      setEntries(p => p.filter(e => e.id !== id));
      toast.success('Deleted');
    } catch { toast.error('Delete failed'); }
  }

  async function handleSaveEdit(id) {
    try {
      await updateDoc(doc(db, 'knowledge', id), {
        topic: editDraft.topic,
        text: editDraft.text,
        suggestedAmendment: editDraft.suggestedAmendment || ''
      });
      setEntries(p => p.map(e => e.id === id ? { ...e, ...editDraft } : e));
      setEditingId(null);
      toast.success('Updated');
    } catch { toast.error('Update failed'); }
  }

  function updateExtracted(index, updated) {
    setExtractedEntries(p => p.map((e, i) => i === index ? updated : e));
  }

  function removeExtracted(index) {
    setExtractedEntries(p => p.filter((_, i) => i !== index));
  }

  const filtered = entries.filter(e =>
    e.topic?.toLowerCase().includes(search.toLowerCase()) ||
    e.text?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, entry) => {
    const key = entry.topic?.split('—')[0]?.split('-')[0]?.trim() || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--navy)', borderBottom: '3px solid var(--gold)',
        padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => navigate(-1)}>
          <ArrowLeft size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ship size={18} color="#0f1923" />
          </div>
          <div>
            <div style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 700, color: 'white' }}>GEOSERVE</div>
            <div style={{ fontSize: 10, color: 'var(--gold)', letterSpacing: 2, textTransform: 'uppercase' }}>Knowledge Base</div>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: 20, padding: '4px 12px'
            }}>
              <Shield size={13} color="var(--gold)" />
              <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Admin</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => { setUploadMode(true); setPreviewMode(false); }}>
              <Upload size={14} /> Upload Experience Doc
            </button>
          </div>
        )}
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 32px' }}>

        {/* ── UPLOAD PANEL (Admin only) ── */}
        {isAdmin && uploadMode && !previewMode && (
          <div style={{
            background: 'var(--navy)', borderRadius: 12, padding: '32px 36px',
            marginBottom: 40, border: '1px solid rgba(201,168,76,0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Upload size={20} color="var(--gold)" />
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: 20, color: 'white' }}>Upload Experience Document</h3>
              </div>
              <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.5)' }}
                onClick={() => { setUploadMode(false); setUploadFile(null); }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginBottom: 24, lineHeight: 1.8 }}>
              Upload your experience document in Word, PDF, or text format. GeoAI will read it, extract all knowledge entries, and show you a preview to review before saving.
            </p>

            {/* Format guide */}
            <div style={{
              background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)',
              borderRadius: 8, padding: '14px 18px', marginBottom: 24
            }}>
              <div style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Recommended Format
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.9 }}>
                <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Cargo Exclusions</strong><br />
                • Coal should always be verified not excluded before fixing<br />
                • Petcoke surcharge should not exceed USD 8,000 lumpsum<br /><br />
                <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Hire Payment</strong><br />
                • Always insist on minimum 3 banking days grace period<br />
                • Anti-technicality clause must be included
              </div>
            </div>

            {/* File drop area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${uploadFile ? 'var(--green)' : 'rgba(201,168,76,0.4)'}`,
                borderRadius: 10, padding: '36px', textAlign: 'center',
                cursor: 'pointer', transition: 'all 0.2s',
                background: uploadFile ? 'rgba(30,126,74,0.08)' : 'rgba(255,255,255,0.03)'
              }}>
              <input
                ref={fileInputRef} type="file"
                accept=".docx,.doc,.pdf,.txt,.md"
                style={{ display: 'none' }}
                onChange={e => setUploadFile(e.target.files[0])}
              />
              {uploadFile ? (
                <>
                  <CheckCircle size={36} color="var(--green)" style={{ marginBottom: 10 }} />
                  <div style={{ color: 'white', fontWeight: 600, marginBottom: 4 }}>{uploadFile.name}</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                    {(uploadFile.size / 1024).toFixed(0)} KB · Click to change
                  </div>
                </>
              ) : (
                <>
                  <FileText size={36} color="rgba(201,168,76,0.5)" style={{ marginBottom: 10 }} />
                  <div style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginBottom: 4 }}>
                    Click to select your experience document
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                    Word (.docx), PDF, or Text file
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-primary btn-lg" disabled={!uploadFile || extracting} onClick={extractKnowledge}>
                {extracting
                  ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Extracting…</>
                  : <><Eye size={16} /> Extract & Preview</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── PREVIEW MODE ── */}
        {isAdmin && previewMode && (
          <div style={{ marginBottom: 40 }}>
            <div style={{
              background: 'var(--navy)', borderRadius: '12px 12px 0 0',
              padding: '20px 28px', border: '1px solid rgba(201,168,76,0.3)',
              borderBottom: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Eye size={18} color="var(--gold)" />
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: 18, color: 'white' }}>
                  Review Extracted Entries
                </h3>
                <span style={{
                  background: 'rgba(201,168,76,0.2)', color: 'var(--gold)',
                  padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 700
                }}>{extractedEntries.length} entries</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onClick={() => { setPreviewMode(false); setExtractedEntries([]); }}>
                  <X size={14} /> Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveToKnowledgeBase} disabled={saving || extractedEntries.length === 0}>
                  {saving
                    ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
                    : <><Save size={14} /> Save All {extractedEntries.length} Entries</>
                  }
                </button>
              </div>
            </div>

            <div style={{
              background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
              borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '20px 28px'
            }}>
              <p style={{ fontSize: 13, color: 'var(--mid)', marginBottom: 20, fontStyle: 'italic' }}>
                Review each entry below. You can edit or delete any entry before saving to the Knowledge Base. These will be used in all future GeoAI reviews.
              </p>
              {extractedEntries.map((entry, i) => (
                <ExtractedEntryCard key={i} entry={entry} index={i}
                  onUpdate={updateExtracted} onRemove={removeExtracted} />
              ))}
              {extractedEntries.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--mid)' }}>
                  All entries removed. Cancel or go back to re-extract.
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <button className="btn btn-primary btn-lg" onClick={saveToKnowledgeBase} disabled={saving || extractedEntries.length === 0}>
                  {saving
                    ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Saving…</>
                    : <><Save size={16} /> Save All {extractedEntries.length} Entries to Knowledge Base</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── KNOWLEDGE BASE HEADER ── */}
        {!previewMode && (
          <>
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <BookOpen size={28} color="var(--gold)" />
                <h1 style={{ fontSize: 30 }}>Community Knowledge Base</h1>
              </div>
              <p style={{ color: 'var(--mid)', fontSize: 15, maxWidth: 620 }}>
                Accumulated experience automatically injected into every GeoAI review.
              </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 36 }}>
              {[
                { icon: BookOpen, label: 'Total Entries', value: entries.length, color: 'var(--gold)' },
                { icon: Users, label: 'Topics Covered', value: Object.keys(grouped).length, color: 'var(--blue)' },
                { icon: Check, label: 'Auto-injected', value: 'All Reviews', color: 'var(--green)' }
              ].map(s => (
                <div key={s.label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <s.icon size={24} color={s.color} />
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Playfair Display', color: s.color }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--mid)' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--mid)' }} />
                <input className="form-input" style={{ paddingLeft: 42, fontSize: 15 }}
                  placeholder="Search knowledge base…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <button className="btn btn-outline btn-sm" onClick={loadEntries}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Entries */}
            {loading ? (
              <div className="flex-center" style={{ height: 200 }}>
                <div className="spinner" style={{ width: 36, height: 36 }} />
              </div>
            ) : entries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 40px', border: '2px dashed var(--border)', borderRadius: 12 }}>
                <BookOpen size={48} color="var(--border)" style={{ marginBottom: 16 }} />
                <h3 style={{ fontFamily: 'Playfair Display', fontSize: 22, marginBottom: 8 }}>Knowledge Base is Empty</h3>
                <p style={{ color: 'var(--mid)', marginBottom: 24 }}>
                  {isAdmin
                    ? 'Upload your experience document to get started.'
                    : 'The admin will add experience entries shortly.'}
                </p>
                {isAdmin && (
                  <button className="btn btn-primary" onClick={() => setUploadMode(true)}>
                    <Upload size={16} /> Upload Experience Document
                  </button>
                )}
              </div>
            ) : (
              Object.entries(grouped).map(([topic, topicEntries]) => (
                <div key={topic} style={{ marginBottom: 28 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                    paddingBottom: 8, borderBottom: '2px solid var(--border)'
                  }}>
                    <div style={{ width: 8, height: 8, background: 'var(--gold)', borderRadius: '50%', flexShrink: 0 }} />
                    <h3 style={{ fontFamily: 'Playfair Display', fontSize: 17 }}>{topic}</h3>
                    <span style={{ fontSize: 12, color: 'var(--mid)', marginLeft: 'auto' }}>
                      {topicEntries.length} {topicEntries.length === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>

                  {topicEntries.map(entry => (
                    <div key={entry.id} style={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: 8, padding: '16px 20px', marginBottom: 10,
                      borderLeft: `3px solid ${entry.source === 'admin-document' ? 'var(--gold)' : '#7d3c98'}`
                    }}>
                      {editingId === entry.id ? (
                        <div>
                          <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Topic</label>
                            <input className="form-input" value={editDraft.topic || ''}
                              onChange={e => setEditDraft(p => ({ ...p, topic: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 10 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Comment</label>
                            <textarea className="form-textarea" rows={3} value={editDraft.text || ''}
                              onChange={e => setEditDraft(p => ({ ...p, text: e.target.value }))} />
                          </div>
                          <div className="form-group" style={{ marginBottom: 12 }}>
                            <label className="form-label" style={{ fontSize: 11 }}>Suggested Amendment</label>
                            <textarea className="form-textarea" rows={2} value={editDraft.suggestedAmendment || ''}
                              onChange={e => setEditDraft(p => ({ ...p, suggestedAmendment: e.target.value }))} />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(entry.id)}>
                              <Check size={13} /> Save
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>
                              <X size={13} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <p style={{ fontSize: 14, color: '#2c2c3e', flex: 1, lineHeight: 1.7 }}>{entry.text}</p>
                            {isAdmin && (
                              <div style={{ display: 'flex', gap: 4, marginLeft: 12, flexShrink: 0 }}>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px' }}
                                  onClick={() => { setEditingId(entry.id); setEditDraft(entry); }}>
                                  <Edit3 size={13} />
                                </button>
                                <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', color: 'var(--accent)' }}
                                  onClick={() => handleDelete(entry.id)}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                          {entry.suggestedAmendment && (
                            <div style={{
                              marginTop: 10, background: '#f0f7ff', border: '1px dashed #aed6f1',
                              padding: '8px 12px', borderRadius: 4, fontSize: 13, color: '#1a3a5c', fontStyle: 'italic'
                            }}>
                              <strong style={{ fontStyle: 'normal' }}>Suggested: </strong>{entry.suggestedAmendment}
                            </div>
                          )}
                          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--mid)' }}>
                            {entry.createdAt?.toDate
                              ? entry.createdAt.toDate().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                              : 'Recently added'}
                            {' · '}
                            <span style={{ color: entry.source === 'admin-document' ? 'var(--gold)' : '#7d3c98' }}>
                              {entry.source === 'admin-document' ? '⚡ Admin document' : 'Anonymous contribution'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}

// missing import fix
function CheckCircle({ size, color, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
