const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

/**
 * Automated Arabic Book Content Ingestion & Auto-Chapterizer Tool
 * Usage:
 *   node scripts/fetch-book-text.js --file="path/to/novel.txt" --title="أرض زيكولا" --author="عمرو عبد الحميد"
 *   node scripts/fetch-book-text.js --url="https://example.com/novel.txt" --title="يوتوبيا" --author="أحمد خالد توفيق"
 */

const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'assets', 'data', 'arabic-books.json');

// Helper to parse CLI arguments
function parseArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, ...valParts] = arg.substring(2).split('=');
      args[key] = valParts.join('=').replace(/^['"]|['"]$/g, '');
    }
  });
  return args;
}

// Auto-chapterize raw text into structured chapters
function autoChapterize(rawText, bookTitle) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Normalize line endings & spaces
  const cleanText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Regex patterns to detect chapter breaks
  const chapterRegex = /(?:\n+|^)(?:#+\s*|(?:الفصل|الباب|الجزء|القسم|الرواية|حكاية|المقدمة|الخاتمة|\bChapter\b|\bBook\b)\s*[\d\u0660-\u0669أ-ي]*[\s:-]*[^\n]*)/gi;

  const matches = [...cleanText.matchAll(chapterRegex)];
  const chapters = [];

  if (matches.length >= 2) {
    for (let i = 0; i < matches.length; i++) {
      const start = matches[i].index + matches[i][0].length;
      const end = i < matches.length - 1 ? matches[i + 1].index : cleanText.length;
      const titleMatch = matches[i][0].trim().replace(/^#+\s*/, '');
      const content = cleanText.substring(start, end).trim();

      if (content.length > 50) {
        chapters.push({
          title: titleMatch || `الفصل ${i + 1}`,
          content: content
        });
      }
    }
  }

  // Fallback: Split by word count (~1200 words per chapter) if no explicit chapter headings found
  if (chapters.length === 0) {
    const paragraphs = cleanText.split(/\n\s*\n/);
    let currentChapterContent = [];
    let currentWordCount = 0;
    let chapterNum = 1;

    for (const paragraph of paragraphs) {
      const pWords = paragraph.trim().split(/\s+/).length;
      currentChapterContent.push(paragraph.trim());
      currentWordCount += pWords;

      if (currentWordCount >= 1200) {
        chapters.push({
          title: `الفصل ${chapterNum}: الجزء ${chapterNum}`,
          content: currentChapterContent.join('\n\n')
        });
        chapterNum++;
        currentChapterContent = [];
        currentWordCount = 0;
      }
    }

    if (currentChapterContent.length > 0) {
      chapters.push({
        title: `الفصل ${chapterNum}: الجزء الأخير`,
        content: currentChapterContent.join('\n\n')
      });
    }
  }

  return chapters;
}

function fetchUrlText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchUrlText(res.headers.location));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const args = parseArgs();
  const title = args.title || 'كتاب بدون عنوان';
  const author = args.author || 'مؤلف مجهول';
  const category = args.category || 'روايات مصرية';

  let rawText = '';

  if (args.file) {
    const filePath = path.resolve(args.file);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }
    rawText = fs.readFileSync(filePath, 'utf-8');
  } else if (args.url) {
    console.log(`📡 Fetching text from URL: ${args.url}...`);
    rawText = await fetchUrlText(args.url);
  } else {
    console.log(`
ℹ️ أداة استيراد وتقسيم نصوص الكتب تلقائياً (Arabic Book Ingestion CLI)
============================================================
طريقة الاستخدام:
  node scripts/fetch-book-text.js --file="path/to/book.txt" --title="اسم الكتاب" --author="اسم الكاتب"
  node scripts/fetch-book-text.js --url="https://domain.com/book.txt" --title="اسم الكتاب" --author="اسم الكاتب"
`);
    process.exit(0);
  }

  console.log(`⚡ Auto-chapterizing "${title}" (${rawText.length} characters)...`);
  const chapters = autoChapterize(rawText, title);
  console.log(`✅ Generated ${chapters.length} chapters!`);

  // Prepare Book Data Object
  const bookData = {
    id: 'novel_' + Date.now(),
    title: title,
    author: author,
    description: args.description || `نص كتاب ${title} المنسق تلقائياً بواسطة محرك الذكاء الاصطناعي للمكتبة.`,
    coverUrl: args.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    fileUrl: args.url || '',
    category: category,
    status: 'approved',
    uploaderId: 'system_auto_tool',
    uploaderName: 'أداة الاستيراد التلقائي',
    downloadCount: 500,
    createdAt: new Date().toISOString().split('T')[0],
    fileSize: `${(rawText.length / 1024 / 1024).toFixed(1)} MB`,
    rating: 4.9,
    ratingCount: 150,
    featured: true,
    pagesCount: Math.ceil(rawText.length / 1500),
    chapters: chapters
  };

  // Ensure output directory exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let existingBooks = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingBooks = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (e) {
      existingBooks = [];
    }
  }

  // Update or append
  const idx = existingBooks.findIndex(b => b.title === title);
  if (idx >= 0) {
    existingBooks[idx] = bookData;
    console.log(`🔄 Updated existing book entry for "${title}".`);
  } else {
    existingBooks.push(bookData);
    console.log(`➕ Added new book entry for "${title}".`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existingBooks, null, 2), 'utf-8');
  console.log(`🎉 Saved successfully to ${OUTPUT_FILE}!`);
}

main().catch(err => {
  console.error('❌ Error during book ingestion:', err);
});
