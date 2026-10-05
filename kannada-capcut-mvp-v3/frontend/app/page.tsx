'use client';
import {useRef,useState} from 'react';

const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:8000';
type Photo={file:File,name:string,url:string,duration:number};

export default function Home(){
 const videoInput=useRef<HTMLInputElement>(null), photoInput=useRef<HTMLInputElement>(null);
 const [mode,setMode]=useState<'video'|'photos'>('video');
 const [url,setUrl]=useState(""); const [name,setName]=useState("");
 const [photos,setPhotos]=useState<Photo[]>([]);
 const [start,setStart]=useState(0); const [end,setEnd]=useState<number|''>('');
 const [speed,setSpeed]=useState(1); const [volume,setVolume]=useState(1);
 const [busy,setBusy]=useState(false); const [result,setResult]=useState(""); const [recap,setRecap]=useState(10);

 async function uploadMedia(f:File){
   const fd=new FormData(); fd.append("file",f);
   const r=await fetch(API+"/upload",{method:"POST",body:fd}); return await r.json();
 }
 async function uploadVideo(f:File){
   setBusy(true); setUrl(URL.createObjectURL(f));
   const d=await uploadMedia(f); setName(d.filename); setBusy(false);
 }
 async function addPhotos(files:FileList|null){
   if(!files)return; setBusy(true);
   const added:Photo[]=[];
   for(const f of Array.from(files)){
     if(!f.type.startsWith("image/"))continue;
     const d=await uploadMedia(f);
     added.push({file:f,name:d.filename,url:URL.createObjectURL(f),duration:3});
   }
   setPhotos(p=>[...p,...added]); setBusy(false);
 }
 function move(i:number,dir:number){
   setPhotos(p=>{const a=[...p],j=i+dir;if(j<0||j>=a.length)return a;[a[i],a[j]]=[a[j],a[i]];return a});
 }
 async function createRecap(){
   if(!name)return; setBusy(true); setResult("");
   const r=await fetch(API+"/recap",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({filename:name,seconds:recap})});
   const d=await r.json(); if(d.url)setResult(API+d.url); setBusy(false);
 }
 async function renderVideo(){
   if(!name)return; setBusy(true); setResult("");
   const r=await fetch(API+"/render",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({filename:name,start,end:end===''?null:end,speed,volume,remove_fillers:true})});
   const d=await r.json(); if(d.url)setResult(API+d.url); setBusy(false);
 }
 async function renderPhotos(){
   if(!photos.length)return; setBusy(true); setResult("");
   const r=await fetch(API+"/slideshow",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({filenames:photos.map(p=>p.name),durations:photos.map(p=>p.duration),width:1080,height:1920,fps:30})});
   const d=await r.json(); if(d.url)setResult(API+d.url); setBusy(false);
 }
 return <main className="app">
  <header><div><div className="brand">KannadaCut</div><div className="tag">ಕನ್ನಡ AI Video Editor</div></div>
   <div className="mode"><button className={mode==='video'?'active':''} onClick={()=>setMode('video')}>🎬 Video</button><button className={mode==='photos'?'active':''} onClick={()=>setMode('photos')}>🖼️ Photos → Video</button></div>
  </header>
  <section className="workspace">
   <aside className="tools">
    {mode==='video'?["✂️ Cut","🎙️ Voice","📝 Captions","🔊 Clean","✨ AI"].map(x=><button key={x}>{x}</button>):["🖼️ Photos","↕️ Order","🎞️ Motion","🎵 Music","📝 Text"].map(x=><button key={x}>{x}</button>)}
   </aside>
   <section className="canvas">
    <div className="preview">
     {mode==='video' && url?<video src={url} controls/>:
      mode==='photos' && photos.length?<div className="photoPreview"><img src={photos[0].url}/><span>{photos.length} photos</span></div>:
      <div className="empty"><div>🎬</div><h2>{mode==='photos'?'Photos → Kannada video':'ನಿಮ್ಮ ವೀಡಿಯೊವನ್ನು ಇಲ್ಲಿ ಪ್ರಾರಂಭಿಸಿ'}</h2><p>{mode==='photos'?'Turn your photos into a Reel or Short.':'Upload a Kannada video to start editing.'}</p>
       <button onClick={()=>mode==='photos'?photoInput.current?.click():videoInput.current?.click()}>＋ {mode==='photos'?'Add photos':'Import video'}</button></div>}
    </div>
    <div className="timeline">
     {mode==='video'?<><small>VIDEO</small><div className="track"><div className="clip">{name||"No video imported"}</div></div><small>AUDIO</small><div className="track"><div className="clip audio">🎙 Kannada voice • AI cleanup ready</div></div></>:
      <><div className="photoRow">{photos.map((p,i)=><div className="thumb" key={p.name}><img src={p.url}/><small>{i+1}</small></div>)}</div><div className="track"><div className="clip">🖼 {photos.length} photos • {photos.reduce((a,p)=>a+p.duration,0).toFixed(1)}s</div></div></>}
    </div>
   </section>
   <aside className="inspector">
    {mode==='video'?<><h3>Adjust</h3>
      <label>Start<input type="number" value={start} onChange={e=>setStart(+e.target.value)}/></label>
      <label>End<input type="number" value={end} onChange={e=>setEnd(e.target.value===""?"":+e.target.value)}/></label>
      <label>Speed <b>{speed.toFixed(2)}×</b><input type="range" min=".5" max="2" step=".05" value={speed} onChange={e=>setSpeed(+e.target.value)}/></label>
      <label>Voice <b>{Math.round(volume*100)}%</b><input type="range" min="0" max="2" step=".05" value={volume} onChange={e=>setVolume(+e.target.value)}/></label>
      <div className="recapCard">
       <strong>🎬 AI Recap / Hook</strong>
       <p>Create a short opening recap for the beginning of your video.</p>
       <div className="recapOptions">{[5,10,15].map(n=><button key={n} className={recap===n?'selected':''} onClick={()=>setRecap(n)}>{n}s</button>)}</div>
       <button className="recapBtn" disabled={!name||busy} onClick={createRecap}>{busy?"Creating…":"Create opening recap"}</button>
      </div>
      <div className="ai"><strong>✨ Kannada AI Cleanup</strong><p>Filler removal, pauses, repetitions and Kannada captions are the next AI layer.</p></div>
      <button className="export" disabled={!name||busy} onClick={renderVideo}>{busy?"Rendering…":"Export MP4"}</button>
    </>:<><h3>Photo Video</h3>
      <button className="add" onClick={()=>photoInput.current?.click()}>＋ Add photos</button>
      <div className="photoList">{photos.map((p,i)=><div className="photoItem" key={p.name}><img src={p.url}/><div><b>Photo {i+1}</b><label>Seconds<input type="number" min=".5" max="30" step=".5" value={p.duration} onChange={e=>setPhotos(ps=>ps.map((x,k)=>k===i?{...x,duration:+e.target.value}:x))}/></label></div><button onClick={()=>move(i,-1)}>↑</button><button onClick={()=>move(i,1)}>↓</button></div>)}</div>
      <p className="hint">Vertical 1080×1920 export with gentle photo motion.</p>
      <button className="export" disabled={!photos.length||busy} onClick={renderPhotos}>{busy?"Creating…":"Create Photo Video"}</button>
    </>}
    {result&&<a className="download" href={result}>Download finished MP4</a>}
   </aside>
  </section>
  <input ref={videoInput} hidden type="file" accept="video/*" onChange={e=>e.target.files?.[0]&&uploadVideo(e.target.files[0])}/>
  <input ref={photoInput} hidden type="file" accept="image/*" multiple onChange={e=>addPhotos(e.target.files)}/>
 </main>
}
