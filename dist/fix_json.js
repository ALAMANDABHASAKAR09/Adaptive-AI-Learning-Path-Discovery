const fs = require('fs');
const fp = "c:\\Users\\2397826\\OneDrive - Cognizant\\Documents\\dinal\\react-course-app\\public\\final_beginner_courses.json";
try {
  let src = fs.readFileSync(fp, 'utf8');
  // Normalize CRLF to LF
  src = src.replace(/\r\n/g, '\n');
  let out = '';
  let inString = false;
  let escape = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' && !escape) {
      inString = !inString;
      out += ch;
      continue;
    }
    if (ch === '\\' && !escape) {
      escape = true;
      out += ch;
      continue;
    }
    if (ch === '\n' && inString) {
      // replace literal newline inside a JSON string with escaped newline
      out += '\\n';
      escape = false;
      continue;
    }
    out += ch;
    escape = false;
  }
  // Try to validate
  try {
    JSON.parse(out);
    fs.writeFileSync(fp, out, 'utf8');
    console.log('Success: file fixed and valid JSON.');
  } catch (e) {
    const backup = fp + '.fixed';
    fs.writeFileSync(backup, out, 'utf8');
    console.error('Failed to parse JSON. Partial output written to ' + backup);
    console.error(e && e.message);
    process.exit(1);
  }
} catch (err) {
  console.error('Error reading or writing file:', err && err.message);
  process.exit(1);
}
