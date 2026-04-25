const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, Header, Footer
} = require('docx');

const NAVY='1B3A6B', RED='C0392B', ORANGE='D4720A', GREEN='1E7E4A', BLUE='1A5C8A', WHITE='FFFFFF', GRAY='CCCCCC';
const riskColor = r => ({high:RED,medium:ORANGE,low:GREEN,info:BLUE}[r]||NAVY);
const riskLabel = r => ({high:'HIGH RISK',medium:'MEDIUM',low:'ACCEPTABLE',info:'NOTE'}[r]||r.toUpperCase());
const typeColor = t => ({critical:RED,concern:ORANGE,ok:GREEN,note:BLUE}[t]||NAVY);
const typeLabel = t => ({critical:'CRITICAL',concern:'CONCERN',ok:'FAVOURABLE',note:'NOTE'}[t]||t.toUpperCase());

function sortClauses(clauses) {
  return [...clauses].sort((a, b) => {
    const parse = s => { const m=(s||'').match(/(\d+)/); return m?parseInt(m[1]):9999; };
    const n1=parse(a.clauseRef), n2=parse(b.clauseRef);
    if (n1!==n2) return n1-n2;
    return (a.clauseRef||'').localeCompare(b.clauseRef||'');
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');

  const review = req.body;
  if (!review) return res.status(400).end('No review data');

  const border = { style: BorderStyle.SINGLE, size: 1, color: GRAY };
  const borders = { top:border, bottom:border, left:border, right:border };
  const noBorder = { style: BorderStyle.NIL };
  const noBorders = { top:noBorder, bottom:noBorder, left:noBorder, right:noBorder };

  const sorted = sortClauses(review.comments || []);
  const children = [];
  const date = new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

  // Title
  children.push(new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:200},
    children:[new TextRun({text:'CHARTERPARTY REVIEW',font:'Arial',size:32,bold:true,color:NAVY})] }));
  children.push(new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80},
    children:[new TextRun({text:`${review.vesselName||'Vessel'}  |  CP Date: ${review.cpDate||''}`,font:'Arial',size:22,color:'555555'})] }));
  children.push(new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:0,after:80},
    children:[new TextRun({text:`Perspective: ${(review.party||'').toUpperCase()}  |  Generated: ${date}`,font:'Arial',size:20,color:'888888',italics:true})] }));
  children.push(new Paragraph({ spacing:{before:100,after:400},
    border:{bottom:{style:BorderStyle.SINGLE,size:6,color:NAVY,space:1}}, children:[] }));

  // Summary table
  children.push(new Table({
    width:{size:9360,type:WidthType.DXA}, columnWidths:[4680,2500,2180],
    rows:[
      new TableRow({children:[
        new TableCell({borders,width:{size:4680,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},margins:{top:100,bottom:100,left:160,right:160},
          children:[new Paragraph({children:[new TextRun({text:'CLAUSE',font:'Arial',size:18,bold:true,color:WHITE})]})]}),
        new TableCell({borders,width:{size:2500,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},margins:{top:100,bottom:100,left:160,right:160},
          children:[new Paragraph({children:[new TextRun({text:'TITLE',font:'Arial',size:18,bold:true,color:WHITE})]})]}),
        new TableCell({borders,width:{size:2180,type:WidthType.DXA},shading:{fill:NAVY,type:ShadingType.CLEAR},margins:{top:100,bottom:100,left:160,right:160},
          children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:'RISK',font:'Arial',size:18,bold:true,color:WHITE})]})]})
      ]}),
      ...sorted.map(cl => new TableRow({children:[
        new TableCell({borders,width:{size:4680,type:WidthType.DXA},margins:{top:80,bottom:80,left:160,right:160},
          children:[new Paragraph({children:[new TextRun({text:`Cl. ${cl.clauseRef}`,font:'Arial',size:18,bold:true,color:NAVY})]})]}),
        new TableCell({borders,width:{size:2500,type:WidthType.DXA},margins:{top:80,bottom:80,left:160,right:160},
          children:[new Paragraph({children:[new TextRun({text:cl.clauseTitle||'',font:'Arial',size:18})]})]}),
        new TableCell({borders,width:{size:2180,type:WidthType.DXA},margins:{top:80,bottom:80,left:160,right:160},shading:{fill:'F5F5F5',type:ShadingType.CLEAR},
          children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:riskLabel(cl.risk),font:'Arial',size:16,bold:true,color:riskColor(cl.risk)})]})]}),
      ]}))
    ]
  }));
  children.push(new Paragraph({spacing:{before:600,after:0},children:[]}));

  // Detailed clauses
  sorted.forEach(cl => {
    children.push(new Paragraph({
      spacing:{before:400,after:160},
      border:{bottom:{style:BorderStyle.SINGLE,size:2,color:riskColor(cl.risk),space:1}},
      children:[
        new TextRun({text:`Cl. ${cl.clauseRef}  `,font:'Arial',size:24,bold:true,color:NAVY}),
        new TextRun({text:cl.clauseTitle||'',font:'Arial',size:24,bold:true,color:NAVY}),
        new TextRun({text:`     [${riskLabel(cl.risk)}]`,font:'Arial',size:20,bold:true,color:riskColor(cl.risk)}),
      ]
    }));

    (cl.comments||[]).forEach((cm,idx) => {
      const letter = String.fromCharCode(97+idx);
      children.push(new Table({
        width:{size:9360,type:WidthType.DXA}, columnWidths:[200,9160],
        rows:[new TableRow({children:[
          new TableCell({borders:noBorders,width:{size:200,type:WidthType.DXA},shading:{fill:typeColor(cm.type),type:ShadingType.CLEAR},margins:{top:0,bottom:0,left:0,right:0},children:[new Paragraph({children:[]})]}),
          new TableCell({borders:noBorders,width:{size:9160,type:WidthType.DXA},shading:{fill:'F0F4F8',type:ShadingType.CLEAR},margins:{top:100,bottom:100,left:180,right:160},
            children:[new Paragraph({children:[
              new TextRun({text:`${letter}.  `,font:'Arial',size:18,bold:true,color:typeColor(cm.type)}),
              new TextRun({text:cm.label||'',font:'Arial',size:18,bold:true,color:typeColor(cm.type)}),
              new TextRun({text:`   [${typeLabel(cm.type)}]`,font:'Arial',size:16,color:typeColor(cm.type)}),
            ]})]
          })
        ]})]
      }));
      children.push(new Paragraph({spacing:{before:120,after:80},indent:{left:360},
        children:[new TextRun({text:cm.text||'',font:'Arial',size:18,color:'2C2C3E'})]}));
      if (cm.suggested) {
        children.push(new Paragraph({spacing:{before:60,after:200},indent:{left:360},
          children:[
            new TextRun({text:'Suggested:  ',font:'Arial',size:18,bold:true,italics:true,color:BLUE}),
            new TextRun({text:cm.suggested,font:'Arial',size:18,italics:true,color:BLUE}),
          ]}));
      } else {
        children.push(new Paragraph({spacing:{before:0,after:160},children:[]}));
      }
    });
  });

  const doc = new Document({
    sections:[{
      properties:{page:{size:{width:12240,height:15840},margin:{top:1080,right:1080,bottom:1080,left:1080}}},
      headers:{default:new Header({children:[
        new Paragraph({border:{bottom:{style:BorderStyle.SINGLE,size:4,color:NAVY,space:4}},
          children:[
            new TextRun({text:'GEOSERVE  |  CP Intelligence',font:'Arial',size:16,bold:true,color:NAVY}),
            new TextRun({text:`     ${review.vesselName||''}`,font:'Arial',size:16,color:'888888'}),
          ]})
      ]})},
      footers:{default:new Footer({children:[
        new Paragraph({border:{top:{style:BorderStyle.SINGLE,size:2,color:GRAY,space:4}},alignment:AlignmentType.CENTER,
          children:[new TextRun({text:'Confidential — For internal use only',font:'Arial',size:16,color:'888888'})]})
      ]})},
      children
    }]
  });

  const buf = await Packer.toBuffer(doc);
  const filename = `GEOSERVE_CP_Review_${(review.vesselName||'vessel').replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.docx`;

  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);
  res.send(buf);
};
