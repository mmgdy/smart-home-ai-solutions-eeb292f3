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
const margin = 18;
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

  // Decorative corner accents
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);

  if (!isCover) {
    // Top border line
    doc.setDrawColor(...GOLD);
    doc.line(margin, 15, pageWidth - margin, 15);

    // Header label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text('AZKA SMART  |  COMPANY PROFILE', margin, 12);

    doc.setTextColor(...MUTED);
    doc.text('MIDDLE EAST INTELLIGENT LIVING', pageWidth - margin, 12, { align: 'right' });

    // Bottom border line
    doc.setDrawColor(...NAVY_700);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    // Footer info
    doc.setTextColor(...MUTED);
    doc.text('www.azkasmart.com  |  info@azkasmart.com  |  Egypt • Saudi Arabia • UAE', margin, pageHeight - 9);
  }
}

function drawFooterPageNumber(pageNum, totalPages) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
}

// -------------------------------------------------------------
// PAGE 1: COVER PAGE
// -------------------------------------------------------------
drawBackground(true);

// Hero Image at top/middle
const heroBase64 = getImageBase64('hero.jpg');
if (heroBase64) {
  doc.addImage(heroBase64, 'JPEG', margin, 28, contentWidth, 95);
  // Gold frame around image
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(margin, 28, contentWidth, 95);
}

// Brand Tagline / Eyebrow
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('SMART HOME AI SOLUTIONS', margin, 138);

// Main Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(32);
doc.setTextColor(...GOLD_LIGHT);
doc.text('AZKA SMART', margin, 152);

// Subtitle
doc.setFont('helvetica', 'normal');
doc.setFontSize(14);
doc.setTextColor(...INK_LIGHT);
doc.text('Intelligent Living, Engineered for the Middle East', margin, 162);

// Gold divider
doc.setDrawColor(...GOLD);
doc.setLineWidth(0.8);
doc.line(margin, 168, margin + 60, 168);

// Company brief
doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.setTextColor(...MUTED);
const introLines = doc.splitTextToSize(
  'A regional technology leader combining artificial intelligence with certified engineering to design, deploy, and support next-generation intelligent living spaces across Egypt, Saudi Arabia, and the United Arab Emirates.',
  contentWidth
);
doc.text(introLines, margin, 178);

// Regional Presence Pills
const pillY = 202;
const pills = ['EGYPT HEADQUARTERS', 'SAUDI ARABIA REGIONAL', 'DUBAI EXPERIENCE CENTER'];
let pillX = margin;
doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
pills.forEach((p) => {
  const w = doc.getTextWidth(p) + 8;
  doc.setFillColor(...NAVY_800);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(pillX, pillY, w, 7, 2, 2, 'FD');
  doc.setTextColor(...GOLD);
  doc.text(p, pillX + 4, pillY + 4.8);
  pillX += w + 4;
});

// Stats Banner on Cover bottom
const statsY = 224;
doc.setFillColor(...NAVY_900);
doc.setDrawColor(...NAVY_700);
doc.roundedRect(margin, statsY, contentWidth, 34, 3, 3, 'FD');

const statColW = contentWidth / 4;
profile.stats.forEach((st, idx) => {
  const sx = margin + idx * statColW + statColW / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...TEAL);
  doc.text(st.value, sx, statsY + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_LIGHT);
  doc.text(st.label.en.toUpperCase(), sx, statsY + 23, { align: 'center' });
});

// Cover Footer
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...MUTED);
doc.text('CORPORATE PROFILE & SOLUTIONS DIRECTORY | 2026 EDITION', margin, 275);
doc.setTextColor(...GOLD);
doc.text('www.azkasmart.com', pageWidth - margin, 275, { align: 'right' });


// -------------------------------------------------------------
// PAGE 2: EXECUTIVE SUMMARY & MISSION / VISION / VALUES
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

let curY = 26;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('ABOUT AZKA SMART', margin, curY);

curY += 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Engineering The Future of Living Spaces', margin, curY);

curY += 8;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9.5);
doc.setTextColor(...INK_LIGHT);
const aboutText = doc.splitTextToSize(
  'Founded to redefine modern residential and commercial environments, Azka Smart integrates enterprise AI orchestration with military-grade IoT hardware. Operating across Cairo, Riyadh, and Dubai, we provide homeowners, architects, and premier real-estate developers with seamless, energy-efficient automation tailored to Middle Eastern architectural aesthetics, intense climate demands, and regional infrastructure.',
  contentWidth
);
doc.text(aboutText, margin, curY);
curY += 22;

// Mission & Vision Dual Cards
const cardW = (contentWidth - 6) / 2;
doc.setFillColor(...NAVY_900);
doc.setDrawColor(...GOLD);
doc.setLineWidth(0.4);
doc.roundedRect(margin, curY, cardW, 36, 3, 3, 'FD');
doc.roundedRect(margin + cardW + 6, curY, cardW, 36, 3, 3, 'FD');

// Mission
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...GOLD);
doc.text('OUR MISSION', margin + 6, curY + 9);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...INK_LIGHT);
const missionTxt = doc.splitTextToSize(profile.mission.en, cardW - 12);
doc.text(missionTxt, margin + 6, curY + 17);

// Vision
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...TEAL);
doc.text('OUR VISION', margin + cardW + 12, curY + 9);
doc.setFont('helvetica', 'normal');
doc.setFontSize(8.5);
doc.setTextColor(...INK_LIGHT);
const visionTxt = doc.splitTextToSize(profile.vision.en, cardW - 12);
doc.text(visionTxt, margin + cardW + 12, curY + 17);

curY += 46;

// Core Values Title
doc.setFont('helvetica', 'bold');
doc.setFontSize(14);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Core Operating Values', margin, curY);

curY += 6;
// 4 Values Grid (2x2)
const vCardW = (contentWidth - 6) / 2;
const vCardH = 26;
profile.values.forEach((v, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const vx = margin + col * (vCardW + 6);
  const vy = curY + row * (vCardH + 4);

  doc.setFillColor(...NAVY_800);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(vx, vy, vCardW, vCardH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GOLD);
  doc.text(v.title.en, vx + 5, vy + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(...MUTED);
  const desc = doc.splitTextToSize(v.desc.en, vCardW - 10);
  doc.text(desc, vx + 5, vy + 14);
});

curY += (vCardH + 4) * 2 + 8;

// Featured Installation / Hardware Banner
const prodImgBase64 = getImageBase64('products.jpg');
if (prodImgBase64) {
  doc.addImage(prodImgBase64, 'JPEG', margin, curY, contentWidth, 68);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.rect(margin, curY, contentWidth, 68);

  // Overlay caption box
  doc.setFillColor(...NAVY_950);
  doc.roundedRect(margin + 6, curY + 48, contentWidth - 12, 15, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text('GLOBAL ECOSYSTEM INTEROPERABILITY', margin + 10, curY + 54);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_LIGHT);
  doc.text('Supporting 40+ premier protocols including Zigbee 3.0, Matter, KNX, Apple HomeKit, Google Home & Alexa.', margin + 10, curY + 59);
}


// -------------------------------------------------------------
// PAGE 3: COMPREHENSIVE SMART HOME SOLUTIONS
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 26;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('END-TO-END SOLUTIONS', margin, curY);

curY += 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Integrated Systems Architecture', margin, curY);

curY += 6;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...MUTED);
doc.text('Modular, scalable smart automation engineered for residences, penthouses, villas, and commercial spaces.', margin, curY);

curY += 10;
// 8 Solutions cards (2 columns x 4 rows)
const solW = (contentWidth - 6) / 2;
const solH = 26;
profile.solutions.forEach((sol, index) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  const sx = margin + col * (solW + 6);
  const sy = curY + row * (solH + 4);

  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(sx, sy, solW, solH, 2.5, 2.5, 'FD');

  // Indicator accent bar
  doc.setFillColor(...(index % 2 === 0 ? TEAL : GOLD));
  doc.rect(sx, sy, 3, solH, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(sol.title.en, sx + 7, sy + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const solDesc = doc.splitTextToSize(sol.desc.en, solW - 12);
  doc.text(solDesc, sx + 7, sy + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...TEAL);
  doc.text(sol.title.ar, sx + solW - 6, sy + 7.5, { align: 'right' });
});

curY += (solH + 4) * 4 + 6;

// Market Sectors Bar
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
doc.setTextColor(...GOLD);
doc.text('SPECIALIZED MARKET SECTORS', margin, curY);

curY += 6;
const secCols = 3;
const secW = (contentWidth - 8) / secCols;
const secH = 12;
profile.sectors.forEach((sec, idx) => {
  const col = idx % secCols;
  const row = Math.floor(idx / secCols);
  const secX = margin + col * (secW + 4);
  const secY = curY + row * (secH + 3);

  doc.setFillColor(...NAVY_800);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.2);
  doc.roundedRect(secX, secY, secW, secH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_LIGHT);
  doc.text(sec.en, secX + 4, secY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GOLD);
  doc.text(sec.ar, secX + secW - 4, secY + 7.5, { align: 'right' });
});


// -------------------------------------------------------------
// PAGE 4: PROPRIETARY AI PLATFORM & UNIFIED APP
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 26;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('THE AZKA ADVANTAGE', margin, curY);

curY += 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.setTextColor(...GOLD_LIGHT);
doc.text('AI-Driven Planning & Unified Control', margin, curY);

curY += 8;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...MUTED);
doc.text('Unlike traditional integrators, Azka Smart eliminates guesswork through algorithmic design tools and intuitive mobile orchestration.', margin, curY);

curY += 10;
// Left side: 4 Platform pillars
const leftW = contentWidth * 0.48;
const rightW = contentWidth - leftW - 6;
const platH = 25;
profile.platform.forEach((p, idx) => {
  const py = curY + idx * (platH + 4);
  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(margin, py, leftW, platH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(p.title.en, margin + 5, py + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_LIGHT);
  const pDesc = doc.splitTextToSize(p.desc.en, leftW - 10);
  doc.text(pDesc, margin + 5, py + 14);
});

// Right side: App UI Mockup image
const appImgBase64 = getImageBase64('app-ui.jpg');
if (appImgBase64) {
  const appX = margin + leftW + 6;
  doc.addImage(appImgBase64, 'JPEG', appX, curY, rightW, 112);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.rect(appX, curY, rightW, 112);

  // Caption
  doc.setFillColor(...NAVY_950);
  doc.rect(appX, curY + 112 - 14, rightW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...TEAL);
  doc.text('Bilingual iOS & Android App', appX + 4, curY + 112 - 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text('Instant lighting, climate & scene control', appX + 4, curY + 112 - 3);
}

curY += 122;

// Engineering & Implementation Lifecycle (4 Steps)
doc.setFont('helvetica', 'bold');
doc.setFontSize(12);
doc.setTextColor(...GOLD_LIGHT);
doc.text('The Certified 4-Phase Delivery Process', margin, curY);

curY += 6;
const stepW = (contentWidth - 9) / 4;
profile.process.forEach((pr, i) => {
  const px = margin + i * (stepW + 3);
  doc.setFillColor(...NAVY_800);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.roundedRect(px, curY, stepW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...TEAL);
  doc.text(`0${i + 1}`, px + 4, curY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(pr.title.en, px + 4, curY + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  const prLines = doc.splitTextToSize(pr.desc.en, stepW - 8);
  doc.text(prLines, px + 4, curY + 23);
});


// -------------------------------------------------------------
// PAGE 5: REGIONAL PRESENCE (EGYPT, SAUDI ARABIA, DUBAI)
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 26;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('MIDDLE EAST HUBS', margin, curY);

curY += 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Strategic Regional Presence', margin, curY);

curY += 6;
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...MUTED);
doc.text('Direct local engineering, warehousing, and experience centers strategically positioned across the region.', margin, curY);

curY += 10;
// 3 Regional Offices Cards
const offCardH = 64;
profile.offices.forEach((office, idx) => {
  const oy = curY + idx * (offCardH + 6);
  doc.setFillColor(...NAVY_900);
  doc.setDrawColor(...NAVY_700);
  doc.roundedRect(margin, oy, contentWidth, offCardH, 3, 3, 'FD');

  // Office Image (left 65mm)
  const offImgBase64 = getImageBase64(path.basename(office.image));
  if (offImgBase64) {
    doc.addImage(offImgBase64, 'JPEG', margin + 3, oy + 3, 62, offCardH - 6);
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.4);
    doc.rect(margin + 3, oy + 3, 62, offCardH - 6);
  }

  // Office Text Details (right side)
  const tx = margin + 70;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text(`${office.city.en}, ${office.country.en}`, tx, oy + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...TEAL);
  doc.text(office.role.en.toUpperCase(), tx, oy + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_LIGHT);
  const offDesc = doc.splitTextToSize(office.desc.en, contentWidth - 76);
  doc.text(offDesc, tx, oy + 26);

  // Contact points
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Contact: ${office.email}  |  ${office.phone || '+20 150 189 6456'}`, tx, oy + 54);
});


// -------------------------------------------------------------
// PAGE 6: PARTNERSHIPS, PROJECTS & CONTACT DETAILS
// -------------------------------------------------------------
doc.addPage();
drawBackground(false);

curY = 26;
doc.setFont('helvetica', 'bold');
doc.setFontSize(10);
doc.setTextColor(...TEAL);
doc.text('GET IN TOUCH', margin, curY);

curY += 7;
doc.setFont('helvetica', 'bold');
doc.setFontSize(20);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Let Us Build Your Smart Living Space', margin, curY);

curY += 10;
// Installation and Team Dual Gallery
const galW = (contentWidth - 6) / 2;
const galH = 65;

const instImg = getImageBase64('installation.jpg');
if (instImg) {
  doc.addImage(instImg, 'JPEG', margin, curY, galW, galH);
  doc.setDrawColor(...GOLD);
  doc.rect(margin, curY, galW, galH);
  doc.setFillColor(...NAVY_950);
  doc.rect(margin, curY + galH - 12, galW, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text('Certified Engineering & Clean Installations', margin + 4, curY + galH - 4);
}

const teamImg = getImageBase64('team.jpg');
if (teamImg) {
  doc.addImage(teamImg, 'JPEG', margin + galW + 6, curY, galW, galH);
  doc.setDrawColor(...GOLD);
  doc.rect(margin + galW + 6, curY, galW, galH);
  doc.setFillColor(...NAVY_950);
  doc.rect(margin + galW + 6, curY + galH - 12, galW, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...TEAL);
  doc.text('Dedicated 24/7 Support & Commissioning Teams', margin + galW + 10, curY + galH - 4);
}

curY += galH + 12;

// CTA Contact Box
doc.setFillColor(...NAVY_900);
doc.setDrawColor(...GOLD);
doc.setLineWidth(0.6);
doc.roundedRect(margin, curY, contentWidth, 75, 4, 4, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(16);
doc.setTextColor(...GOLD_LIGHT);
doc.text('Schedule a Consultation or Request a Custom Quote', margin + 10, curY + 16);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...INK_LIGHT);
const ctaDesc = doc.splitTextToSize(
  'Whether you are developing a residential compound in Riyadh, designing a luxury private villa in Cairo, or upgrading a penthouse in Dubai, our engineering team provides end-to-end consultancy, floor plan mapping, and quotation.',
  contentWidth - 20
);
doc.text(ctaDesc, margin + 10, curY + 26);

// Contact Grid inside box
const cy2 = curY + 44;
doc.setFont('helvetica', 'bold');
doc.setFontSize(9.5);
doc.setTextColor(...TEAL);
doc.text('HQ Direct Phone:', margin + 10, cy2);
doc.text('Direct Email:', margin + 70, cy2);
doc.text('Online Platform:', margin + 130, cy2);

doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
doc.setTextColor(...INK_LIGHT);
doc.text(profile.brand.phone, margin + 10, cy2 + 7);
doc.text(profile.brand.email, margin + 70, cy2 + 7);
doc.text(profile.brand.website, margin + 130, cy2 + 7);

doc.setFont('helvetica', 'italic');
doc.setFontSize(8);
doc.setTextColor(...MUTED);
doc.text('Bilingual customer care available 7 days a week (Arabic & English)', margin + 10, cy2 + 18);

curY += 88;

// Bottom certification notice
doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...MUTED);
doc.text('© 2026 Azka Smart Home AI Solutions Ltd. All rights reserved. Registered in Egypt, KSA, and UAE.', margin, curY);

// Add page numbers to all pages
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
console.log(`Successfully generated PDF brochure (${(pdfBuffer.length / 1024).toFixed(1)} KB) at: ${outputPath}`);
