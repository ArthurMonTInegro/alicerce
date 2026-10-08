import {spawnSync} from 'node:child_process';
import {cpSync,rmSync} from 'node:fs';
const build=spawnSync('npm',['run','build','--workspace','@alicerce/web'],{stdio:'inherit',env:{...process.env,VITE_STATIC:'1',BASE_PATH:'/',SITE_URL:'https://alicerce-autodidata.perkysong9.chatgpt.site'}});
if(build.status!==0)process.exit(build.status??1);
rmSync('dist',{recursive:true,force:true});cpSync('apps/web/dist','dist',{recursive:true});
