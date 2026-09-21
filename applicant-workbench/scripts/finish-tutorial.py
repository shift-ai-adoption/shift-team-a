"""Convert the actual captioned Penpot recording to MP4; export captions and QA frames."""
from pathlib import Path
import json, subprocess, sys, html
sys.path.insert(0,str(Path('.tools').resolve()))
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

out=Path('video'); ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
timeline=json.loads((out/'timeline.json').read_text(encoding='utf-8'))
raw=(out/'raw-video-path.txt').read_text(encoding='utf-8').strip()
start=timeline['introTime'];duration=timeline['endTime']-start
events=timeline['events']
def stamp(t):
 ms=round(max(0,t)*1000);h,ms=divmod(ms,3600000);m,ms=divmod(ms,60000);s,ms=divmod(ms,1000)
 return f'{h:02}:{m:02}:{s:02},{ms:03}'
srt=[]
for i,e in enumerate(events):
 end=events[i+1]['time'] if i+1<len(events) else timeline['endTime']
 srt.append(f"{i+1}\n{stamp(e['time']-start)} --> {stamp(end-start)}\n{e['text']}\n")
(out/'penpot-beginner-ja.srt').write_text('\n'.join(srt),encoding='utf-8-sig')
chapters=[]
for e in events:
 if not chapters or chapters[-1]['chapter']!=e['chapter']:chapters.append(e)
metadata=[';FFMETADATA1','title=Penpotではじめる画面修正','comment=Actual Penpot interaction recording. Japanese captions burned into the video. No audio.']
for i,e in enumerate(chapters):
 end=chapters[i+1]['time'] if i+1<len(chapters) else timeline['endTime']
 metadata.extend(['[CHAPTER]','TIMEBASE=1/1000',f"START={round((e['time']-start)*1000)}",f"END={round((end-start)*1000)}",'title='+e['chapter']])
(out/'chapters.ffmetadata').write_text('\n'.join(metadata),encoding='utf-8')
target=out/'penpot-beginner-ja.mp4'
command=[ffmpeg,'-y','-hide_banner','-loglevel','warning','-ss',str(start),'-i',raw,'-i',str(out/'chapters.ffmetadata'),'-t',str(duration),'-map','0:v:0','-map_metadata','1','-map_chapters','1','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r','25','-movflags','+faststart',str(target)]
subprocess.run(command,check=True)
frames=out/'qa';frames.mkdir(exist_ok=True)
times=[2,15,43,70,85,100,125,duration-4]
times=[min(t,duration-1) for t in times]
images=[]
font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',19)
for i,t in enumerate(times):
 path=frames/f'frame-{i+1:02}.jpg'
 subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(t),'-i',str(target),'-frames:v','1','-update','1',str(path)],check=True)
 im=Image.open(path);im.thumbnail((640,400));canvas=Image.new('RGB',(660,440),'#eef2f7');canvas.paste(im,((660-im.width)//2,30));ImageDraw.Draw(canvas).text((12,3),f'{t:.1f} s',font=font,fill='#163c66');images.append(canvas)
sheet=Image.new('RGB',(1320,440*((len(images)+1)//2)),'white')
for i,im in enumerate(images):sheet.paste(im,((i%2)*660,(i//2)*440))
sheet.save(out/'qa-contact-sheet.jpg',quality=92)
subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss','2','-i',str(target),'-frames:v','1','-update','1',str(out/'poster.jpg')],check=True)
print(json.dumps({'video':str(target.resolve()),'durationSeconds':round(duration,2),'bytes':target.stat().st_size,'captions':len(events),'chapters':len(chapters)},ensure_ascii=False))
links=''.join(f'<button data-time="{e["time"]-start:.2f}"><span>{int((e["time"]-start)//60):02}:{int((e["time"]-start)%60):02}</span>{html.escape(e["chapter"])}</button>' for e in chapters)
transcript=''.join(f'<li><strong>{html.escape(e["chapter"])}</strong><p>{html.escape(e["text"]).replace(chr(10),"<br>")}</p></li>' for e in events)
player='''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Penpotではじめる画面修正</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f3f6fa;color:#233c58;font-family:Meiryo,sans-serif}main{max-width:1200px;margin:auto;padding:36px 24px}h1{font-size:28px;margin-bottom:12px}p{color:#637a92;line-height:1.8}video{width:100%;background:#163c66;border-radius:12px;box-shadow:0 6px 30px #1233;margin:20px 0}nav{display:flex;gap:10px;flex-wrap:wrap}button{background:white;color:#254c75;border:1px solid #d2dce8;border-radius:7px;padding:12px;cursor:pointer}button span{color:#7890a9;margin-right:10px}a{color:#285e99}details{background:white;border:1px solid #dce5ee;border-radius:9px;padding:20px;margin-top:28px}li{margin:25px 0}li p{margin:5px 0}summary{cursor:pointer}</style>
<main><h1>Penpotではじめる画面修正</h1><p>申請者登録の練習用デザインで、文字・ボタン色・取り消し・保存確認を学びます。<br>日本語キャプション付き・音声なし。再生速度は動画プレーヤーのメニューで変更できます。</p>
<video controls preload="metadata" poster="poster.jpg"><source src="penpot-beginner-ja.mp4" type="video/mp4">MP4対応のブラウザで開いてください。</video><nav>CHAPTERS</nav>
<p><a href="penpot-beginner-ja.mp4" download>MP4を保存</a>　 /　 <a href="penpot-beginner-ja.srt" download>編集用の字幕を保存</a></p>
<details><summary>キャプションを文章で読む</summary><ol>TRANSCRIPT</ol></details>
<p>これはPenpotでのデザイン修正の動画です。実際のアプリへの反映には、別途コード変更と検証が必要です。</p></main>
<script>document.querySelectorAll('button[data-time]').forEach(b=>b.onclick=()=>{const v=document.querySelector('video');v.currentTime=Number(b.dataset.time);v.play()})</script></html>'''
(out/'index.html').write_text(player.replace('CHAPTERS',links).replace('TRANSCRIPT',transcript),encoding='utf-8')
