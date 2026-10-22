let e=null;async function t(e,t,n){let r=t=>{let n=e[t];if(!n)throw Error(`arquivo do Pyodide ausente: ${t}`);return URL.createObjectURL(new Blob([n],{type:`text/javascript`}))},i=e[`pyodide.asm.wasm`];if(!i||!WebAssembly.validate(i))throw Error(`o arquivo pyodide.asm.wasm chegou corrompido ou incompleto`);let a=await import(
/* @vite-ignore */
r(`pyodide.mjs`)),o=await import(
/* @vite-ignore */
r(`pyodide.asm.mjs`)),s=self.fetch;self.fetch=(n,r)=>{let i=String(n instanceof Request?n.url:n),a=i.startsWith(t)?i.slice(t.length):``,o=a?e[a]:void 0;return o?Promise.resolve(new Response(o,{headers:{"content-type":a.endsWith(`.wasm`)?`application/wasm`:`application/octet-stream`}})):s(n,r)};try{let r=await a.loadPyodide({indexURL:t,packageBaseUrl:t,createPyodideModule:o.default,lockFileContents:new TextDecoder().decode(e[`pyodide-lock.json`])});return r.runPython(n),r.runPython(`
def _alicerce_cancelar_tarefas():
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        for t in asyncio.all_tasks(loop):
            t.cancel()
    except Exception:
        pass
`),r}finally{self.fetch=s}}function n(n,r,i){return e??=t(n,r,i).catch(t=>{throw e=null,t}),e}self.onmessage=async t=>{let r=t.data;try{if(r.op===`python:boot`)return await n(r.files,r.indexURL,r.harness),self.postMessage({id:r.id,ok:!0});if(!e)throw Error(`o Python não foi iniciado`);let t=await e;if(r.op===`python:run`)try{let e=t.globals.get(`run`)(r.code,r.tests,r.stdin,r.trace);return self.postMessage({id:r.id,ok:!0,result:JSON.parse(e)})}finally{t.globals.get(`_alicerce_cancelar_tarefas`)()}let i=t.globals.get(`run_sql`)(r.setup,r.query,r.solution,r.ordered);self.postMessage({id:r.id,ok:!0,result:JSON.parse(i)})}catch(e){self.postMessage({id:r.id,ok:!1,error:String(e?.message??e)})}};
//# sourceMappingURL=python.worker-CI3eZXcX.js.map