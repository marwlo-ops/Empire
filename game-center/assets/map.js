(() => {
'use strict';
const $=id=>document.getElementById(id);
let base=(sessionStorage.getItem('gc-bot-url')||'').replace(/\\/+$/,'');
let token=sessionStorage.getItem('gc-bot-token')||'';
const urlInput=$('mapApiUrl'), tokenInput=$('mapApiToken');
if(urlInput) urlInput.value=base;
if(tokenInput) tokenInput.value=token;
const save=$('saveMapConfig');
if(save) save.addEventListener('click',()=>{base=urlInput.value.trim().replace(/\\/+$/,'');token=tokenInput.value.trim();sessionStorage.setItem('gc-bot-url',base);sessionStorage.setItem('gc-bot-token',token);status('Konfiguracja zapisana w tej karcie. Pobieram dane…');load();});
const labels={glacier:'Lodowe Rubieże',sands:'Płonące Piaski',fire_peaks:'Ogniste Szczyty'};
function status(s){$('status').textContent=s;}
function cell(value){const td=document.createElement('td');td.textContent=value??'—';return td;}
async function load(){
 if(!token){status('Najpierw otwórz panel AI Bota, zapisz adres API i klucz dostępu w tej sesji, a następnie wróć na mapę.');return;}
 const region=$('region').value;status('Pobieranie zapisanych rekordów z PostgreSQL…');$('rows').replaceChildren();
 try{
  const r=await fetch(base+'/api/map/npcs?region='+encodeURIComponent(region),{headers:{Authorization:'Bearer '+token}});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Błąd API '+r.status);
  $('count').textContent=d.count;$('source').textContent=d.count?[...new Set(d.npcs.map(n=>n.source))].join(', '):'brak';
  $('updated').textContent=d.npcs.length?new Date(Math.max(...d.npcs.map(n=>new Date(n.observedAt).getTime()))).toLocaleString('pl-PL'):'—';
  if(!d.npcs.length){const tr=document.createElement('tr'),td=cell('Brak zaimportowanych danych NPC dla '+labels[region]+'.');td.colSpan=6;td.className='map-empty';tr.append(td);$('rows').append(tr);status('API odpowiada. Dla tej krainy nie ma jeszcze rekordów NPC.');return;}
  d.npcs.forEach(n=>{const tr=document.createElement('tr');[n.x,n.y,n.npc_type,n.name,n.level??'—',new Date(n.observedAt).toLocaleString('pl-PL')].forEach(v=>tr.append(cell(v)));$('rows').append(tr);});
  status('Pobrano '+d.count+' rekordów NPC dla '+labels[region]+'.');
 }catch(e){status('Nie udało się pobrać danych: '+e.message);}
}
$('load').addEventListener('click',load);$('region').addEventListener('change',load);load();
})();