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
.c1-site .app-shell.c1-embedded{display:block;min-height:70vh;}
.c1-site .c1-embedded .main-shell{max-width:1440px;margin:0 auto;}
.c1-site .c1-context-nav{display:flex;align-items:center;gap:8px;padding:12px 24px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.c1-site .c1-context-nav>a,.c1-site .c1-resource-menu>summary{display:flex;align-items:center;gap:7px;padding:10px 12px;min-height:44px;border-radius:7px;font-size:14px;cursor:pointer;}
.c1-site .c1-context-nav [aria-current=page]{background:#01113B;color:#FEFAEE;}
.c1-site .c1-resource-menu{position:relative;margin-left:auto;}
.c1-site .c1-resource-menu>div{position:absolute;right:0;top:100%;z-index:30;min-width:240px;max-width:85vw;display:grid;padding:8px;background:#fffdf8;border:1px solid #d9d9d4;border-radius:8px;box-shadow:0 10px 30px #01113b18;}
.c1-site .c1-resource-menu>div>a{padding:10px;border-radius:5px;}
.c1-site .source-task-workspace{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,1fr);gap:20px;align-items:start;}
.c1-site .source-task-workspace>.panel{min-width:0;}
.c1-site .source-page-stack{max-height:75vh;overflow:auto;background:#ecebe6;margin:16px 0;border:1px solid #d9d9d4;border-radius:8px;}
.c1-site .source-page-stack img{width:100%;height:auto;max-width:100%;}
.c1-site .source-page-stack figcaption{font-size:12px;padding:6px 12px;}
.c1-site .source-task-response textarea{width:100%;min-height:280px;line-height:1.7;}
.c1-site .source-task-response .caption{margin-top:12px;}
.c1-site .original-listening-next{border-top:1px solid var(--border);padding-top:14px;margin-top:14px;display:grid;gap:10px;}
.c1-site .original-listening-next .primary-link{justify-self:start;white-space:normal;text-align:left;}
@media(max-width:800px){.c1-site .source-task-workspace{grid-template-columns:minmax(0,1fr);}.c1-site .source-page-stack{max-height:60vh;}.c1-site .c1-context-nav{padding:8px 12px;gap:2px;}.c1-site .c1-context-nav>a,.c1-site .c1-resource-menu>summary{font-size:12px;padding:8px;}.c1-site .c1-resource-menu{margin-left:0;}.c1-site .c1-resource-menu>div{right:auto;left:0;}}
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
