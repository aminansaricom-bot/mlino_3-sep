// Run with node mlino2/HANDOFF/create-stage2-browser-harness.mjs after building.
// Local review only: never deploy this generated HTML or treat stubbed APIs as native tests.
import { readFileSync, writeFileSync } from 'node:fs';
const dist = new URL('../app/dist/', import.meta.url);
const script = "<script>\n// Test-only browser delivery harness. Does not modify the production bundle.\nconst mode=new URLSearchParams(location.search).get('delivery');\nconst audit={shareCalls:0,copyCalls:0,text:null}; window.deliveryAudit=audit;\nObject.defineProperty(navigator,'share',{configurable:true,value: mode==='manual'||mode==='copy'||mode==='denied' ? undefined : async data=>{audit.shareCalls++;audit.text=data.text;if(mode==='cancel')throw new DOMException('Cancelled','AbortError');if(mode==='error')throw new Error('Test share failure');}});\nObject.defineProperty(navigator,'clipboard',{configurable:true,value:mode==='manual'?undefined:{writeText:async text=>{audit.copyCalls++;audit.text=text;if(mode==='denied')throw new Error('Test clipboard denial');}}});\n</script>";
const html = readFileSync(new URL('index.html', dist), 'utf8');
writeFileSync(new URL('stage2-test-harness.html', dist), html.replace('<head>', '<head>' + script));
console.log('Open /stage2-test-harness.html?delivery=manual (or cancel/error/copy/denied/success) on the local preview server.');
