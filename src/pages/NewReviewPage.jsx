import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { Ship, Upload, ArrowRight, ArrowLeft, CheckCircle, ChevronDown, BookOpen, AlertTriangle, FileText, X, Plus } from 'lucide-react';
import { processFile, buildMessageContent } from '../utils/fileProcessor';

const COMMON_CARGOES = [
  'Iron Ore','Coal','Grain (Wheat/Corn/Soya)','Bauxite','Fertilizers',
  'Steel Products','Clinker','Limestone','Manganese Ore','Sugar',
  'Soda Ash','Logs','Scrap','Salt','Petcoke','Sulphur','Other'
];

const ACCEPTED_FILES = { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'application/msword': ['.doc'] };

function Steps({ current }) {
  const steps = ['Upload CP', 'Your Position', 'Charter Type', 'Specific Focus', 'Review'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 48 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: i < current ? 'var(--green)' : i === current ? 'var(--gold)' : 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
            }}>
              {i < current ? <CheckCircle size={16} color="white" /> : <span style={{ fontSize: 12, fontWeight: 700, color: i === current ? 'var(--ink)' : 'var(--mid)' }}>{i + 1}</span>}
            </div>
            <span style={{ fontSize: 11, color: i === current ? 'var(--ink)' : 'var(--mid)', fontWeight: i === current ? 600 : 400, whiteSpace: 'nowrap' }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? 'var(--green)' : 'var(--border)', margin: '0 6px', marginBottom: 22, transition: 'all 0.3s' }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function RadioCard({ selected, onClick, icon, title, desc, warning }) {
  return (
    <div onClick={onClick} style={{
      border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`,
      borderRadius: 10, padding: '20px 24px', cursor: 'pointer',
      background: selected ? 'rgba(201,168,76,0.06)' : 'var(--white)',
      transition: 'all 0.2s', display: 'flex', gap: 16, alignItems: 'flex-start'
    }}>
      <div style={{ width: 42, height: 42, background: selected ? 'var(--gold)' : 'var(--border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, color: selected ? 'var(--ink)' : 'var(--mid)' }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--mid)', lineHeight: 1.6 }}>{desc}</div>
        {warning && selected && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--amber-light)', border: '1px solid #f8c471', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--amber)' }}>
            <AlertTriangle size={12} /> {warning}
          </div>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? 'var(--gold)' : 'var(--border)'}`, background: selected ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {selected && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ink)' }} />}
        </div>
      </div>
    </div>
  );
}

// File upload box component
function FileUploadBox({ label, file, onDrop, onRemove, required }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: files => onDrop(files[0]),
    accept: ACCEPTED_FILES,
    maxFiles: 1
  });

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <label className="form-label" style={{ margin: 0 }}>{label} {required ? '' : <span style={{ color: 'var(--mid)', fontSize: 11, fontWeight: 400 }}>(optional)</span>}</label>
        {file && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}><X size={13} /> Remove</button>}
      </div>
      {file ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
          background: 'rgba(30,126,74,0.06)', border: '1.5px solid var(--green)',
          borderRadius: 8
        }}>
          <FileText size={20} color="var(--green)" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)' }}>{file.name}</div>
            <div style={{ fontSize: 12, color: 'var(--mid)' }}>{(file.size / 1024).toFixed(0)} KB · {file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Word'}</div>
          </div>
          <CheckCircle size={18} color="var(--green)" style={{ marginLeft: 'auto' }} />
        </div>
      ) : (
        <div {...getRootProps()} style={{
          border: `2px dashed ${isDragActive ? 'var(--gold)' : 'var(--border)'}`,
          borderRadius: 8, padding: '20px', textAlign: 'center',
          background: isDragActive ? 'rgba(201,168,76,0.05)' : 'var(--white)',
          cursor: 'pointer', transition: 'all 0.2s'
        }}>
          <input {...getInputProps()} />
          <Upload size={24} color={isDragActive ? 'var(--gold)' : 'var(--border)'} style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: 'var(--mid)', margin: 0 }}>
            {isDragActive ? 'Drop here…' : 'Drag & drop or click to browse'}
          </p>
          <p style={{ fontSize: 11, color: 'var(--mid)', marginTop: 4 }}>PDF or Word (.docx)</p>
        </div>
      )}
    </div>
  );
}

export default function NewReviewPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [file1, setFile1] = useState(null); // Base CP
  const [file2, setFile2] = useState(null); // Rider (optional)
  const [showFile2, setShowFile2] = useState(false);
  const [form, setForm] = useState({
    party: '', charterType: '', cpType: '',
    intendedCargo: '', customCargo: '',
    vesselName: '', cpDate: '', specificInstructions: ''
  });

  async function generateComments() {
    const party = form.party;
    const charterType = form.charterType;
    const cpType = form.cpType;
    const cargo = form.intendedCargo === 'Other' ? form.customCargo : form.intendedCargo;
    const isNegotiated = cpType === 'negotiated';

    // Fetch knowledge base
    let knowledgeContext = '';
    try {
      const kSnap = await getDocs(collection(db, 'knowledge'));
      const entries = kSnap.docs.map(d => d.data());
      if (entries.length > 0) {
        knowledgeContext = `\n\nCOMMUNITY KNOWLEDGE BASE (incorporate these insights where relevant):\n` +
          entries.map(e => `- [${e.topic}]: ${e.text}${e.suggestedAmendment ? ` | Suggested: ${e.suggestedAmendment}` : ''}`).join('\n');
      }
    } catch (e) { console.warn('Knowledge base fetch failed:', e); }

    // Process files
    toast.loading('Processing documents...', { id: 'process' });
    let file1Data, file2Data;
    try {
      file1Data = await processFile(file1);
      if (file2) file2Data = await processFile(file2);
      
      // Show deletion count for Word files
      if (file1Data.deletedCount > 0 || (file2Data?.deletedCount > 0)) {
        const count = (file1Data.deletedCount || 0) + (file2Data?.deletedCount || 0);
        toast.success(`${count} struck-through section${count !== 1 ? 's' : ''} detected and marked`, { id: 'process' });
      } else {
        toast.dismiss('process');
      }
    } catch (e) {
      toast.error(e.message, { id: 'process' });
      setStep(3);
      return;
    }

    const systemPrompt = `You are GeoAI, a senior maritime lawyer and charterparty expert built into the GEOSERVE platform. You are reviewing a charterparty on behalf of the ${party.toUpperCase()}.

Charter type: ${charterType === 'period' ? 'PERIOD TIME CHARTER (detailed full review required)' : `TRIP TIME CHARTER (focused review - check cargo "${cargo}" against exclusions)`}.

Document type: ${isNegotiated ? 'NEGOTIATED CP — This document has been through negotiation.' : 'CLEAN CP — Standard unamended charterparty.'}

${file2Data ? 'NOTE: Two documents provided — Base CP and Rider Clauses. Treat both together as one complete charterparty.' : ''}

${isNegotiated ? `NEGOTIATED CP INSTRUCTIONS:
- Any clause marked as "Deleted", "Intentionally Deleted", "N/A" or similar — IGNORE completely, do not comment on it.
- For Word documents: text marked as [DELETED: ...] has been identified as struck-through in the original — treat as deleted and IGNORE completely.
- For PDF documents: look carefully at visual appearance. Any text with a horizontal line through it (strikethrough) must be treated as deleted and ignored.
- If uncertain whether PDF text is struck through, add a NOTE: "⚠ POSSIBLE DELETION — verify if this text is struck through in the original document."
- Where you see CONTRADICTORY clauses (same topic, different terms), flag as HIGH RISK: "⚠ CONTRADICTION DETECTED — Clause X conflicts with Clause Y. Clarify which prevails before signing."
- Where you see DUPLICATE clauses, flag as MEDIUM risk noting which version should prevail.
- Note any important protections that have been deleted and suggest alternatives.` : ''}

${charterType === 'trip' ? `IMPORTANT: Specifically check if "${cargo}" appears in the cargo exclusion list. If excluded, flag as HIGH RISK immediately.` : ''}

${form.specificInstructions ? `\nUSER SPECIFIC INSTRUCTIONS:\n${form.specificInstructions}` : ''}

For PERIOD TC focus on: trading exclusions, cargo exclusions, protective clauses, hire payment, off-hire, performance warranties, redelivery, NAABSA, dirty cargo surcharges, speed/consumption warranties.
For TRIP TC focus on: cargo acceptance, trading route, hire, key commercial clauses.
${knowledgeContext}

Return ONLY a valid JSON array (no markdown, no preamble):
[{"clauseRef":"Cl. 35","clauseTitle":"Trading & Cargo Exclusions","risk":"high","comments":[{"type":"critical","label":"Short label","text":"Detailed comment","suggested":"Suggested amendment","source":"geoai"}]}]
risk: "high"|"medium"|"low"|"info". type: "critical"|"concern"|"ok"|"note". Minimum 15 clauses.`;

    try {
      const messageContent = buildMessageContent(file1Data, file2Data, party, charterType, cargo, form.specificInstructions);
      
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
      if (data.error) throw new Error(data.error.message || 'API error');

      const raw = data.content?.[0]?.text || '[]';
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      const comments = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

      const docRef = await addDoc(collection(db, 'reviews'), {
        userId: currentUser.uid,
        vesselName: form.vesselName,
        cpDate: form.cpDate,
        party: form.party,
        charterType: form.charterType,
        cpType: form.cpType,
        intendedCargo: cargo,
        specificInstructions: form.specificInstructions,
        fileName: file1.name,
        file2Name: file2 ? file2.name : null,
        pdfUrl: '',
        comments,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast.success('Review generated!');
      navigate(`/review/${docRef.id}`);
    } catch (e) {
      console.error(e);
      toast.error(`Failed: ${e.message || 'Check API key and try again'}`);
      setStep(3);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <header style={{ background: 'var(--navy)', borderBottom: '3px solid var(--gold)', padding: '0 40px', height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-ghost" style={{ color: 'rgba(255,255,255,0.6)' }} onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--gold)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ship size={18} color="#0f1923" /></div>
          <span style={{ fontFamily: 'Playfair Display', fontSize: 16, fontWeight: 700, color: 'white' }}>GEOSERVE — New CP Review</span>
        </div>
      </header>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '52px 24px' }}>
        <Steps current={step} />

        {/* STEP 0: Upload */}
        {step === 0 && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, marginBottom: 8 }}>Upload Charterparty</h2>
            <p style={{ color: 'var(--mid)', marginBottom: 24 }}>Upload PDF or Word files. Strikethrough text in Word files is automatically detected and marked as deleted.</p>

            <FileUploadBox label="Base Charterparty" file={file1} required
              onDrop={f => { setFile1(f); const n = f.name.replace(/[_-]/g, ' ').replace(/\.(pdf|docx|doc)$/i, '').trim(); setForm(p => ({ ...p, vesselName: n })); }}
              onRemove={() => setFile1(null)} />

            {!showFile2 ? (
              <button className="btn btn-outline btn-sm" onClick={() => setShowFile2(true)} style={{ marginBottom: 16 }}>
                <Plus size={14} /> Add Rider Clauses (optional)
              </button>
            ) : (
              <FileUploadBox label="Rider Clauses" file={file2}
                onDrop={f => setFile2(f)}
                onRemove={() => { setFile2(null); setShowFile2(false); }} />
            )}

            {file1 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
                <div className="form-group">
                  <label className="form-label">Vessel Name</label>
                  <input className="form-input" value={form.vesselName} onChange={e => setForm(p => ({ ...p, vesselName: e.target.value }))} placeholder="MV Example" />
                </div>
                <div className="form-group">
                  <label className="form-label">CP Date</label>
                  <input className="form-input" value={form.cpDate} onChange={e => setForm(p => ({ ...p, cpDate: e.target.value }))} placeholder="e.g. 30 August 2021" />
                </div>
              </div>
            )}

            {file1 && (
              <div style={{ marginTop: 8 }}>
                <label className="form-label" style={{ marginBottom: 12, display: 'block' }}>Document Type</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <RadioCard selected={form.cpType === 'clean'} onClick={() => setForm(p => ({ ...p, cpType: 'clean' }))}
                    icon="📄" title="Clean CP" desc="Standard unamended charterparty. No strikethroughs or deletions." />
                  <RadioCard selected={form.cpType === 'negotiated'} onClick={() => setForm(p => ({ ...p, cpType: 'negotiated' }))}
                    icon="✏️" title="Negotiated CP"
                    desc="CP has been through negotiation — contains deleted clauses, strikethroughs or tracked changes."
                    warning="Word files: strikethrough auto-detected. PDF files: GeoAI detects visually." />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 32 }}>
              <button className="btn btn-primary btn-lg" disabled={!file1 || !form.cpType} onClick={() => setStep(1)}>
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: Party */}
        {step === 1 && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, marginBottom: 8 }}>Your Position</h2>
            <p style={{ color: 'var(--mid)', marginBottom: 32 }}>Which party are you reviewing this CP for?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <RadioCard selected={form.party === 'charterers'} onClick={() => setForm(p => ({ ...p, party: 'charterers' }))}
                icon="📋" title="Charterers" desc="Review from Charterers' perspective — protecting trading rights, cargo flexibility, hire deductions, off-hire triggers." />
              <RadioCard selected={form.party === 'owners'} onClick={() => setForm(p => ({ ...p, party: 'owners' }))}
                icon="⚓" title="Owners" desc="Review from Owners' perspective — protecting hire continuity, vessel employment, maintenance rights, redelivery conditions." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <button className="btn btn-outline" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary btn-lg" disabled={!form.party} onClick={() => setStep(2)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 2: Charter Type */}
        {step === 2 && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, marginBottom: 8 }}>Charter Type</h2>
            <p style={{ color: 'var(--mid)', marginBottom: 32 }}>The depth of analysis varies between a single voyage and a period charter.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <RadioCard selected={form.charterType === 'trip'} onClick={() => setForm(p => ({ ...p, charterType: 'trip' }))}
                icon="🚢" title="Trip / Voyage TC" desc="Single voyage review. Focused check — cargo acceptance, trading route, key commercial clauses." />
              <RadioCard selected={form.charterType === 'period'} onClick={() => setForm(p => ({ ...p, charterType: 'period' }))}
                icon="📅" title="Period Time Charter" desc="Full detailed review — trading exclusions, cargo exclusions, protective clauses, performance warranties, hire, off-hire, redelivery." />
            </div>
            {form.charterType === 'trip' && (
              <div style={{ marginTop: 28 }}>
                <div className="form-group">
                  <label className="form-label">Intended Cargo</label>
                  <p className="form-hint" style={{ marginBottom: 8 }}>We'll check this cargo against the CP's exclusion list.</p>
                  <div style={{ position: 'relative' }}>
                    <select className="form-select" value={form.intendedCargo} onChange={e => setForm(p => ({ ...p, intendedCargo: e.target.value }))}>
                      <option value="">Select cargo…</option>
                      {COMMON_CARGOES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--mid)' }} />
                  </div>
                </div>
                {form.intendedCargo === 'Other' && (
                  <div className="form-group">
                    <label className="form-label">Specify Cargo</label>
                    <input className="form-input" placeholder="e.g. Nickel Ore, Fly Ash…" value={form.customCargo} onChange={e => setForm(p => ({ ...p, customCargo: e.target.value }))} />
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40 }}>
              <button className="btn btn-outline" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary btn-lg"
                disabled={!form.charterType || (form.charterType === 'trip' && !form.intendedCargo) || (form.intendedCargo === 'Other' && !form.customCargo)}
                onClick={() => setStep(3)}>Continue <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 3: Specific Instructions */}
        {step === 3 && (
          <div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, marginBottom: 8 }}>Specific Focus</h2>
            <p style={{ color: 'var(--mid)', marginBottom: 12 }}>Tell GeoAI anything specific to check. Optional but improves the review.</p>
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Examples</div>
              {['Check if coal is excluded from cargo list', 'Vessel will trade Pakistan — check if allowed', 'Focus on NAABSA provisions and limits', 'Check hire payment grace period and withdrawal rights', 'Verify speed/consumption warranty is guaranteed'].map(ex => (
                <div key={ex} onClick={() => setForm(p => ({ ...p, specificInstructions: p.specificInstructions ? p.specificInstructions + '\n' + ex : ex }))}
                  style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer', padding: '3px 0', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>+ {ex}</div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--mid)', marginTop: 8, fontStyle: 'italic' }}>Click any example to add it</div>
            </div>
            <div className="form-group">
              <label className="form-label">Your specific instructions</label>
              <textarea className="form-textarea" rows={6} placeholder="e.g. Check if vessel can trade India west coast..."
                value={form.specificInstructions} onChange={e => setForm(p => ({ ...p, specificInstructions: e.target.value }))} style={{ fontSize: 14 }} />
              <p className="form-hint">Leave blank to skip</p>
            </div>
            {form.cpType === 'negotiated' && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#fef5e7', border: '1px solid #f8c471', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <AlertTriangle size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--amber)' }}>
                  <strong>Negotiated CP mode active.</strong> Word strikethroughs auto-detected. PDF strikethroughs detected visually. Contradictions flagged as High Risk.
                </div>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--green-light)', border: '1px solid var(--green)', borderRadius: 8, padding: '12px 16px' }}>
              <BookOpen size={16} color="var(--green)" />
              <span style={{ fontSize: 13, color: 'var(--green)' }}><strong>Community Knowledge Base</strong> will be automatically included</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
              <button className="btn btn-outline" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => { setStep(4); generateComments(); }}>Generate Review <ArrowRight size={16} /></button>
            </div>
          </div>
        )}

        {/* STEP 4: Generating */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 32 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--gold)', animation: 'spin 1s linear infinite' }} />
              <Ship size={28} color="var(--gold)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
            </div>
            <h2 style={{ fontFamily: 'Playfair Display', fontSize: 26, marginBottom: 12 }}>Analysing Charterparty</h2>
            <p style={{ color: 'var(--mid)', maxWidth: 420, margin: '0 auto', lineHeight: 1.8 }}>
              GeoAI is reading {file2 ? 'both documents' : 'the document'}{form.cpType === 'negotiated' ? ', processing deletions, checking contradictions' : ''}, applying community knowledge, and generating precise {form.party === 'charterers' ? "Charterers'" : "Owners'"} comments.<br />
              <strong>This takes 30–60 seconds.</strong>
            </p>
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              {['Reading documents', form.cpType === 'negotiated' ? 'Processing deletions' : 'Identifying clauses', 'Checking contradictions', 'Assessing risks', 'Drafting comments', 'Saving review'].map(s => (
                <div key={s} style={{ padding: '6px 14px', borderRadius: 20, background: 'var(--border)', fontSize: 12, color: 'var(--mid)' }}>{s}</div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
