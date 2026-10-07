import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const port=Number(process.env.PORT ?? 5187);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let name=decodeURIComponent(url.pathname).slice(1)||'index.html';if(!/^(index\.html|style\.css|sw\.js|manifest\.webmanifest|src\/|assets\/(forest|harbor)\/|vendor\/|icons\/|voice\/|tools\/(voice-review|forest-review|harbor-review)\.html)/.test(name))throw Error('not found');const file=path.resolve(root,name);if(!file.startsWith(root)||!(await stat(file)).isFile())throw Error('not found');res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});res.end(await readFile(file));}catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Ichi-game: http://127.0.0.1:${port}`));
