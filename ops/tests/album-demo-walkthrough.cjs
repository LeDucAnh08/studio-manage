const path = require('node:path');
const fs = require('node:fs/promises');

module.exports = function createWalkthrough(root) {
  const enabled = process.env.ALBUM_ANNOTATION_DEMO === 'true';
  const directory = path.join(root, 'audit/drive-album-demo-2026-11-10');
  const frames = [];
  return {
    async capture(page, title, description, target) {
      if (!enabled) return;
      await fs.mkdir(directory, { recursive: true });
      await target.scrollIntoViewIfNeeded();
      const box = await target.boundingBox();
      await page.evaluate(
        ({ box, label }) => {
          document.getElementById('album-demo-annotation')?.remove();
          const layer = document.createElement('div');
          layer.id = 'album-demo-annotation';
          layer.style.cssText = 'position:fixed;inset:0;z-index:2147483647;pointer-events:none';
          if (box) {
            const border = document.createElement('div');
            border.style.cssText = `position:absolute;left:${Math.max(2, box.x - 5)}px;top:${Math.max(2, box.y - 5)}px;width:${box.width + 10}px;height:${box.height + 10}px;border:3px solid #e98c2d;border-radius:8px;box-shadow:0 0 0 4px #fff8`;
            layer.append(border);
          }
          const tag = document.createElement('div');
          tag.textContent = label;
          tag.style.cssText =
            'position:absolute;bottom:12px;left:12px;max-width:calc(100% - 24px);padding:12px 18px;background:#253b2a;color:white;border:1px solid #91a980;border-radius:9px;font:600 16px/1.45 system-ui;box-shadow:0 3px 18px #0003';
          layer.append(tag);
          document.body.append(layer);
        },
        { box, label: `${frames.length + 1}. ${title}` },
      );
      const image = `step-${String(frames.length + 1).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(directory, image), fullPage: false });
      await page.evaluate(() => document.getElementById('album-demo-annotation')?.remove());
      frames.push({ image, title, description });
    },
    async finish() {
      if (!enabled) return;
      const data = JSON.stringify(frames).replaceAll('<', '\\u003c');
      await fs.writeFile(path.join(directory, 'steps.json'), JSON.stringify(frames, null, 2));
      await fs.writeFile(
        path.join(directory, 'demo.html'),
        `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Demo album Drive · Yume Studio</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f5f3ed;color:#263329;font:15px/1.6 system-ui,sans-serif}header{padding:20px 28px;border-bottom:1px solid #dcded3;background:#fffefa}header span{color:#66725e;font-size:12px;letter-spacing:.1em;text-transform:uppercase}h1{font-size:25px;margin:5px 0}header p{margin:4px 0;color:#5e675b;font-size:13px}.workspace{display:grid;grid-template-columns:275px minmax(0,1fr);gap:24px;max-width:1500px;margin:auto;padding:24px}aside button{display:block;width:100%;text-align:left;border:0;border-radius:6px;padding:10px 12px;background:transparent;color:#465443;font:inherit;font-size:13px;cursor:pointer}aside button[aria-current=step]{background:#2e4932;color:white}aside button:hover{outline:1px solid #adbba7}.stage{min-width:0}figure{margin:0;background:#e9ece2;border-radius:12px;overflow:hidden;display:flex;justify-content:center;border:1px solid #d2d7c8}figure img{display:block;max-width:100%;max-height:calc(100vh - 310px);width:auto;object-fit:contain}.caption{padding:14px 0;min-height:97px}h2{font-size:21px;margin:0 0 6px}.caption p{margin:0;color:#5e675b}.controls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}button.control,a.control{background:#fffefa;border:1px solid #bcc7b4;color:#263329;border-radius:7px;padding:9px 14px;text-decoration:none;cursor:pointer;font:inherit}.control.primary{background:#2e4932;color:white}.count{margin-left:auto;color:#66725e}progress{width:100%;height:5px;accent-color:#6d885b;border:0;margin:12px 0}button:focus-visible,a:focus-visible{outline:3px solid #d88a36;outline-offset:3px}@media(max-width:800px){.workspace{grid-template-columns:1fr;padding:14px;gap:14px}aside{display:flex;overflow-x:auto;gap:4px}aside button{width:auto;min-width:150px}figure img{max-height:60vh}header{padding:16px}.count{margin-left:0}h1{font-size:21px}}</style></head>
<body><header><span>Yume Studio · chạy lại từng bước</span><h1>Luồng album Google Drive</h1><p>Bản ghi từ giao diện và API thật với dữ liệu mẫu riêng. Nguồn Google Drive được mô phỏng; chưa xác minh kết nối Google thật.</p></header>
<div class="workspace"><aside aria-label="Các bước trình diễn" id="steps"></aside><main class="stage"><figure><img id="screen" alt=""></figure><div class="caption" aria-live="polite"><h2 id="title"></h2><p id="description"></p></div><div class="controls"><button class="control" id="previous" aria-label="Bước trước">← Trước</button><button class="control primary" id="play">Tạm dừng</button><button class="control" id="next">Tiếp →</button><button class="control" id="restart">Xem lại từ đầu</button><a class="control" id="zoom" target="_blank" rel="noopener">Xem ảnh lớn</a><span class="count" id="count"></span></div><progress id="progress" max="${frames.length}" value="1"></progress></main></div>
<script>const frames=${data};let index=0,playing=true,timer;const $=id=>document.getElementById(id);frames.forEach((f,i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+f.title;b.onclick=()=>{playing=false;show(i)};$('steps').append(b)});function show(i){index=Math.max(0,Math.min(frames.length-1,i));const f=frames[index];$('screen').src=f.image;$('screen').alt=f.title;$('title').textContent=f.title;$('description').textContent=f.description;$('count').textContent=(index+1)+' / '+frames.length;$('progress').value=index+1;$('zoom').href=f.image;[...$('steps').children].forEach((b,j)=>{if(j===index)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});$('previous').disabled=index===0;$('next').disabled=index===frames.length-1;$('play').textContent=playing?'Tạm dừng':'Phát demo';clearTimeout(timer);if(playing)timer=setTimeout(()=>{if(index===frames.length-1){playing=false;show(index)}else show(index+1)},5500)}$('previous').onclick=()=>{playing=false;show(index-1)};$('next').onclick=()=>{playing=false;show(index+1)};$('play').onclick=()=>{playing=!playing;if(playing&&index===frames.length-1)index=0;show(index)};$('restart').onclick=()=>{playing=true;show(0)};document.addEventListener('keydown',e=>{if(e.target.tagName==='BUTTON')return;if(e.key==='ArrowRight')$('next').click();if(e.key==='ArrowLeft')$('previous').click();if(e.key===' '){e.preventDefault();$('play').click()}});show(0);</script></body></html>`,
      );
    },
  };
};
