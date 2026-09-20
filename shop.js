(function(){
  const grid=document.querySelector('.shop__grid[data-cat]'); if(!grid) return;
  const boxes=[...grid.querySelectorAll('.shop__filters input[type=checkbox]')];
  const sort=document.getElementById('sort'), list=grid.querySelector('.shop__list'), count=grid.querySelector('.shop__count'), pager=grid.querySelector('.pager');
  const orig={list:list.innerHTML,count:count.textContent};
  const cat=grid.dataset.cat, nsh=+grid.dataset.shards, tot=+grid.dataset.tot, PER=40;
  let all=null, shown=0, cur=[], more=null, clear=null;
  if(matchMedia('(max-width: 56rem)').matches) grid.querySelectorAll('.shop__filters details').forEach(d=>d.open=false);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const link=r=>r.h||('item.html?f='+cat+'-'+r.s+'&id='+encodeURIComponent(r.id));
  const opt=o=>o.replace(/:(?=\S)/,': ');
  const row=r=>{const h=link(r);return `<li class="shop__item"><a href="${h}"><img src="${r.img||'img/store/none.svg'}" alt="" width="80" height="80" loading="lazy"></a><div><a class="shop__name" href="${h}">${esc(r.n)}</a><div class="shop__meta"><span class="mono">Item # ${esc(r.id)}</span>${r.mfg?`<span>${esc(r.mfg)}</span>`:''}${(r.opts||[]).slice(0,2).map(o=>`<span>${esc(opt(o))}</span>`).join('')}</div></div><div class="shop__buy">${r.na?'<span>Call for availability</span><a class="btn btn--secondary" href="contact.html#question">Ask a branch</a>':`<span>per ${esc(r.um)} · <a href="signin.html">Sign in for price</a></span><form class="shop__qty" action="cart.html"><input class="input" type="number" name="qty" value="1" min="1" aria-label="Quantity"><button class="btn btn--primary" type="submit">Add to cart</button></form>`}</div></li>`;};
  async function load(){
    if(all) return all;
    const parts=await Promise.all([...Array(nsh)].map((_,i)=>fetch(`items-${cat}-${i}.json`).then(r=>r.json()).then(d=>d.rows.map(r=>(r.s=i,r)))));
    return all=parts.flat();
  }
  function active(){
    const g={};
    boxes.filter(b=>b.checked).forEach(b=>(g[b.dataset.k]=g[b.dataset.k]||new Set()).add(b.dataset.v));
    return g;
  }
  function match(r,g){
    for(const k in g){
      const vals=k==='mfg'?[r.mfg]:(r.opts||[]).filter(o=>o.startsWith(k+':')).map(o=>o.slice(k.length+1).trim());
      if(!vals.some(v=>g[k].has(v))) return false;
    }
    return true;
  }
  function renderMore(){
    const chunk=cur.slice(shown,shown+PER); shown+=chunk.length;
    list.insertAdjacentHTML('beforeend',chunk.map(row).join(''));
    if(more) more.hidden=shown>=cur.length;
  }
  function reset(){
    list.innerHTML=orig.list; count.textContent=orig.count;
    if(pager) pager.hidden=false; if(more) more.hidden=true; if(clear) clear.hidden=true;
  }
  async function apply(){
    const g=active(), s=sort.value;
    if(!Object.keys(g).length&&!s) return reset();
    count.textContent='Loading…';
    const rows=await load();
    cur=rows.filter(r=>match(r,g));
    if(s==='id-desc') cur=[...cur].reverse();
    else if(s==='mfg') cur=[...cur].sort((a,b)=>(a.mfg||'~').localeCompare(b.mfg||'~')||a.id.localeCompare(b.id));
    list.innerHTML=''; shown=0;
    if(pager) pager.hidden=true;
    if(!more){ more=document.createElement('div'); more.className='shop__more'; more.innerHTML='<button class="btn btn--secondary" type="button">Show more</button>'; list.after(more); more.firstChild.onclick=renderMore; }
    if(!clear){ clear=document.createElement('button'); clear.className='shop__clear'; clear.type='button'; clear.textContent='Clear filters'; count.after(clear); clear.onclick=()=>{boxes.forEach(b=>b.checked=false); sort.value=''; reset();}; }
    clear.hidden=!Object.keys(g).length;
    if(!cur.length){ list.innerHTML='<li class="shop__note">No products match those filters.</li>'; count.textContent=`0 of ${tot.toLocaleString()} products`; more.hidden=true; return; }
    count.textContent=`${cur.length.toLocaleString()} of ${tot.toLocaleString()} products`;
    renderMore();
  }
  boxes.forEach(b=>b.addEventListener('change',apply));
  sort.addEventListener('change',apply);
})();
