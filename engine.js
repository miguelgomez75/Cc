// ═══════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════
let currentMode  = 'replicube';
let voxelMap     = {};
let paintPixels  = {};
let bgPaletteIdx = 0;
let showGrid = true, showAxes = true;
let gridSize = 6;
let clipX = 6, clipY = 6, clipZ = 6;

// ═══════════════════════════════════════════════════════════
//  THREE.JS SETUP
// ═══════════════════════════════════════════════════════════
const threeCanvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas: threeCanvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x090b0f, 1);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
scene.add(new THREE.AmbientLight(0x334455, 1.2));
const dl = new THREE.DirectionalLight(0xffffff, 1.0);
dl.position.set(20, 30, 20); scene.add(dl);
const dl2 = new THREE.DirectionalLight(0x4488ff, 0.3);
dl2.position.set(-10, -10, -10); scene.add(dl2);

const voxGeo     = new THREE.BoxGeometry(0.95, 0.95, 0.95);
const voxelGroup = new THREE.Group(); scene.add(voxelGroup);

// ── Grid ──
let gridHelper = null;
function buildGrid() {
  if (gridHelper) scene.remove(gridHelper);
  if (!showGrid) return;
  const s = gridSize * 2 + 1;
  gridHelper = new THREE.GridHelper(s, s, 0x1c2a3a, 0x1c2a3a);
  gridHelper.position.y = -(gridSize + 0.5);
  scene.add(gridHelper);
}
buildGrid();

// ── Custom axes ──
let axesGroup = null;
function buildAxes() {
  if (axesGroup) scene.remove(axesGroup);
  if (!showAxes) return;
  axesGroup = new THREE.Group();
  const mkLine = (color, end) => {
    const mat = new THREE.LineBasicMaterial({ color });
    const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0), end]);
    return new THREE.Line(geo, mat);
  };
  axesGroup.add(mkLine(0xff2244, new THREE.Vector3(clipX, 0, 0)));
  axesGroup.add(mkLine(0x39ff14, new THREE.Vector3(0, clipY, 0)));
  axesGroup.add(mkLine(0x4499ff, new THREE.Vector3(0, 0, clipZ)));
  scene.add(axesGroup);
}
buildAxes();

// ── Bounding box ──
let boundingBox = null;
function buildBoundingBox() {
  if (boundingBox) { scene.remove(boundingBox); boundingBox.geometry.dispose(); }
  const s = gridSize * 2 + 1;
  boundingBox = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s)),
    new THREE.LineBasicMaterial({ color: 0x1c2a3a })
  );
  scene.add(boundingBox);
}
buildBoundingBox();

// ── Camera orbit ──
let isDragging = false, lastX = 0, lastY = 0;
let theta = 0.7, phi = 0.6, radius = gridSize * 4 + 4;
function updateCamera() {
  camera.position.set(
    radius * Math.sin(theta) * Math.cos(phi),
    radius * Math.sin(phi),
    radius * Math.cos(theta) * Math.cos(phi)
  );
  camera.lookAt(0, 0, 0);
}
updateCamera();

threeCanvas.addEventListener('mousedown', e => { isDragging=true; lastX=e.clientX; lastY=e.clientY; });
window.addEventListener('mouseup', () => isDragging=false);
window.addEventListener('mousemove', e => {
  if (!isDragging || currentMode!=='replicube') return;
  theta -= (e.clientX-lastX)*0.01;
  phi = Math.max(-1.4, Math.min(1.4, phi+(e.clientY-lastY)*0.01));
  lastX=e.clientX; lastY=e.clientY; updateCamera();
});
threeCanvas.addEventListener('wheel', e => {
  radius = Math.max(5, Math.min(120, radius+e.deltaY*0.05));
  updateCamera(); e.preventDefault();
}, {passive:false});

let ltx=0, lty=0;
threeCanvas.addEventListener('touchstart', e => { ltx=e.touches[0].clientX; lty=e.touches[0].clientY; });
threeCanvas.addEventListener('touchmove', e => {
  if (currentMode!=='replicube') return;
  theta -= (e.touches[0].clientX-ltx)*0.015;
  phi = Math.max(-1.4, Math.min(1.4, phi+(e.touches[0].clientY-lty)*0.015));
  ltx=e.touches[0].clientX; lty=e.touches[0].clientY; updateCamera(); e.preventDefault();
}, {passive:false});

function resizeRenderer() {
  const vp = document.getElementById('viewport');
  const w = vp.clientWidth, h = vp.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resizeRenderer).observe(document.getElementById('viewport'));
resizeRenderer();

// ── Animate + annotation overlay ──
const annoCanvas = document.getElementById('anno-canvas');
const annoCtx    = annoCanvas.getContext('2d');

function drawAnnotations() {
  // sync size to viewport (only reallocates when actually changed)
  const vp = document.getElementById('viewport');
  const W = vp.clientWidth, H = vp.clientHeight;
  if (annoCanvas.width !== W)  annoCanvas.width  = W;
  if (annoCanvas.height !== H) annoCanvas.height = H;
  annoCtx.clearRect(0, 0, W, H);
  if (currentMode !== 'replicube' || W === 0 || H === 0) return;

  camera.updateMatrixWorld();

  function project(v3) {
    const v = v3.clone().project(camera);
    return { x: (v.x*0.5+0.5)*W, y: (-v.y*0.5+0.5)*H, behind: v.z >= 1 };
  }

  const g   = gridSize;
  const cp  = camera.position;
  const ctx = annoCtx;
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // For each axis pick the most visible parallel edge
  [
    { axis:'x', color:'#ff4466' },
    { axis:'y', color:'#44ff88' },
    { axis:'z', color:'#55aaff' },
  ].forEach(({ axis, color }) => {
    // 4 candidate edges per axis — pick the one whose outward normal faces camera most
    const signs = [[-1,-1],[-1,1],[1,-1],[1,1]];
    let bestScore = -Infinity, bs1 = 1, bs2 = 1;
    signs.forEach(([s1,s2]) => {
      let nx=0, ny=0, nz=0;
      if (axis==='x') { ny=s1; nz=s2; }
      else if (axis==='y') { nx=s1; nz=s2; }
      else { nx=s1; ny=s2; }
      const score = nx*cp.x + ny*cp.y + nz*cp.z;
      if (score > bestScore) { bestScore=score; bs1=s1; bs2=s2; }
    });

    function edgePt(t) {
      if (axis==='x') return new THREE.Vector3(t,      bs1*g, bs2*g);
      if (axis==='y') return new THREE.Vector3(bs1*g,  t,     bs2*g);
      return                new THREE.Vector3(bs1*g, bs2*g,   t);
    }

    const pA = project(edgePt(-g));
    const pB = project(edgePt( g));
    if (pA.behind && pB.behind) return;

    const edgeDx = pB.x - pA.x, edgeDy = pB.y - pA.y;
    const edgeLen = Math.sqrt(edgeDx*edgeDx + edgeDy*edgeDy);
    if (edgeLen < 10) return;

    // Perp vector pointing away from screen center
    const midX = (pA.x+pB.x)/2, midY = (pA.y+pB.y)/2;
    let px = -edgeDy/edgeLen, py = edgeDx/edgeLen;
    if ((midX - W/2)*px + (midY - H/2)*py < 0) { px=-px; py=-py; }

    // Draw tick + label for every integer
    for (let v = -g; v <= g; v++) {
      const tp = project(edgePt(v));
      if (tp.behind) continue;

      const isZero  = v === 0;
      const isEdge  = v === -g || v === g;
      const alpha   = isEdge ? 1.0 : isZero ? 0.95 : 0.60;
      const tickEnd = isEdge ? 10 : isZero ? 9 : 6;
      const lw      = isZero || isEdge ? 1.5 : 0.8;

      // tick mark
      ctx.beginPath();
      ctx.moveTo(tp.x + px*3, tp.y + py*3);
      ctx.lineTo(tp.x + px*tickEnd, tp.y + py*tickEnd);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth   = lw;
      ctx.stroke();

      // number label (skip crowded middle ones for large grids)
      const skipLabel = (g > 6 && !isEdge && !isZero && Math.abs(v) % 2 !== 0);
      if (!skipLabel) {
        ctx.fillStyle   = color;
        ctx.globalAlpha = alpha;
        ctx.fillText(String(v), tp.x + px*18, tp.y + py*18);
      }
    }
    ctx.globalAlpha = 1;
  });
}

// ── Voxel meshes (with clip) ──
const matCache = {};
function getMat(r,g,b) {
  const k = Math.round(r*20)+','+Math.round(g*20)+','+Math.round(b*20);
  if (!matCache[k]) matCache[k] = new THREE.MeshLambertMaterial({color:new THREE.Color(r,g,b)});
  return matCache[k];
}
function rebuildMeshes() {
  while (voxelGroup.children.length) {
    voxelGroup.children[0].geometry.dispose();
    voxelGroup.remove(voxelGroup.children[0]);
  }
  const entries = Object.entries(voxelMap);
  const visible = entries.filter(([key]) => {
    const [x,y,z] = key.split(',').map(Number);
    return x <= clipX && y <= clipY && z <= clipZ;
  });
  document.getElementById('voxel-count').textContent =
    entries.length + (visible.length < entries.length ? ' ('+visible.length+' vis.)' : '');

  const byColor = {};
  for (const [key,rgb] of visible) {
    const ck = Math.round(rgb[0]*20)+','+Math.round(rgb[1]*20)+','+Math.round(rgb[2]*20);
    if (!byColor[ck]) byColor[ck] = { rgb, positions:[] };
    byColor[ck].positions.push(key.split(',').map(Number));
  }
  const dummy = new THREE.Object3D();
  for (const {rgb, positions} of Object.values(byColor)) {
    const mesh = new THREE.InstancedMesh(voxGeo, getMat(...rgb), positions.length);
    positions.forEach((pos,i) => {
      dummy.position.set(...pos); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    voxelGroup.add(mesh);
  }
}

function clearAll() {
  if (currentMode==='replicube') { voxelMap={}; rebuildMeshes(); logMsg('// cleared','log-info'); }
  else { paintPixels={}; bgPaletteIdx=0; redrawPaint(); logMsg('// canvas cleared','log-info'); }
}

(function animate() {
  requestAnimationFrame(animate);
  if (currentMode === 'replicube') {
    renderer.render(scene, camera);
    drawAnnotations();
  }
})();

// ═══════════════════════════════════════════════════════════
//  REPLIPAINT
// ═══════════════════════════════════════════════════════════
const paintCanvas = document.getElementById('paint-canvas');
const paintCtx    = paintCanvas.getContext('2d');
let paintOffX=0, paintOffY=0, paintScale=8;
let paintDragging=false, paintLastX=0, paintLastY=0;

function worldToScreen(wx,wy) {
  return [(wx-paintOffX)*paintScale+paintCanvas.width/2, (wy-paintOffY)*paintScale+paintCanvas.height/2];
}
function redrawPaint() {
  paintCanvas.width=paintCanvas.offsetWidth; paintCanvas.height=paintCanvas.offsetHeight;
  const ctx=paintCtx;
  if (bgPaletteIdx>0) {
    const bg=paletteRGB(bgPaletteIdx);
    ctx.fillStyle = bg ? `rgb(${Math.round(bg[0]*255)},${Math.round(bg[1]*255)},${Math.round(bg[2]*255)})` : '#090b0f';
  } else { ctx.fillStyle='#090b0f'; }
  ctx.fillRect(0,0,paintCanvas.width,paintCanvas.height);
  if (paintScale>=4) {
    ctx.fillStyle='rgba(30,42,58,0.8)';
    const sx=Math.floor(paintOffX-paintCanvas.width/2/paintScale), ex=Math.ceil(paintOffX+paintCanvas.width/2/paintScale);
    const sy=Math.floor(paintOffY-paintCanvas.height/2/paintScale), ey=Math.ceil(paintOffY+paintCanvas.height/2/paintScale);
    for (let wx=sx;wx<=ex;wx++) for (let wy=sy;wy<=ey;wy++) {
      const[px,py]=worldToScreen(wx,wy); ctx.fillRect(px-.5,py-.5,1,1);
    }
  }
  const[ox,oy]=worldToScreen(0,0);
  ctx.strokeStyle='rgba(0,212,255,0.2)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(ox,0); ctx.lineTo(ox,paintCanvas.height); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0,oy); ctx.lineTo(paintCanvas.width,oy); ctx.stroke();
  const sz=Math.max(1,paintScale-(paintScale>4?1:0));
  for (const[key,rgb] of Object.entries(paintPixels)) {
    const[wx,wy]=key.split(',').map(Number);
    const[px,py]=worldToScreen(wx,wy);
    ctx.fillStyle=`rgb(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)})`;
    ctx.fillRect(px-sz/2,py-sz/2,sz,sz);
  }
}
paintCanvas.addEventListener('mousedown', e=>{ if(e.button===1||e.altKey){paintDragging=true;paintLastX=e.clientX;paintLastY=e.clientY;} });
window.addEventListener('mouseup',()=>{ paintDragging=false; });
window.addEventListener('mousemove', e=>{
  if (!paintDragging||currentMode!=='replipaint') return;
  paintOffX-=(e.clientX-paintLastX)/paintScale; paintOffY-=(e.clientY-paintLastY)/paintScale;
  paintLastX=e.clientX; paintLastY=e.clientY; redrawPaint();
});
paintCanvas.addEventListener('wheel',e=>{ paintScale=Math.max(1,Math.min(64,paintScale*(e.deltaY<0?1.2:0.85))); redrawPaint(); e.preventDefault(); },{passive:false});
paintCanvas.addEventListener('contextmenu',e=>e.preventDefault());

// ═══════════════════════════════════════════════════════════
//  LUA HELPERS
// ═══════════════════════════════════════════════════════════
function getLuaHelpers() {
  return `
function abs(x)   return math.abs(x) end
function floor(x) return math.floor(x) end
function ceil(x)  return math.ceil(x) end
function round(x) return math.floor(x+0.5) end
function sqrt(x)  return math.sqrt(x) end
function sin(x)   return math.sin(x) end
function cos(x)   return math.cos(x) end
function tan(x)   return math.tan(x) end
function asin(x)  return math.asin(x) end
function acos(x)  return math.acos(x) end
function atan(y,x) if x==nil then return math.atan(y) else return math.atan(y,x) end end
function min(a,b,...) return math.min(a,b,...) end
function max(a,b,...) return math.max(a,b,...) end
function log(x)   return math.log(x) end
PI   = math.pi
SIZE = ` + gridSize + `
EMPTY=0 WHITE=1 GREY=2 BLACK=3 PEACH=4 PINK=5 PURPLE=6 RED=7
ORANGE=8 YELLOW=9 LIGHTGREEN=10 GREEN=11 DARKBLUE=12 BLUE=13 LIGHTBLUE=14 BROWN=15 DARKBROWN=16
function step(a,v)    return a>v and 1 or 0 end
function sign(a)      if a>0 then return 1 elseif a<0 then return -1 else return 0 end end
function clamp(v,a,b) return math.min(b,math.max(a,v)) end
function inrange(v,a,b) return v>=a and v<=b end
function mix(a,b,t)   return a+(b-a)*t end
function lerp(a,b,t)  return mix(a,b,t) end
function btoi(a)      return a and 1 or 0 end
function pow(a,b)     return a^b end
`;
}

// ═══════════════════════════════════════════════════════════
//  RUN
// ═══════════════════════════════════════════════════════════
function runCode() {
  const code = document.getElementById('code-editor').value;
  clearConsole(); updateTokenCount();
  try {
    if (currentMode==='replicube') runReplicube(code);
    else runReplipaint(code);
  } catch(e) { logMsg('// runtime error: '+e.message,'log-error'); }
}

function runReplicube(userCode) {
  const stagingMap = {};
  const logs = []; const MAX = 15000; let n = 0;
  const gs = gridSize;

  const luaCode = getLuaHelpers() + `
local _print=_jsprint
function print(...)
  local p={} for _,v in ipairs({...}) do p[#p+1]=tostring(v) end
  _print(table.concat(p,"\\t"))
end
local function _cell(x,y,z)
` + userCode + `
end
for x=-` + gs + `,` + gs + ` do
for y=-` + gs + `,` + gs + ` do
for z=-` + gs + `,` + gs + ` do
  local c=_cell(x,y,z)
  if type(c)=="number" and c>0 then _jscell(x,y,z,c) end
end end end
`;

  execLua(luaCode, {
    _jscell: (state) => {
      if (n >= MAX) return 0;
      const x=fengari.lua.lua_tonumber(state,1);
      const y=fengari.lua.lua_tonumber(state,2);
      const z=fengari.lua.lua_tonumber(state,3);
      const ci=fengari.lua.lua_tonumber(state,4);
      const rgb=paletteRGB(ci);
      if (rgb) { stagingMap[x+','+y+','+z]=rgb; n++; }
      return 0;
    },
    _jsprint: (state) => {
      logs.push(fengari.to_jsstring(fengari.lua.lua_tostring(state,1)||fengari.to_luastring('')));
      return 0;
    }
  }, (err) => {
    if (err) { logMsg('// error: '+err,'log-error'); }
    else {
      voxelMap = stagingMap; rebuildMeshes();
      logMsg('// ok — '+Object.keys(voxelMap).length+' voxels','log-success');
      if (n >= MAX) logMsg('// aviso: límite ('+MAX+') alcanzado','log-error');
      logs.forEach(l => logMsg('// '+l,'log-line'));
    }
  });
}

function runReplipaint(userCode) {
  const stagingPixels = {}; let stagingBg = 0;
  const logs = []; const MAX = 200000; let n = 0;
  const W=Math.ceil(paintCanvas.offsetWidth /2/paintScale)+2;
  const H=Math.ceil(paintCanvas.offsetHeight/2/paintScale)+2;
  const x0=Math.floor(paintOffX)-W, x1=Math.floor(paintOffX)+W;
  const y0=Math.floor(paintOffY)-H, y1=Math.floor(paintOffY)+H;

  const luaCode = getLuaHelpers() + `
local _print=_jsprint
local _setbg=_jssetbg
function print(...)
  local p={} for _,v in ipairs({...}) do p[#p+1]=tostring(v) end
  _print(table.concat(p,"\\t"))
end
function fill(c) _setbg(c or 0) end
local function _pixel(x,y)
` + userCode + `
end
for x=` + x0 + `,` + x1 + ` do for y=` + y0 + `,` + y1 + ` do
  local c=_pixel(x,y)
  if type(c)=="number" and c>0 then _jspixel(x,y,c) end
end end
`;

  execLua(luaCode, {
    _jspixel: (state) => {
      if (n >= MAX) return 0;
      const x=Math.round(fengari.lua.lua_tonumber(state,1));
      const y=Math.round(fengari.lua.lua_tonumber(state,2));
      const ci=fengari.lua.lua_tonumber(state,3);
      const rgb=paletteRGB(ci);
      if (rgb) { stagingPixels[x+','+y]=rgb; n++; }
      return 0;
    },
    _jssetbg: (state) => { stagingBg=fengari.lua.lua_tonumber(state,1); return 0; },
    _jsprint: (state) => {
      logs.push(fengari.to_jsstring(fengari.lua.lua_tostring(state,1)||fengari.to_luastring('')));
      return 0;
    }
  }, (err) => {
    if (err) { logMsg('// error: '+err,'log-error'); }
    else {
      paintPixels=stagingPixels; bgPaletteIdx=stagingBg; redrawPaint();
      logMsg('// ok — '+Object.keys(paintPixels).length+' pixels','log-success');
      if (n >= MAX) logMsg('// aviso: límite alcanzado','log-error');
      logs.forEach(l => logMsg('// '+l,'log-line'));
    }
  });
}

function execLua(luaCode, fns, cb) {
  try {
    const L = fengari.lauxlib.luaL_newstate();
    fengari.lualib.luaL_openlibs(L);
    const { lua, lauxlib } = fengari;
    for (const [name,fn] of Object.entries(fns)) {
      lua.lua_pushcfunction(L, fn);
      lua.lua_setglobal(L, fengari.to_luastring(name));
    }
    const status = lauxlib.luaL_dostring(L, fengari.to_luastring(luaCode));
    if (status !== fengari.lua.LUA_OK) {
      cb(fengari.to_jsstring(lua.lua_tostring(L,-1)).replace(/\[string.*?\]:/,'line'));
    } else { cb(null); }
  } catch(e) { cb(e.message); }
}

// ═══════════════════════════════════════════════════════════
//  UI FUNCTIONS
// ═══════════════════════════════════════════════════════════
function logMsg(text, cls='log-line') {
  const div=document.getElementById('console');
  const span=document.createElement('div');
  span.className=cls; span.textContent=text;
  div.appendChild(span); div.scrollTop=div.scrollHeight;
}
function clearConsole() { document.getElementById('console').innerHTML=''; }
function resetCamera() { theta=0.7; phi=0.6; radius=gridSize*4+4; updateCamera(); }
function toggleGrid()  { showGrid=!showGrid; buildGrid(); document.getElementById('grid-btn').classList.toggle('active',showGrid); }
function toggleAxes()  { showAxes=!showAxes; buildAxes(); document.getElementById('axes-btn').classList.toggle('active',showAxes); }
function toggleDocs()  { document.getElementById('docs-panel').classList.toggle('open'); }

function onSizeSlider(val) {
  gridSize = parseInt(val);
  document.getElementById('size-val').textContent = gridSize;
  clipX = clipY = clipZ = gridSize;
  ['x','y','z'].forEach(ax => {
    const sl = document.getElementById('clip-'+ax);
    if (sl) { sl.min = -gridSize; sl.max = gridSize; sl.value = gridSize; }
    const lb = document.getElementById('clip-'+ax+'-val');
    if (lb) lb.textContent = gridSize;
  });
  voxelMap = {}; rebuildMeshes();
  buildGrid(); buildAxes(); buildBoundingBox();
  resetCamera();
  logMsg('// tamaño cambiado a ±'+gridSize+' — vuelve a ejecutar','log-info');
}

function onClipSlider(axis, val) {
  const v = parseInt(val);
  document.getElementById('clip-'+axis+'-val').textContent = v;
  if (axis==='x') clipX=v;
  else if (axis==='y') clipY=v;
  else clipZ=v;
  buildAxes();
  rebuildMeshes();
}

function updateTokenCount() {
  const code = document.getElementById('code-editor').value;
  document.getElementById('token-count').textContent = 'tokens: '+(code.trim()===''?0:code.trim().split(/\s+/).length);
}
function exportPNG() {
  if (currentMode==='replicube') {
    renderer.render(scene,camera);
    const a=document.createElement('a'); a.href=threeCanvas.toDataURL('image/png'); a.download='replicube.png'; a.click();
  } else {
    const a=document.createElement('a'); a.href=paintCanvas.toDataURL('image/png'); a.download='replipaint.png'; a.click();
  }
}

// ═══════════════════════════════════════════════════════════
//  DEFAULT CODE
// ═══════════════════════════════════════════════════════════
const defaultCode = {
  replicube:
`-- El código recibe x, y, z → devuelve color (1-16)
-- 0 o sin return = vacío | >16 hace wrap (17→1…)

if abs(z) < 3 and abs(y) < 3 then
  if abs(z) < 2 and x % 2 == 0 and abs(x) < 3 and y == 2 then
    return WHITE
  end
  return BROWN
end`,
  replipaint:
`-- El código recibe x, y → devuelve color (1-16)

fill(BLACK)
local d = sqrt(x*x + y*y)
return (floor(d / 6) % 16) + 1`
};

// ═══════════════════════════════════════════════════════════
//  MODE SWITCH
// ═══════════════════════════════════════════════════════════
function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.tab').forEach((t,i) => {
    t.classList.toggle('active', (i===0&&mode==='replicube')||(i===1&&mode==='replipaint'));
  });
  const is3D = mode==='replicube';
  threeCanvas.style.display  = is3D ? 'block' : 'none';
  annoCanvas.style.display   = is3D ? 'block' : 'none';
  paintCanvas.style.display  = is3D ? 'none'  : 'block';
  document.getElementById('viewport-label').textContent = is3D ? '3D VOXEL VIEW' : '2D PAINT VIEW';
  document.getElementById('stats-overlay').style.display = is3D ? 'block' : 'none';
  document.getElementById('grid-btn').style.display  = is3D ? '' : 'none';
  document.getElementById('axes-btn').style.display  = is3D ? '' : 'none';
  document.getElementById('size-label').style.display  = is3D ? '' : 'none';
  document.getElementById('size-slider').style.display = is3D ? '' : 'none';
  document.getElementById('clip-controls').style.display = is3D ? 'flex' : 'none';
  document.getElementById('docs-replicube').style.display  = is3D ? 'block' : 'none';
  document.getElementById('docs-replipaint').style.display = is3D ? 'none'  : 'block';
  document.getElementById('code-editor').value = defaultCode[mode];
  updateLineNumbers(); updateTokenCount();
  if (!is3D) setTimeout(()=>redrawPaint(), 50);
}

// ═══════════════════════════════════════════════════════════
//  EDITOR
// ═══════════════════════════════════════════════════════════
const editor = document.getElementById('code-editor');
editor.addEventListener('keydown', e => {
  if (e.key==='Tab') {
    e.preventDefault();
    const s=editor.selectionStart, en=editor.selectionEnd;
    editor.value = editor.value.slice(0,s)+'  '+editor.value.slice(en);
    editor.selectionStart = editor.selectionEnd = s+2;
  }
  if ((e.ctrlKey||e.metaKey) && e.key==='Enter') { e.preventDefault(); runCode(); }
});
let _autoRunTimer = null;
editor.addEventListener('input', () => {
  updateLineNumbers(); updateTokenCount();
  clearTimeout(_autoRunTimer);
  _autoRunTimer = setTimeout(()=>runCode(), 800);
});
editor.addEventListener('scroll', () => {
  document.getElementById('line-numbers').scrollTop = editor.scrollTop;
});
function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  let html = '';
  for (let i=1; i<=lines; i++) html += '<span>'+i+'</span>';
  document.getElementById('line-numbers').innerHTML = html;
}

// ── Resize handle ──
let resizing=false, resizeStartX=0, resizeStartW=0;
document.getElementById('resize-handle').addEventListener('mousedown', e => {
  resizing=true; resizeStartX=e.clientX;
  resizeStartW = document.getElementById('editor-pane').offsetWidth;
  document.body.style.cursor='col-resize'; document.body.style.userSelect='none';
});
window.addEventListener('mousemove', e => {
  if (!resizing) return;
  const w = Math.max(240, Math.min(700, resizeStartW+(e.clientX-resizeStartX)));
  document.getElementById('editor-pane').style.width = w+'px';
  resizeRenderer();
  if (currentMode==='replipaint') redrawPaint();
});
window.addEventListener('mouseup', () => { resizing=false; document.body.style.cursor=''; document.body.style.userSelect=''; });
window.addEventListener('resize', () => { resizeRenderer(); if(currentMode==='replipaint') redrawPaint(); });

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════
document.getElementById('grid-btn').classList.add('active');
document.getElementById('axes-btn').classList.add('active');
buildPaletteGrid('palette-grid-3d');
buildPaletteGrid('palette-grid-2d');
buildPaletteBar();
editor.value = defaultCode.replicube;
updateLineNumbers();
updateTokenCount();
window.addEventListener('load', () => setTimeout(()=>runCode(), 600));
