(() => {
  const raw = window.TRADE_DATA || [];
  const itemSelect = document.querySelector('#item-filter');
  const countSelect = document.querySelector('#country-count');
  const chart = document.querySelector('#trade-chart');
  let mode = 'position';

  const items = [...new Set(raw.map(d => d.item))].sort((a,b) => a.localeCompare(b));
  itemSelect.innerHTML = '<option value="all">All product categories</option>' + items.map(i => `<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join('');

  document.querySelectorAll('.mode-button').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.mode;
    document.querySelectorAll('.mode-button').forEach(b => b.classList.toggle('is-active', b === button));
    updateText(); render();
  }));
  itemSelect.addEventListener('change', render);
  countSelect.addEventListener('change', render);
  window.addEventListener('resize', debounce(render, 120));

  function aggregate() {
    const selected = itemSelect.value;
    const byCountry = new Map();
    raw.forEach(d => {
      if (selected !== 'all' && d.item !== selected) return;
      if (!byCountry.has(d.country)) byCountry.set(d.country, {country:d.country, y2017:{exports:0,imports:0}, y2025:{exports:0,imports:0}});
      const target = d.year === 2017 ? byCountry.get(d.country).y2017 : byCountry.get(d.country).y2025;
      target.exports += d.exports;
      target.imports += d.imports;
    });
    let values = [...byCountry.values()].map(d => ({...d, total:d.y2017.exports+d.y2017.imports+d.y2025.exports+d.y2025.imports})).filter(d => d.total > 0);
    values.sort((a,b) => b.total-a.total);
    if (countSelect.value !== 'all') values = values.slice(0, Number(countSelect.value));
    return values;
  }

  function render() {
    const data = aggregate();
    chart.innerHTML = '';
    if (!data.length) { chart.innerHTML = '<p class="empty-state">No trade was reported for this selection.</p>'; return; }
    updateSummary(data);
    const width = Math.max(560, chart.clientWidth || 760), height = width < 680 ? 440 : 570;
    const margin = {top:26,right:32,bottom:58,left:72}, innerW=width-margin.left-margin.right, innerH=height-margin.top-margin.bottom;
    const allValues = data.flatMap(d => mode === 'position' ? [d.y2025.imports,d.y2025.exports] : [d.y2017.imports,d.y2017.exports,d.y2025.imports,d.y2025.exports]).filter(v => v>0);
    const minPow = Math.max(0, Math.floor(Math.log10(Math.min(...allValues))) - .2);
    const maxPow = Math.ceil(Math.log10(Math.max(...allValues)) + .15);
    const floor = 10 ** minPow, ceiling = 10 ** maxPow;
    const scaleX = v => margin.left + (Math.log10(Math.max(v,floor))-minPow)/(maxPow-minPow)*innerW;
    const scaleY = v => margin.top + innerH - (Math.log10(Math.max(v,floor))-minPow)/(maxPow-minPow)*innerH;
    const svg = node('svg',{viewBox:`0 0 ${width} ${height}`,'aria-hidden':'true'});
    const defs=node('defs'); const marker=node('marker',{id:'arrowhead',viewBox:'0 0 8 8',refX:'7',refY:'4',markerWidth:'5',markerHeight:'5',orient:'auto'}); marker.append(node('path',{d:'M 0 0 L 8 4 L 0 8 z',fill:'#00a6a6'})); defs.append(marker); svg.append(defs);
    for(let p=minPow;p<=maxPow;p++){
      const v=10**p, x=scaleX(v), y=scaleY(v);
      svg.append(node('line',{x1:x,y1:margin.top,x2:x,y2:margin.top+innerH,class:'grid-line'}));
      svg.append(node('line',{x1:margin.left,y1:y,x2:margin.left+innerW,y2:y,class:'grid-line'}));
      svg.append(textNode(x,margin.top+innerH+24,formatTick(v),'tick-label','middle'));
      svg.append(textNode(margin.left-12,y+4,formatTick(v),'tick-label','end'));
    }
    svg.append(node('line',{x1:scaleX(floor),y1:scaleY(floor),x2:scaleX(ceiling),y2:scaleY(ceiling),class:'balance-line'}));
    svg.append(textNode(margin.left+innerW/2,height-10,'Imports from partner country (US$)','axis-label','middle'));
    const ylabel=textNode(16,margin.top+innerH/2,'Exports to partner country (US$)','axis-label','middle'); ylabel.setAttribute('transform',`rotate(-90 16 ${margin.top+innerH/2})`); svg.append(ylabel);

    const labelSet = new Set(data.slice(0, countSelect.value==='all'?12:Math.min(12,data.length)).map(d=>d.country));
    data.slice().reverse().forEach(d => {
      if(mode==='change') drawMovement(svg,d,scaleX,scaleY,floor);
      const current=d.y2025, cx=scaleX(current.imports), cy=scaleY(current.exports);
      const circle=node('circle',{cx,cy,r:labelSet.has(d.country)?6:4.5,fill:current.exports>=current.imports?'#6658e8':'#707075',class:'trade-point',tabindex:'0','aria-label':`${d.country}: ${money(current.exports)} exports and ${money(current.imports)} imports in 2025`});
      bindTooltip(circle,d); svg.append(circle);
      if(labelSet.has(d.country)) svg.append(textNode(cx+9,cy-8,d.country,'country-label','start'));
    });
    chart.append(svg);
  }

  function drawMovement(svg,d,sx,sy,floor){
    const a=d.y2017,b=d.y2025;
    if((a.exports+a.imports===0)||(b.exports+b.imports===0)) return;
    svg.append(node('line',{x1:sx(Math.max(a.imports,floor)),y1:sy(Math.max(a.exports,floor)),x2:sx(Math.max(b.imports,floor)),y2:sy(Math.max(b.exports,floor)),class:'movement','marker-end':'url(#arrowhead)'}));
  }
  function bindTooltip(el,d){
    const show=e=>{ let tip=chart.querySelector('.tooltip'); if(!tip){tip=document.createElement('div');tip.className='tooltip';chart.append(tip);} tip.innerHTML=`<strong>${escapeHtml(d.country)}</strong><span><em>2025 exports</em>${money(d.y2025.exports)}</span><span><em>2025 imports</em>${money(d.y2025.imports)}</span><span><em>2017 exports</em>${money(d.y2017.exports)}</span><span><em>2017 imports</em>${money(d.y2017.imports)}</span>`; const box=chart.getBoundingClientRect(); const x=(e.clientX||box.left+box.width*.55)-box.left+14, y=(e.clientY||box.top+80)-box.top+14; tip.style.left=Math.min(x,box.width-215)+'px';tip.style.top=Math.max(4,y)+'px';};
    el.addEventListener('mousemove',show);el.addEventListener('mouseenter',show);el.addEventListener('focus',show);['mouseleave','blur'].forEach(n=>el.addEventListener(n,()=>chart.querySelector('.tooltip')?.remove()));
  }
  function updateSummary(data){
    const totals=data.reduce((a,d)=>({exports:a.exports+d.y2025.exports,imports:a.imports+d.y2025.imports}),{exports:0,imports:0});
    document.querySelector('#summary-exports').textContent=money(totals.exports);document.querySelector('#summary-imports').textContent=money(totals.imports);const balance=totals.exports-totals.imports;document.querySelector('#summary-balance').textContent=(balance>=0?'+':'−')+money(Math.abs(balance));
  }
  function updateText(){
    const change=mode==='change';document.querySelector('#reading-label').textContent=change?'Trade movement':'Trade position';document.querySelector('#reading-title').textContent=change?'Direction matters as much as size.':'Imports show dependence. Exports show reach.';document.querySelector('#reading-copy').textContent=change?'Each line traces a country from 2017 to 2025. Movement to the right signals greater import dependence; movement upward signals greater export reach.':'Countries above the diagonal buy more from Cincinnati than they sell to it. Countries below the line are more important as sources of imports.';document.querySelector('#chart-title').textContent=change?'How country relationships moved, 2017–2025':'Exports and imports, 2025';document.querySelector('#arrow-legend').hidden=!change;document.querySelector('#chart-note').textContent=change?'Arrowheads mark the 2025 position. Countries without reported trade in one of the two years appear only at their 2025 position.':'Distance from the diagonal indicates the size of the trade imbalance. Hover or focus on a country for details.';
  }
  function node(tag,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n}
  function textNode(x,y,value,cls,anchor){const n=node('text',{x,y,class:cls,'text-anchor':anchor});n.textContent=value;return n}
  function money(v){const abs=Math.abs(v);if(abs>=1e9)return '$'+(abs/1e9).toFixed(1)+'B';if(abs>=1e6)return '$'+(abs/1e6).toFixed(1)+'M';if(abs>=1e3)return '$'+(abs/1e3).toFixed(0)+'K';return '$'+abs.toLocaleString('en-US')}
  function formatTick(v){return v>=1e9?(v/1e9)+'B':v>=1e6?(v/1e6)+'M':v>=1e3?(v/1e3)+'K':String(v)}
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
  function debounce(fn,wait){let t;return()=>{clearTimeout(t);t=setTimeout(fn,wait)}}
  updateText();render();
})();
