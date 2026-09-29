// Gemini AI Studioで事前生成した音声を取り込む。APIキーは不要。
// node --import ./tools/register.mjs tools/gen-voice.mjs --plan|--import|--finalize
const command = process.argv[2];
if (command === '--plan') await import('./plan-voice.mjs');
else if (command === '--import') await import('./import-voice.mjs');
else if (command === '--finalize') await import('./finalize-voice.mjs');
else { console.error('Use --plan, --import or --finalize. See assets-src/gemini-tts/README.md.'); process.exitCode = 1; }
