import {retrySave,signOut,syncNow,useAuth} from '../state/store.ts';
export function SaveStatus(){
  const s=useAuth();
  if(s.logoutPending)return <div className="container" role="alert"><p className="callout warn">A saída do servidor não foi confirmada. Os dados da conta ficam ocultos neste navegador, e o site tenta sair de novo quando a conexão voltar. <button type="button" className="btn small" onClick={()=>void signOut().catch(()=>{})}>Tentar encerrar sessão</button></p></div>;
  if(s.localSave==='error')return <div className="container" role="alert"><p className="callout warn">Não foi possível salvar no navegador. Copie seu código e exporte seu progresso antes de fechar a página. <button type="button" className="btn small" onClick={retrySave}>Tentar salvar</button></p></div>;
  if(s.syncStatus==='error')return <div className="container" role="status"><p className="callout warn">Sincronização pendente. {s.lastSync?`Última confirmação: ${new Date(s.lastSync).toLocaleString('pt-BR')}.`:''} Tentaremos novamente ao reconectar. <button className="btn small" onClick={()=>void syncNow()}>Tentar agora</button></p></div>;
  return s.localSave==='pending'?<div className="container small muted" role="status">Salvando progresso…</div>:null;
}
