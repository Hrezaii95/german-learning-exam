import fs from 'node:fs';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
const dir=new URL('.',import.meta.url).pathname;
let source=fs.readFileSync(dir+'source.css','utf8').replace("@import 'shadcn/tailwind.css';",'').replace("@import 'tailwindcss';",`@import 'tailwindcss' source(none);\n@source './src';`);
// Translate the legacy green brand tints into Lingovo ink and paper tones.
source=source.replace(/#[0-9a-f]{6}\b/gi,hex=>{
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 if(g>r && g>b && g-r>3){ const l=(r+g+b)/3;return l<105?'#01113B':l<165?'#515b70':l<215?'#dce5f4':'#f0f3fa'; }
 return hex;
});
const result=await postcss([tailwind({base:dir})]).process(source,{from:dir+'source.css'});
const ast=postcss.parse(result.css);
ast.walkRules(rule=>{if(rule.parent.type==='atrule'&&/keyframes/.test(rule.parent.name))return;
rule.selectors=rule.selectors.map(sel=>{if(sel===':root'||sel==='body'||sel==='html'||sel===':host')return '.c1-site';if(/^(html|body)(\s|:)/.test(sel))return sel.replace(/^(html|body)/,'.c1-site');if(sel.includes('&'))return sel;return ':where(.c1-site) '+sel});});
const theme=`
.c1-site{--background:#FEFAEE;--foreground:#01113B;--primary:#0259CF;--secondary:#edf2fb;--muted:#f3f0e8;--muted-foreground:#515b70;--border:#d9d9d4;--card:#fffdf8;--color-popover:#fffdf8;--color-popover-foreground:#01113B;--color-destructive:#C6192C;font-family:AtlasSans,Arial,sans-serif;font-size:15px;color:var(--foreground);background:var(--background);isolation:isolate;}
.c1-site .app-shell{min-height:80vh;display:grid;grid-template-columns:230px minmax(0,1fr);margin:0;}
.c1-site .sidebar{position:sticky;top:0;align-self:start;height:auto;max-height:100vh;overflow:auto;width:auto;background:#01113B;color:#FEFAEE;padding:24px 18px;}
.c1-site .sidebar .brand,.c1-site .sidebar a,.c1-site .sidebar .eyebrow,.c1-site .sidebar small{color:#FEFAEE;}
.c1-site .sidebar nav a.active{background:#FEFAEE;color:#01113B;}
.c1-site .sidebar .brand-icon{background:#0259CF;color:#fff;}
.c1-site .main-shell{margin-left:0;width:auto;min-width:0;}
.c1-site main{margin-left:0;min-width:0;}
.c1-site .flow-start{background:#01113B;color:#FEFAEE;}
.c1-site .flow-start h2{color:#FEFAEE;}
.c1-site .sidebar-bottom{background:#182c52;}
.c1-site .sidebar-bottom p,.c1-site .sidebar-footer{color:#FEFAEE;}
.c1-site .brand{font-size:22px;letter-spacing:-.7px;}
.c1-site h1,.c1-site h2{font-family:AtlasSerif,Georgia,serif;letter-spacing:-.035em;color:#01113B;}
.c1-site h1{font-size:clamp(28px,3vw,44px);line-height:1.24;}
.c1-site button,.c1-site input,.c1-site select,.c1-site textarea{font-family:inherit;}
.c1-site .primary-link{background:#0259CF;color:white;}
.c1-site a:focus-visible,.c1-site button:focus-visible{outline:3px solid #0259CF;outline-offset:3px;}
.c1-site [data-slot=dialog-content]{background:#FEFAEE;color:#01113B;max-height:90vh;overflow:auto;}
@media(max-width:800px){.c1-site .app-shell{display:block;}.c1-site .sidebar{position:static;max-height:none;width:100%;height:auto;padding:14px 16px;}.c1-site .sidebar nav{display:flex;overflow-x:auto;gap:8px;}.c1-site .sidebar nav a{flex-shrink:0;min-height:44px;}.c1-site .sidebar .eyebrow,.c1-site .sidebar-footer,.c1-site .sidebar-bottom{display:none;}.c1-site main{margin:0;width:100%;}.c1-site .topbar{flex-wrap:wrap;gap:10px;}.c1-site [data-slot=button]{min-height:40px;white-space:normal;height:auto;padding-top:8px;padding-bottom:8px;}}
`;
fs.writeFileSync(dir+'../../apps/web/components/lingovo/c1.css',ast.toString()+theme);
