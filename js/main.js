/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  const n = CONFIG.nombre;
  document.getElementById('siteLogo').innerHTML = n.slice(0,-2)+'<b>'+n.slice(-2)+'</b>';
  document.getElementById('howPrice').textContent = CONFIG.precio + ' publicación';
  document.getElementById('payBig').textContent = CONFIG.precio;
  document.getElementById('footerWa').href = `https://wa.me/${CONFIG.whatsapp}`;

  // Check if returning from Stripe payment
  const params = new URLSearchParams(window.location.search);
  if(params.get('pago') === 'exitoso'){
    openSubmit();
    document.getElementById('smForm').style.display='none';
    document.getElementById('smSubhead').textContent='¡Pago completado!';
    document.getElementById('smSuccess').classList.add('show');
    showToast('✅ ¡Pago completado! Tu carro fue publicado.');
    window.history.replaceState({}, '', window.location.pathname);
  }

  loadListings();
});

/* ══════════════════════════════════════════
   AIRTABLE
══════════════════════════════════════════ */
const AT_URL = () =>
  `https://api.airtable.com/v0/${CONFIG.airtable_base}/${encodeURIComponent(CONFIG.airtable_table)}`;

const AT_HEADERS = () => ({
  'Authorization': `Bearer ${CONFIG.airtable_token}`,
  'Content-Type': 'application/json',
});

/* Demo listings — shown while Airtable loads or if not configured */
const DEMO = [
  {
    id:'d1', fields:{
      Marca:'Toyota', Modelo:'Corolla XLI', Anio:'2023', Version:'Full equipo',
      Precio:'RD$1,050,000', PrecioNum:1050000, Km:'22,000 km', Trans:'Automática',
      Fuel:'Gasolina', Color:'Blanco Perla', Zona:'Sto. Domingo Norte',
      Nombre:'Carlos M.', WA:'18091234567',
      Desc:'Un solo dueño, servicio cada 5,000 km en concesionario. Cámara de reversa, pantalla táctil 9", control de crucero, sensores de parqueo.',
      Tipo:'sedan', Foto:'', Destacado:true, Neg:'Negociable', Status:'Publicado',
    }
  },
  {
    id:'d2', fields:{
      Marca:'Hyundai', Modelo:'Tucson GLS', Anio:'2022', Version:'AWD Sport',
      Precio:'RD$1,680,000', PrecioNum:1680000, Km:'38,000 km', Trans:'Automática',
      Fuel:'Gasolina', Color:'Azul Metálico', Zona:'Santiago',
      Nombre:'María R.', WA:'18097654321',
      Desc:'Tracción total AWD, pantalla 10.25", Android Auto, Apple CarPlay, asientos calefaccionados, techo solar panorámico.',
      Tipo:'suv', Foto:'', Destacado:true, Neg:'Precio fijo', Status:'Publicado',
    }
  },
  {
    id:'d3', fields:{
      Marca:'Nissan', Modelo:'Frontier S', Anio:'2021', Version:'4x4 High',
      Precio:'RD$1,300,000', PrecioNum:1300000, Km:'54,000 km', Trans:'Manual',
      Fuel:'Diésel', Color:'Gris Oscuro', Zona:'San Pedro de Macorís',
      Nombre:'Pedro A.', WA:'18099876543',
      Desc:'Motor turbodiesel, diferencial trasero con bloqueo, ganchos de remolque, cama con bedliner. Ideal trabajo y aventura.',
      Tipo:'pickup', Foto:'', Destacado:false, Neg:'Negociable', Status:'Publicado',
    }
  },
  {
    id:'d4', fields:{
      Marca:'Honda', Modelo:'Civic Sport', Anio:'2021', Version:'Turbo 1.5L',
      Precio:'RD$820,000', PrecioNum:820000, Km:'47,000 km', Trans:'CVT',
      Fuel:'Gasolina', Color:'Rojo Rally', Zona:'La Romana',
      Nombre:'Ana L.', WA:'18094561230',
      Desc:'Honda Sensing, Apple CarPlay, luz LED ambiental, llantas originales sin desgaste. Sin accidentes.',
      Tipo:'sedan', Foto:'', Destacado:false, Neg:'Sí, acepto ofertas', Status:'Publicado',
    }
  },
  {
    id:'d5', fields:{
      Marca:'Kia', Modelo:'Sportage GT-Line', Anio:'2023', Version:'Full Turbo',
      Precio:'RD$2,100,000', PrecioNum:2100000, Km:'12,000 km', Trans:'Automática',
      Fuel:'Gasolina', Color:'Verde Esmeralda', Zona:'Sto. Domingo Este',
      Nombre:'Luis F.', WA:'18091112223',
      Desc:'5ta generación. Pantalla 12.3" dual, sistema Meridian, techo solar, asientos ventilados, cámara 360°.',
      Tipo:'suv', Foto:'', Destacado:true, Neg:'Precio fijo', Status:'Publicado',
    }
  },
  {
    id:'d6', fields:{
      Marca:'Toyota', Modelo:'RAV4 LE', Anio:'2020', Version:'AWD',
      Precio:'RD$1,450,000', PrecioNum:1450000, Km:'66,000 km', Trans:'Automática',
      Fuel:'Gasolina', Color:'Blanco', Zona:'Puerto Plata',
      Nombre:'José M.', WA:'18093334445',
      Desc:'Toyota Safety Sense, pantalla táctil 7", dos llaves, gomas nuevas, revisión completa.',
      Tipo:'suv', Foto:'', Destacado:false, Neg:'Negociable', Status:'Publicado',
    }
  },
];

let allListings = [];
let activeFilter = 'todos';

function loadListings(){
  const configured = CONFIG.airtable_token !== 'TU_TOKEN_AQUI' && CONFIG.airtable_base !== 'TU_BASE_ID_AQUI';

  if(!configured){
    // Use demo data if Airtable not set up yet
    allListings = DEMO;
    renderGrid(allListings);
    return;
  }

  const params = `?filterByFormula=${encodeURIComponent("Status='Publicado'")}&sort[0][field]=CreatedTime&sort[0][direction]=desc`;
  fetch(AT_URL() + params, { headers: AT_HEADERS() })
    .then(r => r.json())
    .then(data => {
      if(data.records && data.records.length > 0){
        allListings = data.records;
      } else {
        allListings = DEMO; // fallback to demo if empty
      }
      renderGrid(allListings);
    })
    .catch(() => {
      allListings = DEMO;
      renderGrid(allListings);
    });
}

/* ══════════════════════════════════════════
   RENDER
══════════════════════════════════════════ */
const EMOJIS = { sedan:'🚗', suv:'🚙', pickup:'🛻', hatch:'🚗', default:'🚗' };
const GRADIENTS = [
  'linear-gradient(135deg,#D8E8D8,#C8DCC8)',
  'linear-gradient(135deg,#D8DCE8,#C8CCE0)',
  'linear-gradient(135deg,#EDE8D8,#E0D8C8)',
  'linear-gradient(135deg,#E8E4EE,#DCD8E4)',
  'linear-gradient(135deg,#E8DDD8,#DCD0C8)',
  'linear-gradient(135deg,#D8EEE8,#C8E4DC)',
];

function getGrad(id){ return GRADIENTS[parseInt(id.replace(/\D/g,''))||0 % GRADIENTS.length] || GRADIENTS[0]; }
function getEmoji(f){ return EMOJIS[f.Tipo] || EMOJIS.default; }

function buildCardHTML(rec){
  const f = rec.fields;
  const waMsg = `Hola, vi tu ${f.Marca} ${f.Modelo} ${f.Anio} en CarroRD (${f.Precio}), ¿sigue disponible?`;
  const waLink = `https://wa.me/${(f.WA||'').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`;
  const isNeg = (f.Neg||'').includes('ace') || (f.Neg||'').includes('goc');
  const isNew = parseInt(f.Anio) >= 2022;
  const foto = (f.Foto && f.Foto.length > 0 && f.Foto[0]?.url) ? f.Foto[0].url : '';
  const grad = getGrad(rec.id);
  const emoji = getEmoji(f);

  const badges = [];
  if(f.Destacado) badges.push(`<span class="cbadge cb-feat">⭐ Destacado</span>`);
  if(isNew) badges.push(`<span class="cbadge cb-new">✨ Nuevo</span>`);
  if(isNeg) badges.push(`<span class="cbadge cb-neg">Negociable</span>`);

  return `
<div class="card" data-tipo="${f.Tipo||'sedan'}" data-id="${rec.id}">
  <div class="card-img" style="background:${grad}">
    ${foto ? `<img src="${foto}" alt="${f.Marca} ${f.Modelo}" loading="lazy" onerror="this.style.display='none'">` : ''}
    <span>${emoji}</span>
    <div class="c-badges">${badges.join('')}</div>
    <button class="card-fav" onclick="toggleFav(this,event)">♡</button>
  </div>
  <div class="card-body">
    <div class="c-price">${f.Precio || 'Consultar'}</div>
    <div class="c-name">${f.Marca} ${f.Modelo} ${f.Anio}${f.Version ? ' — '+f.Version : ''}</div>
    <div class="c-specs">
      <span class="cspec">${f.Km||''}</span>
      <span class="cspec">${f.Trans||''}</span>
      <span class="cspec">${f.Fuel||''}</span>
      ${f.Color ? `<span class="cspec">${f.Color}</span>` : ''}
    </div>
  </div>
  <div class="card-foot">
    <span class="c-loc">📍 ${f.Zona||''}</span>
    <div class="c-acts">
      <button class="btn-eye" onclick="openDetail('${rec.id}')" title="Ver detalles">🔍</button>
      <a href="${waLink}" target="_blank" class="btn-wa">💬 WhatsApp</a>
    </div>
  </div>
</div>`;
}

function renderGrid(list){
  const g = document.getElementById('grid');
  document.getElementById('navCt').textContent = list.length;
  document.getElementById('filterCt').textContent = list.length;

  if(!list.length){
    g.innerHTML = `<div class="empty-state"><h3>Sin resultados</h3><p>Prueba otro filtro o <a href="javascript:openSubmit()" style="color:var(--orange)">publica tu carro</a>.</p></div>`;
    return;
  }
  g.innerHTML = list.map(r => buildCardHTML(r)).join('');
}

/* ══════════════════════════════════════════
   FILTER & SORT (ADVANCED)
══════════════════════════════════════════ */
function filterCars(type, btn){
  activeFilter = type;
  document.querySelectorAll('.fp,.hpill').forEach(p => p.classList.remove('on','on-o'));
  if(btn){ btn.classList.add('on'); }
  applyFilters();
}

function toggleAdvFilters(){
  const panel = document.getElementById('advFilters');
  const btn = document.getElementById('btnToggleFilters');
  panel.classList.toggle('open');
  btn.classList.toggle('active');
}

let _debounceTimer;
function debouncedApplyFilters(){
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(applyFilters, 250);
}

function applyFilters(){
  let list = [...allListings];

  // Type filter
  if(activeFilter && activeFilter !== 'todos'){
    list = list.filter(r => r.fields.Tipo === activeFilter);
  }

  // Search text
  const q = (document.getElementById('searchInput').value||'').toLowerCase().trim();
  if(q){
    list = list.filter(r => {
      const f = r.fields;
      const haystack = `${f.Marca} ${f.Modelo} ${f.Version||''} ${f.Desc||''} ${f.Zona||''}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  // Price range
  const pMin = parseFloat(document.getElementById('afPrecioMin').value);
  const pMax = parseFloat(document.getElementById('afPrecioMax').value);
  if(pMin) list = list.filter(r => (r.fields.PrecioNum||0) >= pMin);
  if(pMax) list = list.filter(r => (r.fields.PrecioNum||0) <= pMax);

  // Year range
  const yMin = document.getElementById('afAnioMin').value;
  const yMax = document.getElementById('afAnioMax').value;
  if(yMin) list = list.filter(r => parseInt(r.fields.Anio) >= parseInt(yMin));
  if(yMax) list = list.filter(r => parseInt(r.fields.Anio) <= parseInt(yMax));

  // Transmission
  const trans = document.getElementById('afTrans').value;
  if(trans) list = list.filter(r => r.fields.Trans === trans);

  // Fuel
  const fuel = document.getElementById('afFuel').value;
  if(fuel) list = list.filter(r => r.fields.Fuel === fuel);

  // Zone
  const zona = document.getElementById('afZona').value;
  if(zona) list = list.filter(r => (r.fields.Zona||'').includes(zona));

  // Apply current sort
  const sortVal = document.querySelector('.sort-s')?.value || 'reciente';
  if(sortVal==='low') list.sort((a,b) => (a.fields.PrecioNum||0)-(b.fields.PrecioNum||0));
  else if(sortVal==='high') list.sort((a,b) => (b.fields.PrecioNum||0)-(a.fields.PrecioNum||0));
  else if(sortVal==='year') list.sort((a,b) => (parseInt(b.fields.Anio)||0)-(parseInt(a.fields.Anio)||0));

  renderActiveChips();
  renderGrid(list);
}

function sortListings(v){
  applyFilters();
}

function renderActiveChips(){
  const chips = [];
  const q = document.getElementById('searchInput').value.trim();
  if(q) chips.push({label:`Búsqueda: "${q}"`, clear:()=>{document.getElementById('searchInput').value='';applyFilters();}});
  const pMin = document.getElementById('afPrecioMin').value;
  if(pMin) chips.push({label:`Desde RD$${Number(pMin).toLocaleString()}`, clear:()=>{document.getElementById('afPrecioMin').value='';applyFilters();}});
  const pMax = document.getElementById('afPrecioMax').value;
  if(pMax) chips.push({label:`Hasta RD$${Number(pMax).toLocaleString()}`, clear:()=>{document.getElementById('afPrecioMax').value='';applyFilters();}});
  const yMin = document.getElementById('afAnioMin').value;
  if(yMin) chips.push({label:`Desde ${yMin}`, clear:()=>{document.getElementById('afAnioMin').value='';applyFilters();}});
  const yMax = document.getElementById('afAnioMax').value;
  if(yMax) chips.push({label:`Hasta ${yMax}`, clear:()=>{document.getElementById('afAnioMax').value='';applyFilters();}});
  const trans = document.getElementById('afTrans').value;
  if(trans) chips.push({label:trans, clear:()=>{document.getElementById('afTrans').value='';applyFilters();}});
  const fuel = document.getElementById('afFuel').value;
  if(fuel) chips.push({label:fuel, clear:()=>{document.getElementById('afFuel').value='';applyFilters();}});
  const zona = document.getElementById('afZona').value;
  if(zona) chips.push({label:zona, clear:()=>{document.getElementById('afZona').value='';applyFilters();}});

  const container = document.getElementById('activeChips');
  if(!chips.length){ container.innerHTML=''; return; }
  container.innerHTML = chips.map((c,i) =>
    `<span class="achip">${c.label}<button onclick="clearChip(${i})">✕</button></span>`
  ).join('') + `<span class="achip" style="cursor:pointer;background:var(--orange);color:#fff;border-color:var(--orange);" onclick="clearAllFilters()">Limpiar todo</span>`;
  window._activeChips = chips;
}

function clearChip(i){
  if(window._activeChips && window._activeChips[i]) window._activeChips[i].clear();
}

function clearAllFilters(){
  document.getElementById('searchInput').value='';
  document.getElementById('afPrecioMin').value='';
  document.getElementById('afPrecioMax').value='';
  document.getElementById('afAnioMin').value='';
  document.getElementById('afAnioMax').value='';
  document.getElementById('afTrans').value='';
  document.getElementById('afFuel').value='';
  document.getElementById('afZona').value='';
  activeFilter='todos';
  document.querySelectorAll('.fp').forEach((p,i) => {
    p.classList.remove('on');
    if(i===0) p.classList.add('on');
  });
  applyFilters();
}

/* ══════════════════════════════════════════
   DETAIL MODAL
══════════════════════════════════════════ */
function openDetail(id){
  const rec = allListings.find(r => r.id === id);
  if(!rec) return;
  const f = rec.fields;
  const foto = (f.Foto && f.Foto[0]?.url) ? f.Foto[0].url : '';
  const waMsg = `Hola, vi tu ${f.Marca} ${f.Modelo} ${f.Anio} en CarroRD (${f.Precio}), ¿sigue disponible?`;

  const imgEl = document.getElementById('mImg');
  imgEl.style.background = getGrad(id);
  imgEl.querySelector('img')?.remove();
  imgEl.querySelector('span')?.remove();
  if(foto){ const i=document.createElement('img'); i.src=foto; i.alt=''; imgEl.appendChild(i); }
  const em=document.createElement('span'); em.style.cssText='font-size:5.5rem;position:relative;z-index:1;'; em.textContent=getEmoji(f); imgEl.appendChild(em);

  document.getElementById('mPrice').textContent = f.Precio || 'Consultar';
  document.getElementById('mName').textContent = `${f.Marca} ${f.Modelo} ${f.Anio}${f.Version?' — '+f.Version:''}`;
  document.getElementById('mSpecs').innerHTML = `
    <div class="ms"><div class="sl">Kilometraje</div><div class="sv">${f.Km||'—'}</div></div>
    <div class="ms"><div class="sl">Transmisión</div><div class="sv">${f.Trans||'—'}</div></div>
    <div class="ms"><div class="sl">Combustible</div><div class="sv">${f.Fuel||'—'}</div></div>
    <div class="ms"><div class="sl">Color</div><div class="sv">${f.Color||'—'}</div></div>
    <div class="ms"><div class="sl">Año</div><div class="sv">${f.Anio||'—'}</div></div>
    <div class="ms"><div class="sl">Zona</div><div class="sv">${f.Zona||'—'}</div></div>`;
  document.getElementById('mDesc').textContent = f.Desc || 'Sin descripción adicional.';
  document.getElementById('mWaBtn').href = `https://wa.me/${(f.WA||'').replace(/\D/g,'')}?text=${encodeURIComponent(waMsg)}`;
  document.getElementById('mTelBtn').href = `tel:${f.WA||''}`;

  document.getElementById('mModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeMModal(){ document.getElementById('mModal').classList.remove('open'); document.body.style.overflow=''; }
document.getElementById('mModal').addEventListener('click',function(e){ if(e.target===this) closeMModal(); });

/* ══════════════════════════════════════════
   CLOUDINARY PHOTO UPLOAD
══════════════════════════════════════════ */
let uploadedPhotos = []; // [{url, public_id}]

function openCloudinaryWidget(){
  const cloudConfigured = CONFIG.cloudinary_cloud !== 'TU_CLOUD_NAME';

  if(!cloudConfigured){
    // Demo mode: simulate upload
    const demoUrls = [
      'https://placehold.co/400x300/EDE9E0/8A8A82?text=Foto+'+(uploadedPhotos.length+1),
    ];
    const url = demoUrls[0];
    if(uploadedPhotos.length >= 10){ showToast('⚠️ Máximo 10 fotos'); return; }
    uploadedPhotos.push({url, public_id:'demo_'+Date.now()});
    renderPhotoPreview();
    showToast('📷 Foto agregada (modo demo)');
    return;
  }

  if(uploadedPhotos.length >= 10){ showToast('⚠️ Máximo 10 fotos'); return; }

  const widget = cloudinary.createUploadWidget({
    cloudName: CONFIG.cloudinary_cloud,
    uploadPreset: CONFIG.cloudinary_preset,
    sources: ['local','camera'],
    multiple: true,
    maxFiles: 10 - uploadedPhotos.length,
    maxFileSize: 5000000,
    cropping: false,
    folder: 'carrord',
    resourceType: 'image',
    clientAllowedFormats: ['jpg','jpeg','png','webp'],
    styles: {
      palette: {
        window: '#FFFFFF', windowBorder: '#E85420',
        tabIcon: '#E85420', menuIcons: '#555',
        textDark: '#222', textLight: '#FFF',
        link: '#E85420', action: '#E85420',
        inactiveTabIcon: '#8A8A82', error: '#CC2222',
        inProgress: '#E85420', complete: '#22C55E',
        sourceBg: '#F2EFE9'
      }
    }
  }, (error, result) => {
    if(error){ showToast('❌ Error subiendo foto'); return; }
    if(result.event === 'success'){
      uploadedPhotos.push({
        url: result.info.secure_url,
        public_id: result.info.public_id
      });
      renderPhotoPreview();
    }
  });
  widget.open();
}

function renderPhotoPreview(){
  const container = document.getElementById('photoPreviews');
  document.getElementById('photoCount').textContent = uploadedPhotos.length;
  container.innerHTML = uploadedPhotos.map((p, i) =>
    `<div class="photo-prev">
      <img src="${p.url}" alt="Foto ${i+1}">
      <button class="pp-remove" onclick="removePhoto(${i})">✕</button>
    </div>`
  ).join('');
}

function removePhoto(index){
  uploadedPhotos.splice(index, 1);
  renderPhotoPreview();
}

/* ══════════════════════════════════════════
   SUBMIT FORM + STRIPE
══════════════════════════════════════════ */
function openSubmit(){
  document.getElementById('sModal').classList.add('open');
  document.body.style.overflow='hidden';
}
function closeSubmit(){
  document.getElementById('sModal').classList.remove('open');
  document.body.style.overflow='';
  document.getElementById('smForm').style.display='block';
  document.getElementById('smSuccess').classList.remove('show');
  document.getElementById('submitBtn').disabled=false;
  document.getElementById('submitTxt').textContent='Continuar al pago →';
  document.getElementById('smSubhead').textContent='Completa el formulario — publicamos al instante';
}
document.getElementById('sModal').addEventListener('click',function(e){ if(e.target===this) closeSubmit(); });

async function submitForm(){
  // Validation
  const required = ['fMarca','fModelo','fAnio','fKm','fTrans','fFuel','fPrecio','fZona','fNombre','fWA'];
  for(const id of required){
    const el=document.getElementById(id);
    if(!el.value.trim()){ el.focus(); showToast('⚠️ Completa todos los campos requeridos'); return; }
  }

  if(uploadedPhotos.length < 1){
    showToast('⚠️ Sube al menos 1 foto de tu carro');
    return;
  }

  const btn=document.getElementById('submitBtn');
  const txt=document.getElementById('submitTxt');
  btn.disabled=true; txt.textContent='Guardando...';

  const marca  = document.getElementById('fMarca').value;
  const modelo = document.getElementById('fModelo').value.trim();
  const anio   = document.getElementById('fAnio').value;
  const precio = 'RD$'+document.getElementById('fPrecio').value.trim().replace('RD$','');

  const tipoMap = {
    Toyota:'sedan', Honda:'sedan', BMW:'sedan', 'Mercedes-Benz':'sedan',
    Volkswagen:'sedan', Mazda:'sedan', Audi:'sedan',
    Hyundai:'suv', Kia:'suv', Mitsubishi:'suv', Jeep:'suv', Subaru:'suv',
    Nissan:'pickup', Ford:'pickup', Chevrolet:'pickup',
  };

  const payload = {
    fields: {
      Marca:     marca,
      Modelo:    modelo,
      Anio:      anio,
      Version:   document.getElementById('fVersion').value.trim(),
      Precio:    precio,
      PrecioNum: parseFloat(document.getElementById('fPrecio').value.replace(/[^\d.]/g,'')),
      Km:        document.getElementById('fKm').value.trim(),
      Trans:     document.getElementById('fTrans').value,
      Fuel:      document.getElementById('fFuel').value,
      Color:     document.getElementById('fColor').value.trim(),
      Zona:      document.getElementById('fZona').value,
      Desc:      document.getElementById('fDesc').value.trim(),
      Nombre:    document.getElementById('fNombre').value.trim(),
      WA:        document.getElementById('fWA').value.replace(/\D/g,''),
      Neg:       document.getElementById('fNeg').value,
      Tipo:      tipoMap[marca] || 'sedan',
      Status:    'Pendiente Pago',
      Destacado: false,
      Foto:      uploadedPhotos.map(p => ({url: p.url})),
    }
  };

  const atConfigured = CONFIG.airtable_token !== 'TU_TOKEN_AQUI';
  const stripeConfigured = CONFIG.stripe_payment_link !== 'TU_PAYMENT_LINK_URL';

  if(atConfigured){
    try {
      const res = await fetch(AT_URL(), {
        method: 'POST',
        headers: AT_HEADERS(),
        body: JSON.stringify(payload),
      });
      if(!res.ok) throw new Error('API error');
    } catch(e){
      showToast('❌ Error al guardar. Intenta de nuevo.');
      btn.disabled=false; txt.textContent='Continuar al pago →';
      return;
    }
  }

  // Redirect to Stripe or show success in demo mode
  if(stripeConfigured){
    txt.textContent='Redirigiendo a pago...';
    const returnUrl = window.location.origin + window.location.pathname + '?pago=exitoso';
    const stripeUrl = CONFIG.stripe_payment_link +
      (CONFIG.stripe_payment_link.includes('?') ? '&' : '?') +
      'prefilled_email=&client_reference_id=' + encodeURIComponent(`${marca}-${modelo}-${anio}`);
    window.location.href = stripeUrl;
  } else {
    // Demo mode: show success directly
    document.getElementById('smForm').style.display='none';
    document.getElementById('smSubhead').textContent='¡Publicación exitosa!';
    document.getElementById('smSuccess').classList.add('show');
    showToast('✅ ¡Publicado! (modo demo — configura Stripe para cobrar)');
  }
}

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function toggleFav(btn, e){
  e.stopPropagation();
  btn.classList.toggle('on');
  btn.textContent = btn.classList.contains('on') ? '♥' : '♡';
  showToast(btn.classList.contains('on') ? '❤️ Guardado' : 'Removido de favoritos');
}

function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.remove('show'),3000);
}
