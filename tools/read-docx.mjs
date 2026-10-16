/* 从 docx 提取纯文本（段落 + 列表项），用于阅读条例内容 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const docx = process.argv[2];
if (!docx) { console.error('用法: node tools/read-docx.mjs <文件路径>'); process.exit(1); }

const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const outXml = join(process.env.TEMP, 'docx-document.xml');

// 用 .NET 解压取出 word/document.xml
execFileSync(PS, ['-NoProfile', '-NonInteractive', '-Command', `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('${docx}')
$e = $zip.Entries | Where-Object { $_.FullName -eq 'word/document.xml' }
$sr = New-Object System.IO.StreamReader($e.Open(), [System.Text.Encoding]::UTF8)
$text = $sr.ReadToEnd(); $sr.Close(); $zip.Dispose()
[System.IO.File]::WriteAllText('${outXml}', $text, [System.Text.Encoding]::UTF8)
`], { encoding: 'utf8' });

const xml = readFileSync(outXml, 'utf8');

// 按段落切分，段落内把 <w:t> 文本拼起来；<w:br/> 与 <w:tab/> 转成空格
const paras = xml.split(/<w:p[ >]/).slice(1).map(p => {
  const texts = [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map(m => m[1]);
  let s = texts.join('');
  s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
       .replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  return s.trim();
}).filter(s => s.length > 0);

console.log(`共 ${paras.length} 个非空段落\n`);
console.log('─'.repeat(70));
paras.forEach((p, i) => {
  console.log(`${String(i + 1).padStart(3)}. ${p}`);
});
console.log('─'.repeat(70));
