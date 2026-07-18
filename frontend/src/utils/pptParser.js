import JSZip from 'jszip';

function getSlideNumber(filename) {
  const match = filename.match(/slide(\d+)\.xml$/);
  return match ? parseInt(match[1], 10) : null;
}

function parseXml(xmlString) {
  return new DOMParser().parseFromString(xmlString, 'text/xml');
}

function getElementsByLocalName(parent, name) {
  return Array.from(parent.querySelectorAll('*')).filter(el => el.localName === name);
}

export async function parsePPTX(base64Data) {
  const base64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  let zip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return [];
  }

  // Find all slide files
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => getSlideNumber(a) - getSlideNumber(b));

  const slides = [];

  for (const slidePath of slideFiles) {
    const slideXml = await zip.files[slidePath].async('string');
    const slideDoc = parseXml(slideXml);

    // Extract text from <a:t> elements
    const textElements = getElementsByLocalName(slideDoc, 't');
    const texts = textElements
      .map(el => el.textContent)
      .filter(t => t && t.trim());

    // Extract images
    const blipElements = getElementsByLocalName(slideDoc, 'blip');
    const relsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';
    let rels = {};

    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async('string');
      const relsDoc = parseXml(relsXml);
      const relationships = Array.from(relsDoc.querySelectorAll('Relationship'));
      for (const rel of relationships) {
        const id = rel.getAttribute('Id');
        const target = rel.getAttribute('Target');
        if (target && target.includes('media/')) {
          rels[id] = target.replace('../', 'ppt/');
        }
      }
    }

    const images = [];
    for (const blip of blipElements) {
      const embed = blip.getAttribute('r:embed') || blip.getAttribute('embed');
      if (embed && rels[embed]) {
        const imgPath = rels[embed];
        if (zip.files[imgPath]) {
          const blob = await zip.files[imgPath].async('blob');
          const url = URL.createObjectURL(blob);
          images.push(url);
        }
      }
    }

    slides.push({
      index: slides.length + 1,
      texts,
      images,
      total: slideFiles.length
    });
  }

  // Fallback: if no content found, still create slides based on count
  if (slides.length === 0) {
    for (let i = 0; i < slideFiles.length; i++) {
      slides.push({
        index: i + 1,
        texts: [],
        images: [],
        total: slideFiles.length
      });
    }
  }

  return slides;
}
