(() => {
  'use strict';

  const STORAGE_KEY = 'mimapa:antioquia:visitados';
  const THEME_KEY   = 'mimapa:tema';

  const svgGroup     = document.getElementById('regiones');
  const regionListEl = document.getElementById('regionList');
  const searchInput  = document.getElementById('searchInput');
  const progressCount= document.getElementById('progressCount');
  const progressTotal= document.getElementById('progressTotal');
  const progressFill = document.getElementById('progressFill');
  const toastEl      = document.getElementById('toast');

  let regionsData = []; 
  let visited = loadVisited();

  function slugify(str) {
    return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function loadVisited() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveVisited() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
    } catch (e) {}
  }

  // 1. CARGAR SVG DE MAP_DATA AL DOM
  function loadMapFromData() {
    svgGroup.innerHTML = ''; 
    const parser = new DOMParser();

    // Parsear el string de cada subregión y extraer solo las figuras
    Object.keys(MAP_DATA).forEach(subregion => {
      const doc = parser.parseFromString(MAP_DATA[subregion], 'image/svg+xml');
      const shapes = doc.querySelectorAll('[data-name]'); // Selecciona paths y polygons
      
      shapes.forEach(shape => {
        svgGroup.appendChild(shape.cloneNode(true));
      });
    });

    // 2. EXTRAER E INDEXAR MUNICIPIOS
    const shapeElements = Array.from(svgGroup.querySelectorAll('[data-name]'));
    const mapTemp = new Map();

    shapeElements.forEach(el => {
      const name = el.dataset.name.trim();
      const id = slugify(name);
      
      el.dataset.id = id; 
      el.classList.add('region'); 

      if (!mapTemp.has(id)) {
        mapTemp.set(id, { id, name });
      }
    });

    regionsData = Array.from(mapTemp.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'));

    buildList();
    syncUI();
  }

  function toggleRegion(id) {
    if (visited.has(id)) visited.delete(id);
    else visited.add(id);
    saveVisited();
    syncUI();
  }

  // 3. SINCRONIZAR COLOR DE MAPA Y LISTA
  function syncUI() {
    regionsData.forEach(r => {
      const shapes = svgGroup.querySelectorAll(`[data-id="${r.id}"]`);
      shapes.forEach(shape => shape.classList.toggle('visitado', visited.has(r.id)));
    });

    regionListEl.querySelectorAll('.region-row').forEach(row => {
      row.classList.toggle('visitado', visited.has(row.dataset.id));
    });

    const total = regionsData.length;
    const count = visited.size;
    progressCount.textContent = count;
    progressTotal.textContent = total;
    progressFill.style.width = total ? `${(count / total) * 100}%` : '0%';
  }

  function buildList(filter = '') {
    const term = filter.trim().toLowerCase();
    const filtered = regionsData.filter(r => r.name.toLowerCase().includes(term));

    regionListEl.innerHTML = '';

    if (filtered.length === 0) {
      regionListEl.innerHTML = '<li class="region-list-empty">No se encontraron municipios</li>';
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach(r => {
      const li = document.createElement('li');
      li.className = 'region-row' + (visited.has(r.id) ? ' visitado' : '');
      li.dataset.id = r.id;

      li.innerHTML = `
        <span class="region-name">${r.name}</span>
        <div class="region-check">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
      `;

      li.addEventListener('click', () => toggleRegion(r.id));
      frag.appendChild(li);
    });

    regionListEl.appendChild(frag);
  }

  searchInput.addEventListener('input', () => buildList(searchInput.value));

  // CLIC DIRECTO EN EL MAPA
  document.getElementById('mapaSvg').addEventListener('click', e => {
    const shape = e.target.closest('[data-name]');
    if (!shape) return;
    const id = shape.dataset.id || slugify(shape.dataset.name);
    toggleRegion(id);
  });

  // Inicializar
  loadMapFromData();
})();