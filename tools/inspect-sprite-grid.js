// Read-only PNG/frame diagnostics. No image processing or asset writes.
const fs = require('node:fs');
const zlib = require('node:zlib');
function readPng(file) {
  const b = fs.readFileSync(file), chunks = [];
  let w, h, channels;
  for (let p = 8; p < b.length;) {
    const n = b.readUInt32BE(p), type = b.toString('ascii', p + 4, p + 8), d = b.subarray(p + 8, p + 8 + n);
    if (type === 'IHDR') {
      w = d.readUInt32BE(0); h = d.readUInt32BE(4);
      if (d[8] !== 8 || ![2, 6].includes(d[9]) || d[12]) throw Error('Expected non-interlaced RGB/RGBA8 PNG');
      channels = d[9] === 6 ? 4 : 3;
    }
    if (type === 'IDAT') chunks.push(d);
    p += n + 12;
  }
  const raw = zlib.inflateSync(Buffer.concat(chunks)), stride = w * channels, data = Buffer.alloc(w * h * 4);
  let previous = Buffer.alloc(stride), cursor = 0;
  const paeth = (a,b,c) => { const p=a+b-c, x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c; };
  for(let y=0;y<h;y++) {
    const filter=raw[cursor++], row=Buffer.alloc(stride);
    for(let i=0;i<stride;i++) {
      const a=i>=channels?row[i-channels]:0,b=previous[i],c=i>=channels?previous[i-channels]:0;
      row[i]=(raw[cursor++]+([0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter]))&255;
    }
    for(let x=0;x<w;x++) { const p=(y*w+x)*4,q=x*channels;data[p]=row[q];data[p+1]=row[q+1];data[p+2]=row[q+2];data[p+3]=channels===4?row[q+3]:255; }
    previous=row;
  }
  return {w,h,data};
}
function inspect(file,columns,rows,cuts) {
  const {w,h,data}=readPng(file), frames=[];
  let transparent=0,partial=0,matte=0;
  for(let p=0;p<data.length;p+=4) {
    const [r,g,b,a]=data.subarray(p,p+4);
    if(!a) transparent++; else if(a<255) partial++;
    if(a>8&&((r>220&&g<45&&b<45)||(r>220&&g>220&&b<35))) matte++;
  }
  for(let row=0;row<rows;row++) for(let col=0;col<columns;col++) {
    const x0=Math.floor(col*w/columns),x1=Math.floor((col+1)*w/columns),y0=Math.round(cuts?cuts[row]:row*h/rows),y1=Math.round(cuts?cuts[row+1]:(row+1)*h/rows);
    let minX=x1,minY=y1,maxX=-1,maxY=-1,blueX=0,blueN=0,border=0;
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) {
      const p=(y*w+x)*4,[r,g,b,a]=data.subarray(p,p+4);if(a<=8)continue;
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      if(x-x0<4||x1-x<=4||y-y0<4||y1-y<=4)border++;
      if(a>200&&b>r*1.2&&b>g*.95&&y-y0>(y1-y0)*.3&&y-y0<(y1-y0)*.75){blueX+=x-x0;blueN++;}
    }
    frames.push({row,col,cell:[x1-x0,y1-y0],bounds:[minX-x0,minY-y0,maxX-minX+1,maxY-minY+1],blueTorsoX:blueN?+(blueX/blueN).toFixed(2):null,borderPixels:border});
  }
  return {file,size:[w,h],transparentRatio:transparent/(w*h),partial,matte,frames};
}
module.exports={readPng,inspect};
if(require.main===module) console.log(JSON.stringify(inspect(process.argv[2],Number(process.argv[3]),Number(process.argv[4]),process.argv[5]?.split(',').map(Number)),null,2));
