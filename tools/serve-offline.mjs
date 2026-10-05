import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.mp3':'audio/mpeg','.png':'image/png','.webmanifest':'application/manifest+json'};
let requests=0;
const server=http.createServer(async(req,res)=>{
  requests++;
  try{
    const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname).slice(1)||'index.html';
    if(!/^(index\.html|style\.css|sw\.js|manifest\.webmanifest|src\/[\w-]+\.js|vendor\/three\.(?:module|core)\.js|icons\/[\w-]+\.png|voice\/index\.json|voice\/gemini\/[0-9a-f]{8}\.mp3|tools\/offline-review\.html)$/.test(name))throw Error('対象外');
    const file=path.resolve(root,name);
    if(!file.startsWith(root)||!(await stat(file)).isFile())throw Error('対象外');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream','Cache-Control':'no-cache'});
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('ファイルがありません');}
});
server.listen(5193,'127.0.0.1',()=>console.log('確認用: http://127.0.0.1:5193/tools/offline-review.html'));
process.once('SIGINT',()=>{console.log('確認用サーバーを停止: '+requests+' 件');server.closeAllConnections();server.close(()=>process.exit(0));});
