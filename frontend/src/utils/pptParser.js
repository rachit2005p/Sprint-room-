// ──────────────────────────────────────────────
// PPTX parser — extracts text & images from each slide
//
// Input:  base64-encoded .pptx file (with or without data-URI prefix)
// Output: Array of { index, texts[], images[], total }
// ──────────────────────────────────────────────

import JSZip from 'jszip';

// ── Helper: extract the numeric index from a filename like "slide3.xml" ──
function getSlideNumber(filename) {
  const match = filename.match(/slide(\d+)\.xml$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
}

// ── Helper: parse an XML string into a DOM Document ──
function parseXml(xmlString) {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'text/xml');
}

// ── Helper: find child elements by their local (namespace-free) tag name ──
function getElementsByLocalName(parent, name) {
  const allElements = Array.from(parent.querySelectorAll('*'));
  return allElements.filter(function (element) {
    return element.localName === name;
  });
}

// ── parseSingleSlide: extract text and images from one slide ──
async function parseSingleSlide(zip, slidePath, slideIndex, totalSlides) {
  // ── Step 1: read and parse the slide XML ──
  const slideXmlString = await zip.files[slidePath].async('string');
  const slideDocument = parseXml(slideXmlString);

  // ── Step 2: extract all text from <a:t> elements ──
  const textElements = getElementsByLocalName(slideDocument, 't');
  const texts = textElements
    .map(function (element) {
      return element.textContent;
    })
    .filter(function (text) {
      // Keep non-empty, non-whitespace text
      return text && text.trim();
    });

  // ── Step 3: extract all images referenced by <a:blip> elements ──
  const imageUrls = await extractImagesFromSlide(zip, slidePath, slideDocument);

  // ── Step 4: assemble the slide object ──
  return {
    index: slideIndex,
    texts: texts,
    images: imageUrls,
    total: totalSlides,
  };
}

// ── extractImagesFromSlide: resolve each <a:blip> to an object URL ──
async function extractImagesFromSlide(zip, slidePath, slideDocument) {
  const blipElements = getElementsByLocalName(slideDocument, 'blip');

  // No images on this slide — bail early
  if (blipElements.length === 0) {
    return [];
  }

  // Build the relationship map (rId -> ZIP path) from the .rels file
  const relationshipMap = await loadRelationshipMap(zip, slidePath);

  // Resolve each blip to a usable object URL
  const imageUrls = [];

  for (const blipElement of blipElements) {
    // The 'r:embed' attribute tells us which relationship ID this blip uses
    const relationshipId =
      blipElement.getAttribute('r:embed') || blipElement.getAttribute('embed');

    // Skip if no relationship ID or it doesn't exist in our map
    if (!relationshipId || !relationshipMap[relationshipId]) {
      continue;
    }

    const imagePath = relationshipMap[relationshipId];

    // Double-check the file actually exists in the ZIP
    if (!zip.files[imagePath]) {
      continue;
    }

    // Read the image file as a Blob, then create an ephemeral object URL
    const imageBlob = await zip.files[imagePath].async('blob');
    const objectUrl = URL.createObjectURL(imageBlob);

    imageUrls.push(objectUrl);
  }

  return imageUrls;
}

// ── loadRelationshipMap: read a slide's .rels file into an rId->path map ──
async function loadRelationshipMap(zip, slidePath) {
  // The .rels file lives inside ppt/slides/_rels/ and mirrors the slide name
  const relsPath = slidePath.replace('ppt/slides/', 'ppt/slides/_rels/') + '.rels';

  // No .rels file — nothing to map
  if (!zip.files[relsPath]) {
    return {};
  }

  // Read and parse the relationships XML
  const relsXmlString = await zip.files[relsPath].async('string');
  const relsDocument = parseXml(relsXmlString);

  // Each <Relationship> has Id + Target attributes
  const relationshipNodes = Array.from(relsDocument.querySelectorAll('Relationship'));
  const relationshipMap = {};

  for (const relNode of relationshipNodes) {
    const relationshipId = relNode.getAttribute('Id');
    const targetPath = relNode.getAttribute('Target');

    // Only care about targets that point into the media/ folder
    if (targetPath && targetPath.includes('media/')) {
      // The Target path is relative to the slide file; convert to absolute ZIP path
      const absolutePath = targetPath.replace('../', 'ppt/');
      relationshipMap[relationshipId] = absolutePath;
    }
  }

  return relationshipMap;
}

/*
 * ── Main entry: parsePPTX(base64Data) ──────────────────────────────────
 *
 * Accepts a base64-encoded .pptx file and returns an array of slide objects
 * with extracted text and image URLs.
 */
export async function parsePPTX(base64Data) {
  // ── Step 1: extract the raw base64 payload ──
  // Some sources include a data-URI prefix (e.g. "data:application/...;base64,")
  const rawBase64 = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data;

  // ── Step 2: decode base64 into a Uint8Array (JSZip's preferred format) ──
  const binaryString = atob(rawBase64);
  const byteArray = new Uint8Array(binaryString.length);

  for (let charIndex = 0; charIndex < binaryString.length; charIndex++) {
    byteArray[charIndex] = binaryString.charCodeAt(charIndex);
  }

  // ── Step 3: load the .pptx file as a ZIP archive ──
  let zipArchive;

  try {
    zipArchive = await JSZip.loadAsync(byteArray);
  } catch (parseError) {
    // The file is not a valid ZIP (or was corrupted) — return nothing
    console.warn('Failed to unzip PPTX file:', parseError);
    return [];
  }

  // ── Step 4: find all slide XML files inside the archive ──
  // Slide files live at ppt/slides/slide{N}.xml inside the ZIP
  const allFileNames = Object.keys(zipArchive.files);
  const slideFileNames = allFileNames.filter(function (fileName) {
    return /^ppt\/slides\/slide\d+\.xml$/.test(fileName);
  });

  // Sort slides by their numeric index so they come out in presentation order
  slideFileNames.sort(function (fileA, fileB) {
    return getSlideNumber(fileA) - getSlideNumber(fileB);
  });

  const slideCount = slideFileNames.length;

  // ── Step 5: parse each slide — extract text and images ──
  const parsedSlides = [];

  for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
    const slidePath = slideFileNames[slideIndex];
    const slideData = await parseSingleSlide(
      zipArchive,
      slidePath,
      slideIndex + 1,
      slideCount,
    );
    parsedSlides.push(slideData);
  }

  // ── Step 6: fallback for edge cases ──
  // If no slides were parsed (e.g. all were empty), still emit stub entries
  // so the caller knows how many slides the presentation had.
  if (parsedSlides.length === 0) {
    for (let slideIndex = 0; slideIndex < slideCount; slideIndex++) {
      parsedSlides.push({
        index: slideIndex + 1,
        texts: [],
        images: [],
        total: slideCount,
      });
    }
  }

  return parsedSlides;
}
