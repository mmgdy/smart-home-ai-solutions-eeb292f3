const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const dataPath = path.join(__dirname, '..', 'src', 'data', 'companyProfile.json');
const profile = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const publicDir = path.join(__dirname, '..', 'public', 'company-profile');
const outputPath = path.join(publicDir, 'Azka-Smart-Company-Profile.pdf');

function getImageBase64(filename) {
  const filePath = path.join(publicDir, filename);
  if (fs.existsSync(filePath)) {
    const data = fs.readFileSync(filePath);
    return `data:image/jpeg;base64,${data.toString('base64')}`;
  }
  return null;
}

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = 210;
const pageHeight = 297;
const margin = 16;
const contentWidth = pageWidth - margin * 2;

// Brand Colors
const NAVY_950 = [5, 13, 26];       // #050d1a
const NAVY_900 = [8, 22, 43];       // #08162b
const NAVY_800 = [13, 33, 64];      // #0d2140
const NAVY_700 = [20, 48, 90];      // #14305a
const GOLD = [212, 175, 106];       // #d4af6a
const GOLD_LIGHT = [241, 217, 164]; // #f1d9a4
const TEAL = [45, 212, 191];        // #2dd4bf
const INK_LIGHT = [232, 237, 245];   // #e8edf5
const MUTED = [154, 168, 191];      // #9aa8bf

function drawBackground(isCover = false) {
  doc.setFillColor(...NAVY_950);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  if (!isCover) {
    // Header line
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.line(margin, 14, pageWidth - margin, 14);

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('AZKA SMART | TECHNICAL SYSTEMS SPECIFICATION', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.text('KNX • ZIGBEE 3.0 • MATTER • MODBUS VRF', pageWidth - margin, 11, { align: 'right' });

    // Footer line
    doc.setDrawColor(...NAVY_700);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text('Azka Smart Engineering Bureau | Cairo • Riyadh • Dubai | www.azkasmart.com', margin, pageHeight - 7);
  }
}

function drawFooterPageNumber(pageNum, totalPages) {
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
}

// -------------------------------------------------------------
// PAGE 1: TECHNICAL COVER
// -------------------------------------------------------------
drawBackground(true);

const heroBase64 = getImageBase64('hero.jpg');
if (heroBase64) {
  doc.addImage(heroBase64, 'JPEG', margin, 24, contentWidth, 90);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(margin, 24, contentWidth, 90);
}

// Eyebrow
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SYSTEMS INTEGRATION & LOW-VOLTAGE ENGINEERING', margin, 126);

// Main Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(30);
doc.setTextColor(...GOLD_LIGHT);
doc.text('AZKA SMART', margin, 138);

// Subtitle
doc.setFont('helvetica', 'normal');
doc.setFontSize(13);
doc.setTextColor(...INK_LIGHT);
doc.text('Intelligent Living & Systems Engineering for the Middle East', margin, 147);

// Protocol Subheading
doc.setFont('courier', 'bold');
doc.setFontSize(8);
doc.setTextColor(...TEAL);
doc.text('CERTIFIED: KNX TP1 • ZIGBEE 3.0 • MATTER OVER THREAD • MODBUS RTU • DALI-2', margin, 154);

doc.setDrawColor(...GOLD);
doc.setLineWidth(0.6);
doc.line(margin, 158, margin + 70, 158);

// Company brief
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...MUTED);
const introLines = doc.splitTextToSize(
  'Azka Smart is a specialized smart-home engineering and AI technology firm operating across Cairo, Riyadh, and Dubai. We design, build, and commission industrial-grade residential automation: hybrid wired/wireless bus topologies, native VRF chiller gateways, enterprise VLAN network segregation, and proprietary AI-driven CAD floor plan analysis.',
  contentWidth
);
doc.text(introLines, margin, 166);

// Certification Badges
const certY = 194;
doc.setFont('courier', 'bold');
doc.setFontSize(8);
let cX = margin;
profile.certifications.forEach((c) => {
  const txt = `[ ${c.code} ]`;
  const w = doc.getTextWidth(txt) + 6;
  doc.setFillColor(...NAVY_800);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(cX, certY, w, 6.5, 1.5, 1.5, 'FD');
  doc.setTextColor(...GOLD);
  doc.text(txt, cX + 3, certY + 4.5);
  cX += w + 4;
});

// Technical KPI Strip
const statsY = 212;
doc.setFillColor(...NAVY_900);
doc.setDrawColor(...NAVY_700);
doc.roundedRect(margin, statsY, contentWidth, 34, 3, 3, 'FD');

const statColW = contentWidth / 4;
profile.stats.forEach((st, idx) => {
  const sx = margin + idx * statColW + statColW / 2;
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.text(st.value, sx, statsY + 14, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...INK_LIGHT);
  doc.text(st.label.en.toUpperCase(), sx, statsY + 23, { align: 'center' });
});

// Regional Hubs Bar
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('REGIONAL BUREAUS: Cairo (Tower 4, 90th St) • Riyadh (King Fahd Rd) • Dubai (Marina Plaza L24)', margin, 264);

doc.setFont('courier', 'normal');
doc.setFontSize(8);
doc.setTextColor(...GOLD);
doc.text('DOCUMENT REF: AS-ENG-SPEC-2026-V4  |  SECURITY: PUBLIC', margin, 274);
doc.text('www.azkasmart.com', pageWidth - margin, 274, { align: 'right' });


// -------------------------------------------------------------
// PAGE 2: FOUR-TIER FIELDBUS & SYSTEM TOPOLOGY
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

let curY = 24;
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SECTION 01: SYSTEM ARCHITECTURE & TOPOLOGY', margin, curY);

curY += 6;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Four-Tier Industrial Fieldbus Topology', margin, curY);

curY += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('Designed to eliminate single points of failure with 100% local survivability during internet outages.', margin, curY);

curY += 8;
// Draw 4 Architecture Layers
const layerCardH = 48;
profile.architectureLayers.forEach((layer, idx) => {
  const ly = curY + idx * (layerCardH + 4);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(margin, ly, contentWidth, layerCardH, 2.5, 2.5, 'FD');

  // Side accent
  doc.setFillColor(...(idx % 2 === 0 ? TEAL : GOLD));
  doc.rect(margin, ly, 3.5, layerCardH, 'F');

  // Layer header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...GOLD);
  doc.text(`TIER 0${idx + 1}: ${layer.layer.en.toUpperCase()}`, margin + 7, ly + 7.5);

  // Tech stack chip
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text(layer.tech, margin + 7, ly + 14);

  // Description
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_LIGHT);
  const descLines = doc.splitTextToSize(layer.desc.en, contentWidth - 14);
  doc.text(descLines, margin + 7, ly + 21);

  // Specs pill row
  let specX = margin + 7;
  layer.specs.forEach((sp) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    const spTxt = `${sp.k}: ${sp.v}`;
    const spW = doc.getTextWidth(spTxt) + 5;
    doc.setFillColor(...NAVY_800);
    doc.roundedRect(specX, ly + 36, spW, 6, 1, 1, 'F');
    doc.setTextColor(...MUTED);
    doc.text(spTxt, specX + 2.5, ly + 40.2);
    specX += spW + 3;
  });
});

curY += (layerCardH + 4) * 4 + 4;
doc.setFont('courier', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(...MUTED);
doc.text('Note: Complete single-line wiring diagrams (SLD) and riser schematics provided upon site CAD ingestion.', margin, curY);


// -------------------------------------------------------------
// PAGE 3: REGIONAL ELECTRICAL & GRID COMPLIANCE MATRIX
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 24;
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SECTION 02: REGIONAL ELECTRICAL STANDARDS & COMPLIANCE', margin, curY);

curY += 6;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Middle Eastern Power Grid Engineering Matrix', margin, curY);

curY += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('Comprehensive technical accommodation for grid frequency variations, neutral wiring, and ambient thermals.', margin, curY);

curY += 10;
// Compliance Cards for Egypt, KSA, UAE
const compCardH = 68;
profile.regionalCompliance.forEach((rc, i) => {
  const cy = curY + i * (compCardH + 6);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, cy, contentWidth, compCardH, 3, 3, 'FD');

  // Country Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(rc.country.en.toUpperCase(), margin + 8, cy + 9);

  // Grid frequency pill
  doc.setFont('courier', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text(`GRID: ${rc.grid}`, margin + 8, cy + 17);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_LIGHT);
  doc.text(`STANDARDS: ${rc.standards}`, margin + 8, cy + 24);

  // Neutral strategy
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text('NEUTRAL CONDUCTOR STRATEGY:', margin + 8, cy + 33);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_LIGHT);
  const nLines = doc.splitTextToSize(rc.neutralStrategy, contentWidth - 16);
  doc.text(nLines, margin + 8, cy + 39);

  // Thermal focus
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text('THERMAL & ENVIRONMENTAL SAFEGUARDS:', margin + 8, cy + 51);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const tLines = doc.splitTextToSize(rc.thermalFocus, contentWidth - 16);
  doc.text(tLines, margin + 8, cy + 57);
});


// -------------------------------------------------------------
// PAGE 4: REAL-WORLD FIELD REFERENCE DEPLOYMENTS
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 24;
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SECTION 03: VERIFIED CASE STUDIES & FIELD DATA', margin, curY);

curY += 6;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Commissioned Technical Deployments', margin, curY);

curY += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('Empirical data from live residential installations in New Cairo, Riyadh, and Palm Jumeirah.', margin, curY);

curY += 10;
// Case study cards
const csCardH = 68;
profile.caseStudies.forEach((cs, idx) => {
  const csY = curY + idx * (csCardH + 6);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(margin, csY, contentWidth, csCardH, 3, 3, 'FD');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(cs.title.en, margin + 8, csY + 8);

  // Subtitle / Type
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text(`${cs.location.en.toUpperCase()}  |  ${cs.type.en}`, margin + 8, csY + 15);

  // Scope
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_LIGHT);
  const scopeLines = doc.splitTextToSize(cs.scope.en, contentWidth - 16);
  doc.text(scopeLines, margin + 8, csY + 22);

  // 4 Metrics Grid inside card
  const mBoxY = csY + 41;
  const mW = (contentWidth - 16 - 9) / 4;
  cs.metrics.forEach((m, mIdx) => {
    const mx = margin + 8 + mIdx * (mW + 3);
    doc.setFillColor(...NAVY_800);
    doc.roundedRect(mx, mBoxY, mW, 20, 2, 2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(m.label.en.toUpperCase(), mx + 3, mBoxY + 6);

    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(m.val, mx + 3, mBoxY + 14);
  });
});


// -------------------------------------------------------------
// PAGE 5: PROPRIETARY AI ENGINEERING PIPELINE
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 24;
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SECTION 04: AI-ASSISTED DESIGN & CAD ENGINE', margin, curY);

curY += 6;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Automated DWG Blueprint Ingestion & BOQ', margin, curY);

curY += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('How Azka Smart automates electrical load estimation and line-item contractor quotes.', margin, curY);

curY += 10;
// 4 AI Features (2x2 grid)
const aiCardW = (contentWidth - 6) / 2;
const aiCardH = 46;
profile.aiEngine.features.forEach((feat, idx) => {
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const fx = margin + col * (aiCardW + 6);
  const fy = curY + row * (aiCardH + 5);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(fx, fy, aiCardW, aiCardH, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GOLD);
  doc.text(feat.name.en, fx + 6, fy + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_LIGHT);
  const featLines = doc.splitTextToSize(feat.detail.en, aiCardW - 12);
  doc.text(featLines, fx + 6, fy + 16);
});

curY += (aiCardH + 5) * 2 + 6;

// Showcase dual images: Products & App UI
const imgW = (contentWidth - 6) / 2;
const imgH = 68;

const prodBase64 = getImageBase64('products.jpg');
if (prodBase64) {
  doc.addImage(prodBase64, 'JPEG', margin, curY, imgW, imgH);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(margin, curY, imgW, imgH);

  doc.setFillColor(...NAVY_950);
  doc.rect(margin, curY + imgH - 12, imgW, 12, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...TEAL);
  doc.text('Industrial Actuators & Keypads', margin + 4, curY + imgH - 4);
}

const appBase64 = getImageBase64('app-ui.jpg');
if (appBase64) {
  doc.addImage(appBase64, 'JPEG', margin + imgW + 6, curY, imgW, imgH);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(margin + imgW + 6, curY, imgW, imgH);

  doc.setFillColor(...NAVY_950);
  doc.rect(margin + imgW + 6, curY + imgH - 12, imgW, 12, 'F');
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  doc.text('Local-First Mobile Interface (<30ms)', margin + imgW + 10, curY + imgH - 4);
}


// -------------------------------------------------------------
// PAGE 6: REGIONAL BUREAUS, WORKSHOPS & CONTACTS
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 24;
doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('SECTION 05: PHYSICAL BUREAUS & WORKSHOP FACILITIES', margin, curY);

curY += 6;
doc.setFont('helvetica', 'bold');
doc.setFontSize(18);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Direct Field Presence & Engineering Labs', margin, curY);

curY += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...MUTED);
doc.text('Certified panel pre-wiring workshops and central distribution hubs in Egypt, KSA, and UAE.', margin, curY);

curY += 10;
// 3 Offices
const offH = 50;
profile.offices.forEach((off, idx) => {
  const oy = curY + idx * (offH + 5);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(margin, oy, contentWidth, offH, 2.5, 2.5, 'FD');

  // Office image on left (45mm)
  const oImgBase64 = getImageBase64(path.basename(off.image));
  if (oImgBase64) {
    doc.addImage(oImgBase64, 'JPEG', margin + 2.5, oy + 2.5, 46, offH - 5);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2.5, oy + 2.5, 46, offH - 5);
  }

  // Office details on right
  const ox = margin + 53;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(`${off.city.en}, ${off.country.en}`, ox, oy + 8);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text(off.role.en.toUpperCase(), ox, oy + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(`Address: ${off.address.en}`, ox, oy + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...INK_LIGHT);
  const offDesc = doc.splitTextToSize(off.desc.en, contentWidth - 58);
  doc.text(offDesc, ox, oy + 26);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text(`Email: ${off.email}  |  Direct: ${off.phone}`, ox, oy + 44);
});

curY += (offH + 5) * 3 + 6;

// Direct Engineering Submission Box
doc.setFillColor(...NAVY_800);
doc.setDrawColor(...GOLD);
doc.setLineWidth(0.6);
doc.roundedRect(margin, curY, contentWidth, 54, 3, 3, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(13);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Submit Architectural CAD / DWG for Engineering Assessment', margin + 8, curY + 12);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...INK_LIGHT);
const ctaLines = doc.splitTextToSize(
  'Email your project floor plans and electrical single-line requirements directly to our engineering bureau. Our AI pipeline will generate a preliminary load analysis, device schedule, and line-item contractor BOQ within 24 business hours.',
  contentWidth - 16
);
doc.text(ctaLines, margin + 8, curY + 20);

doc.setFont('courier', 'bold');
doc.setFontSize(9);
doc.setTextColor(...TEAL);
doc.text('DIRECT ENGINEERING EMAIL: engineering@azkasmart.com', margin + 8, curY + 36);
doc.text('CENTRAL DESK: +20 150 189 6456  |  WWW.AZKASMART.COM', margin + 8, curY + 44);

// Add page numbering to all pages
const totalPages = doc.getNumberOfPages();
for (let p = 1; p <= totalPages; p++) {
  doc.setPage(p);
  if (p > 1) {
    drawFooterPageNumber(p, totalPages);
  }
}

// Write PDF to disk
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
fs.writeFileSync(outputPath, pdfBuffer);
console.log(`Successfully generated Technical Specification PDF brochure (${(pdfBuffer.length / 1024).toFixed(1)} KB) at: ${outputPath}`);
