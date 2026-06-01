import { useState, useEffect, useMemo, useCallback } from "react";

const FEATURES_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTtiTUJPULgfwjLC5NeXaleky9zsv_0jTRFnGI83MKH4RhJtf52hivYq0TmtCJeF5bA0CR8bPsApyL/pub?gid=0&single=true&output=csv";
const CHANGELOGS_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSTtiTUJPULgfwjLC5NeXaleky9zsv_0jTRFnGI83MKH4RhJtf52hivYq0TmtCJeF5bA0CR8bPsApyL/pub?gid=1124880453&single=true&output=csv";
const HISTORY_KEY = "handoff-history-v1";

const STATUS_OPTIONS = ["Handoff Ready", "In Progress", "In Review", "Pending", "Deprecated"];
const PRODUCT_FILTER = ["All", "Product 1", "Product 2", "Product 3"];

const ss = {
  "Handoff Ready": { bg: "rgba(16,185,129,0.12)", text: "#34d399", dot: "#10b981" },
  "In Progress":   { bg: "rgba(245,158,11,0.12)",  text: "#fbbf24", dot: "#f59e0b" },
  "In Review":     { bg: "rgba(59,130,246,0.12)",   text: "#60a5fa", dot: "#3b82f6" },
  "Pending":       { bg: "rgba(168,85,247,0.12)",   text: "#c084fc", dot: "#a855f7" },
  "Deprecated":    { bg: "rgba(107,114,128,0.12)",  text: "#9ca3af", dot: "#6b7280" },
};

// Parse CSV text into array of objects
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const vals = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { vals.push(cur); cur = ""; }
      else { cur += ch; }
    }
    vals.push(cur);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim().replace(/^"|"$/g, ""); });
    return obj;
  }).filter(r => r.id);
}

const Ic = ({ t, s = 18, c = "#525252" }) => {
  const m = {
    search: <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    play:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    doc:    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    link:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
    plus:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    refresh:<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    close:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    trash:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    arrow:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>,
    video:  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 8l5-3v14l-5-3"/></svg>,
    chev:   <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>,
  };
  return m[t] || null;
};

const fmt = d => { if(!d) return ""; try { return new Date(d+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); } catch { return d; } };
const today = () => new Date().toISOString().split("T")[0];
const inp = { width:"100%", padding:"10px 12px", background:"#18181b", border:"1px solid #27272a", borderRadius:8, color:"#e4e4e7", fontSize:13, outline:"none", boxSizing:"border-box" };

export default function App() {
  const [features, setFeatures]       = useState([]);
  const [changeLogs, setChangeLogs]   = useState([]);
  const [history, setHistory]         = useState({});   // { featureId: [{version,date,note,handoffUrl,prototypeUrl}] }
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [query, setQuery]             = useState("");
  const [selectedId, setSelectedId]   = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterProduct, setFilterProduct] = useState("All");
  const [showProductMenu, setShowProductMenu] = useState(false);
  const [activeTab, setActiveTab]     = useState("history");
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showNewVersion, setShowNewVersion]   = useState(false);
  const [newVersionData, setNewVersionData]   = useState({ note:"", handoffUrl:"", prototypeUrl:"" });
  const [showCLForm, setShowCLForm]   = useState(false);
  const [clData, setCLData]           = useState({ title:"", description:"", author:"" });
  const [refreshing, setRefreshing]   = useState(false);
  const [selectedCL, setSelectedCL]   = useState(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await window.storage.get(HISTORY_KEY);
      if (r?.value) setHistory(JSON.parse(r.value));
    } catch {}
  }, []);

  const saveHistory = useCallback(async (h) => {
    setHistory(h);
    try { await window.storage.set(HISTORY_KEY, JSON.stringify(h)); } catch {}
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [fRes, cRes] = await Promise.all([
        fetch(FEATURES_CSV),
        fetch(CHANGELOGS_CSV),
      ]);
      const [fText, cText] = await Promise.all([fRes.text(), cRes.text()]);
      const f = parseCSV(fText);
      const c = parseCSV(cText);
      setFeatures(f);
      setChangeLogs(c);
      setError(null);
    } catch (e) {
      setError("Could not load data from Google Sheets. Check that the sheets are published.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      await Promise.all([fetchData(), loadHistory()]);
      setLoading(false);
    })();
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let r = [...features];
    if (filterProduct !== "All") r = r.filter(f => f.product === filterProduct || f.product === "Both");
    if (filterStatus !== "All") r = r.filter(f => f.status === filterStatus);
    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(f => f.name?.toLowerCase().includes(q) || (f.label||"").toLowerCase().includes(q) || (f.project||"").toLowerCase().includes(q) || f.notes?.toLowerCase().includes(q));
    }
    return r;
  }, [features, query, filterStatus, filterProduct]);

  const active = features.find(f => f.id === selectedId) || filtered[0] || null;
  const featureLogs = active ? changeLogs.filter(c => c.featureId === active.id) : [];
  const featureHistory = active ? (history[active.id] || []) : [];

  const addVersion = async () => {
    if (!newVersionData.note.trim() || !active) return;
    const currentVer = featureHistory.length > 0 ? Math.max(...featureHistory.map(h => h.version)) : 0;
    const nv = currentVer + 1;
    const entry = { version: nv, date: today(), note: newVersionData.note, handoffUrl: newVersionData.handoffUrl || active.handoffUrl, prototypeUrl: newVersionData.prototypeUrl || active.prototypeUrl };
    const updated = { ...history, [active.id]: [...(history[active.id] || []), entry] };
    await saveHistory(updated);
    setNewVersionData({ note:"", handoffUrl:"", prototypeUrl:"" });
    setShowNewVersion(false);
    setSelectedVersion(null);
  };

  const addCL = async () => {
    if (!clData.title.trim() || !active) return;
    alert("To add a change request, add a row directly in the Google Sheets changelog tab with featureId: " + active.id);
    setShowCLForm(false);
    setCLData({ title:"", description:"", author:"" });
  };

  if (loading) return (
    <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#09090b",color:"#52525b",fontFamily:"'DM Sans',sans-serif",flexDirection:"column",gap:12}}>
      <div style={{width:32,height:32,border:"2px solid #27272a",borderTop:"2px solid #34d399",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{fontSize:13}}>Loading from Google Sheets...</span>
    </div>
  );

  const prodLabel = filterProduct === "All" ? "All Products" : filterProduct;

  return (
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#09090b",color:"#e4e4e7"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* LEFT */}
      <div style={{width:350,minWidth:350,borderRight:"1px solid #18181b",display:"flex",flexDirection:"column",background:"#0c0c0f"}}>

        {/* Header */}
        <div style={{padding:"20px 18px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.12em",textTransform:"uppercase",color:"#52525b",fontFamily:"'DM Mono',monospace"}}>Client Name</div>
              <div style={{fontSize:18,fontWeight:700,color:"#fafafa",letterSpacing:"-0.03em"}}>Handoff Finder</div>
            </div>
            <button onClick={refresh} title="Refresh from Sheets" style={{padding:"6px",background:"transparent",border:"1px solid #27272a",borderRadius:6,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",opacity:refreshing?0.5:1}}>
              <Ic t="refresh" s={14} c="#52525b"/>
            </button>
          </div>

          {/* Product Switcher */}
          <div style={{position:"relative",marginTop:12}}>
            <button onClick={e=>{e.stopPropagation();setShowProductMenu(!showProductMenu);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:"#18181b",border:"1px solid #27272a",borderRadius:8,cursor:"pointer",color:"#e4e4e7",fontSize:13,fontWeight:600}}>
              <span>{prodLabel}</span>
              <span style={{transform:showProductMenu?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}><Ic t="chev" s={14} c="#52525b"/></span>
            </button>
            {showProductMenu && (
              <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"#18181b",border:"1px solid #27272a",borderRadius:8,overflow:"hidden",zIndex:50}}>
                {PRODUCT_FILTER.map(p => (
                  <button key={p} onClick={()=>{setFilterProduct(p);setShowProductMenu(false);setSelectedId(null);}} style={{width:"100%",padding:"9px 12px",textAlign:"left",background:filterProduct===p?"#27272a":"transparent",border:"none",color:filterProduct===p?"#fafafa":"#a1a1aa",fontSize:13,cursor:"pointer",display:"block"}} onMouseEnter={e=>{if(filterProduct!==p)e.currentTarget.style.background="#1f1f23";}} onMouseLeave={e=>{if(filterProduct!==p)e.currentTarget.style.background="transparent";}}>{p==="All"?"All Products":p}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div style={{padding:"0 18px 10px",position:"relative"}}>
          <div style={{position:"absolute",left:29,top:"50%",transform:"translateY(-50%)",zIndex:1}}><Ic t="search" s={15} c="#3f3f46"/></div>
          <input type="text" placeholder="Search features..." value={query} onChange={e=>{setQuery(e.target.value);setSelectedId(null);}} style={{...inp,paddingLeft:34}}/>
        </div>

        {/* Status Filters */}
        <div style={{padding:"0 18px 8px",display:"flex",gap:5,flexWrap:"wrap"}}>
          {["All",...STATUS_OPTIONS].map(s=>(
            <button key={s} onClick={()=>{setFilterStatus(s);setSelectedId(null);}} style={{padding:"4px 9px",fontSize:11,fontWeight:500,borderRadius:6,cursor:"pointer",border:"1px solid",borderColor:filterStatus===s?"#3f3f46":"#1c1c1f",background:filterStatus===s?"#27272a":"transparent",color:filterStatus===s?"#e4e4e7":"#52525b"}}>{s}</button>
          ))}
        </div>

        <div style={{padding:"0 18px 6px"}}>
          <span style={{fontSize:11,color:"#3f3f46",fontFamily:"'DM Mono',monospace"}}>{filtered.length} feature{filtered.length!==1?"s":""}</span>
        </div>

        {/* Error banner */}
        {error && <div style={{margin:"0 18px 8px",padding:"8px 12px",background:"#ef444418",border:"1px solid #ef444433",borderRadius:6,fontSize:11,color:"#fca5a5"}}>{error}</div>}

        {/* Feature List */}
        <div style={{flex:1,overflowY:"auto",padding:"0 10px"}}>
          {filtered.length === 0 && !error && (
            <div style={{padding:"40px 16px",textAlign:"center",color:"#27272a",fontSize:13}}>
              {features.length === 0 ? "Add features to your Google Sheet to get started." : "No features found."}
            </div>
          )}
          {filtered.map(f => {
            const isA = active?.id === f.id;
            const sc = ss[f.status] || ss["In Progress"];
            return (
              <button key={f.id} onClick={()=>{setSelectedId(f.id);setSelectedVersion(null);setShowNewVersion(false);setActiveTab("history");}} style={{width:"100%",textAlign:"left",padding:"12px 10px",marginBottom:1,background:isA?"#18181b":"transparent",border:"none",borderRadius:8,cursor:"pointer",display:"block",borderLeft:isA?"2px solid #34d399":"2px solid transparent"}} onMouseEnter={e=>{if(!isA)e.currentTarget.style.background="#131316";}} onMouseLeave={e=>{if(!isA)e.currentTarget.style.background="transparent";}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:13,fontWeight:600,color:isA?"#fafafa":"#a1a1aa"}}>{f.name}</span>
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    {f.targetVersion&&<span style={{fontSize:9,fontWeight:600,padding:"1px 5px",borderRadius:4,background:f.targetVersion==="v1"?"#10b98118":"#3b82f618",color:f.targetVersion==="v1"?"#34d399":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>{f.targetVersion}</span>}
                  </div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11}}>
                  {f.label&&<><span style={{color:"#71717a",fontSize:10,fontWeight:500}}>{f.label}</span><span style={{color:"#27272a"}}>{"\u00B7"}</span></>}
                  <span style={{color:"#52525b"}}>{f.product==="Both"?"NP + DJY":f.product}</span>
                  <span style={{color:"#27272a"}}>{"\u00B7"}</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,color:sc.text}}><span style={{width:5,height:5,borderRadius:"50%",background:sc.dot}}/>{f.status}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT */}
      <div style={{flex:1,overflowY:"auto",background:"#09090b"}} onClick={()=>setShowProductMenu(false)}>
        {active ? (
          <div style={{padding:"28px 36px",maxWidth:780}}>

            {/* Header */}
            <div style={{marginBottom:28}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                <span style={{fontSize:11,fontWeight:600,color:ss[active.status]?.text,background:ss[active.status]?.bg,border:"1px solid "+(ss[active.status]?.dot||"#333")+"33",padding:"3px 10px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:5,height:5,borderRadius:"50%",background:ss[active.status]?.dot}}/>{active.status}</span>
              </div>
              <h1 style={{fontSize:26,fontWeight:700,color:"#fafafa",margin:0,letterSpacing:"-0.03em",lineHeight:1.2}}>{active.name}</h1>
              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:6,flexWrap:"wrap"}}>
                {active.label&&<span style={{fontSize:10,fontWeight:600,padding:"2px 8px",borderRadius:5,background:"#27272a",color:"#a1a1aa",fontFamily:"'DM Mono',monospace"}}>{active.label}</span>}
                <span style={{fontSize:13,color:"#52525b"}}>{active.product==="Both"?"NewsPlus + DJYPro":active.product}</span>
                {active.project&&<><span style={{color:"#27272a"}}>{"\u00B7"}</span><span style={{fontSize:13,color:"#52525b"}}>{active.project}</span></>}
                {active.targetVersion&&<><span style={{color:"#27272a"}}>{"\u00B7"}</span><span style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:5,background:active.targetVersion==="v1"?"#10b98118":"#3b82f618",color:active.targetVersion==="v1"?"#34d399":"#60a5fa",fontFamily:"'DM Mono',monospace"}}>Target: {active.targetVersion}</span></>}
              </div>
            </div>

            {/* Video */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Feature Preview</div>
              {active.videoUrl
                ? <div style={{width:"100%",aspectRatio:"16/9",borderRadius:10,overflow:"hidden",border:"1px solid #18181b"}}><iframe src={active.videoUrl} style={{width:"100%",height:"100%",border:"none"}} allowFullScreen/></div>
                : <div style={{width:"100%",aspectRatio:"16/9",background:"#0c0c0f",borderRadius:10,border:"1px solid #18181b",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6}}><Ic t="video" s={32} c="#27272a"/><span style={{fontSize:12,color:"#27272a"}}>No video yet</span></div>}
            </div>

            {/* Resources */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Resources</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[{l:"Prototype",sub:"Open in Figma",url:active.prototypeUrl,icon:"play",ac:"#a78bfa",bg:"#1e1b2e"},{l:"Handoff",sub:"Open in Figma",url:active.handoffUrl,icon:"doc",ac:"#34d399",bg:"#1b2e1e"},{l:"Jira Ticket",sub:"Open in Jira",url:active.jiraUrl,icon:"link",ac:"#60a5fa",bg:"#1b1e2e"},{l:"Video",sub:"Open video",url:active.videoUrl,icon:"video",ac:"#fbbf24",bg:"#2e2b1b"}].map(r=>(
                  <a key={r.l} href={r.url||"#"} target="_blank" rel="noopener noreferrer" onClick={e=>{if(!r.url)e.preventDefault();}} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"#0c0c0f",border:"1px solid #18181b",borderRadius:10,textDecoration:"none",opacity:r.url?1:0.35,cursor:r.url?"pointer":"default"}} onMouseEnter={e=>{if(r.url)e.currentTarget.style.borderColor="#27272a";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="#18181b";}}>
                    <div style={{width:32,height:32,borderRadius:7,background:r.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><Ic t={r.icon} s={16} c={r.ac}/></div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#a1a1aa"}}>{r.l}</div><div style={{fontSize:10,color:"#3f3f46"}}>{r.url?r.sub:"Not added yet"}</div></div>
                    {r.url&&<Ic t="arrow" s={12} c="#3f3f46"/>}
                  </a>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:8,fontFamily:"'DM Mono',monospace"}}>Notes</div>
              <div style={{padding:"14px 16px",background:"#0c0c0f",border:"1px solid #18181b",borderRadius:10,fontSize:13,lineHeight:1.7,color:"#a1a1aa"}}>{active.notes||"No notes added yet."}</div>
            </div>

            {/* Tabs */}
            <div>
              <div style={{display:"flex",borderBottom:"1px solid #18181b",marginBottom:16}}>
                {[{key:"history",label:"Version History",count:featureHistory.length},{key:"changelogs",label:"Change Requests",count:featureLogs.filter(c=>c.status==="Open").length}].map(tab=>(
                  <button key={tab.key} onClick={()=>{setActiveTab(tab.key);setSelectedVersion(null);setShowNewVersion(false);}} style={{padding:"8px 16px",fontSize:11,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",fontFamily:"'DM Mono',monospace",background:"none",border:"none",cursor:"pointer",color:activeTab===tab.key?"#e4e4e7":"#3f3f46",borderBottom:activeTab===tab.key?"2px solid #34d399":"2px solid transparent",marginBottom:-1}}>
                    {tab.label}{tab.count>0&&<span style={{marginLeft:6,fontSize:10,padding:"1px 6px",borderRadius:10,background:tab.key==="changelogs"?"#f59e0b22":"#27272a",color:tab.key==="changelogs"?"#fbbf24":"#52525b"}}>{tab.count}</span>}
                  </button>
                ))}
              </div>

              {/* VERSION HISTORY */}
              {activeTab==="history"&&(
                <div>
                  <button onClick={()=>setShowNewVersion(!showNewVersion)} style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",marginBottom:14,fontSize:11,fontWeight:600,borderRadius:7,cursor:"pointer",border:"1px solid #10b98133",background:"#10b98111",color:"#34d399"}}><Ic t="plus" s={13} c="#34d399"/> New Version</button>

                  {showNewVersion&&(
                    <div style={{padding:"14px 16px",background:"#0c0c0f",border:"1px solid #10b98133",borderRadius:10,marginBottom:14,display:"flex",flexDirection:"column",gap:10}}>
                      <div style={{fontSize:12,fontWeight:600,color:"#34d399",fontFamily:"'DM Mono',monospace"}}>New Version (v{featureHistory.length+1})</div>
                      <div><label style={{fontSize:10,fontWeight:600,color:"#3f3f46",display:"block",marginBottom:3,fontFamily:"'DM Mono',monospace"}}>What changed? *</label><input value={newVersionData.note} onChange={e=>setNewVersionData({...newVersionData,note:e.target.value})} style={inp} placeholder="Describe the changes..."/></div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        <div><label style={{fontSize:10,fontWeight:600,color:"#3f3f46",display:"block",marginBottom:3,fontFamily:"'DM Mono',monospace"}}>Handoff URL</label><input value={newVersionData.handoffUrl} onChange={e=>setNewVersionData({...newVersionData,handoffUrl:e.target.value})} style={inp} placeholder="New handoff link (optional)"/></div>
                        <div><label style={{fontSize:10,fontWeight:600,color:"#3f3f46",display:"block",marginBottom:3,fontFamily:"'DM Mono',monospace"}}>Prototype URL</label><input value={newVersionData.prototypeUrl} onChange={e=>setNewVersionData({...newVersionData,prototypeUrl:e.target.value})} style={inp} placeholder="New prototype link (optional)"/></div>
                      </div>
                      <div style={{display:"flex",gap:6,justifyContent:"flex-end"}}>
                        <button onClick={()=>{setShowNewVersion(false);setNewVersionData({note:"",handoffUrl:"",prototypeUrl:""}); }} style={{padding:"6px 12px",fontSize:11,fontWeight:600,borderRadius:6,border:"1px solid #27272a",background:"transparent",color:"#a1a1aa",cursor:"pointer"}}>Cancel</button>
                        <button onClick={addVersion} style={{padding:"6px 12px",fontSize:11,fontWeight:600,borderRadius:6,border:"none",background:newVersionData.note.trim()?"#10b981":"#27272a",color:newVersionData.note.trim()?"#022c22":"#52525b",cursor:newVersionData.note.trim()?"pointer":"default"}}>Save Version</button>
                      </div>
                    </div>
                  )}

                  {featureHistory.length===0
                    ? <div style={{padding:"24px 16px",textAlign:"center",color:"#27272a",fontSize:13}}>No versions logged yet. Add the first one.</div>
                    : <div style={{borderLeft:"2px solid #18181b",marginLeft:6,paddingLeft:16}}>
                        {[...featureHistory].reverse().map((h,i)=>{
                          const isSel = selectedVersion===h.version;
                          return (
                            <div key={i} style={{marginBottom:isSel?16:12,position:"relative"}}>
                              <div style={{position:"absolute",left:-22,top:4,width:8,height:8,borderRadius:"50%",background:i===0?"#34d399":"#27272a"}}/>
                              <button onClick={()=>setSelectedVersion(isSel?null:h.version)} style={{background:"none",border:"none",cursor:"pointer",padding:0,textAlign:"left",width:"100%"}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                                  <span style={{fontSize:11,fontWeight:600,color:isSel?"#34d399":"#a1a1aa",fontFamily:"'DM Mono',monospace"}}>v{h.version}</span>
                                  <span style={{fontSize:11,color:"#3f3f46"}}>{fmt(h.date)}</span>
                                  {i===0&&<span style={{fontSize:9,padding:"1px 6px",borderRadius:4,background:"#10b98122",color:"#34d399",fontFamily:"'DM Mono',monospace"}}>current</span>}
                                  <span style={{fontSize:10,color:"#3f3f46",marginLeft:"auto"}}>{isSel?"▴":"▾"}</span>
                                </div>
                                <div style={{fontSize:12,color:"#52525b"}}>{h.note}</div>
                              </button>
                              {isSel&&(
                                <div style={{marginTop:8,padding:"12px 14px",background:"#0c0c0f",border:"1px solid #18181b",borderRadius:8}}>
                                  <div style={{fontSize:10,fontWeight:600,color:"#3f3f46",marginBottom:8,fontFamily:"'DM Mono',monospace",textTransform:"uppercase"}}>v{h.version} Resources</div>
                                  <div style={{display:"flex",gap:8}}>
                                    {h.handoffUrl
                                      ? <a href={h.handoffUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#18181b",border:"1px solid #27272a",borderRadius:6,textDecoration:"none",fontSize:11,color:"#34d399",fontWeight:600}}><Ic t="doc" s={14} c="#34d399"/> Handoff <Ic t="arrow" s={10} c="#3f3f46"/></a>
                                      : <div style={{flex:1,padding:"8px 10px",background:"#18181b",border:"1px solid #1f1f1f",borderRadius:6,fontSize:11,color:"#3f3f46"}}>No handoff link</div>}
                                    {h.prototypeUrl
                                      ? <a href={h.prototypeUrl} target="_blank" rel="noopener noreferrer" style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#18181b",border:"1px solid #27272a",borderRadius:6,textDecoration:"none",fontSize:11,color:"#a78bfa",fontWeight:600}}><Ic t="play" s={14} c="#a78bfa"/> Prototype <Ic t="arrow" s={10} c="#3f3f46"/></a>
                                      : <div style={{flex:1,padding:"8px 10px",background:"#18181b",border:"1px solid #1f1f1f",borderRadius:6,fontSize:11,color:"#3f3f46"}}>No prototype link</div>}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                  }
                </div>
              )}

              {/* CHANGE REQUESTS */}
              {activeTab==="changelogs"&&(
                <div>
                  <div style={{padding:"10px 14px",background:"#18181b",border:"1px solid #27272a",borderRadius:8,marginBottom:14,fontSize:12,color:"#52525b",lineHeight:1.6}}>
                    To add a change request, add a row in the <strong style={{color:"#a1a1aa"}}>changelogs</strong> sheet with <code style={{background:"#27272a",padding:"1px 5px",borderRadius:3,fontSize:11}}>featureId: {active.id}</code>
                  </div>

                  {featureLogs.length===0
                    ? <div style={{padding:"24px 16px",textAlign:"center",color:"#27272a",fontSize:13}}>No change requests yet.</div>
                    : <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {featureLogs.map(cl=>(
                          <div key={cl.id} onClick={()=>setSelectedCL({...cl, featureName: active.name, handoffUrl: active.handoffUrl})} style={{padding:"12px 14px",background:"#0c0c0f",border:"1px solid #18181b",borderRadius:10,borderLeft:"3px solid "+(cl.status==="Open"?"#f59e0b":"#10b981"),opacity:cl.status==="Resolved"?0.6:1,cursor:"pointer",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor="#27272a"} onMouseLeave={e=>e.currentTarget.style.borderColor="#18181b"}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                              <span style={{fontSize:13,fontWeight:600,color:"#e4e4e7",textDecoration:cl.status==="Resolved"?"line-through":"none"}}>{cl.title}</span>
                              <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:10,textTransform:"uppercase",letterSpacing:"0.05em",fontFamily:"'DM Mono',monospace",background:cl.status==="Open"?"#f59e0b22":"#10b98122",color:cl.status==="Open"?"#fbbf24":"#34d399"}}>{cl.status}</span>
                            </div>
                            {cl.description&&<div style={{fontSize:12,color:"#71717a",lineHeight:1.6,marginBottom:4}}>{cl.description}</div>}
                            <div style={{display:"flex",gap:8,fontSize:10,color:"#3f3f46",fontFamily:"'DM Mono',monospace"}}><span>{cl.author}</span><span>{"\u00B7"}</span><span>{fmt(cl.date)}</span></div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{height:"100%",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8,color:"#27272a"}}>
            <span style={{fontSize:14}}>Select a feature to view details</span>
            {features.length===0&&<span style={{fontSize:12}}>Add features to your Google Sheet to get started</span>}
          </div>
        )}
      </div>

      {/* CHANGE REQUEST MODAL */}
      {selectedCL && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}} onClick={e=>{if(e.target===e.currentTarget)setSelectedCL(null);}}>
          <div style={{width:480,background:"#0c0c0f",border:"1px solid #27272a",borderRadius:14,padding:"24px",position:"relative"}}>
            <button onClick={()=>setSelectedCL(null)} style={{position:"absolute",top:16,right:16,background:"none",border:"none",cursor:"pointer",padding:4}}><Ic t="close" s={16} c="#52525b"/></button>

            {/* Status badge */}
            <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:20,display:"inline-flex",alignItems:"center",gap:5,marginBottom:12,background:selectedCL.status==="Open"?"#f59e0b22":"#10b98122",color:selectedCL.status==="Open"?"#fbbf24":"#34d399",border:"1px solid "+(selectedCL.status==="Open"?"#f59e0b33":"#10b98133"),fontFamily:"'DM Mono',monospace",fontSize:9,textTransform:"uppercase",letterSpacing:"0.05em"}}>
              <span style={{width:5,height:5,borderRadius:"50%",background:selectedCL.status==="Open"?"#f59e0b":"#10b981"}}/>{selectedCL.status}
            </span>

            <h2 style={{fontSize:20,fontWeight:700,color:"#fafafa",margin:"0 0 16px",letterSpacing:"-0.02em"}}>{selectedCL.title}</h2>

            {/* Applied to */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Applied to</div>
              <div style={{padding:"10px 12px",background:"#18181b",border:"1px solid #27272a",borderRadius:8,fontSize:13,color:"#a1a1aa"}}>{selectedCL.featureName}</div>
            </div>

            {/* Description */}
            {selectedCL.description && (
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Change Description</div>
                <div style={{padding:"12px 14px",background:"#18181b",border:"1px solid #27272a",borderRadius:8,fontSize:13,color:"#a1a1aa",lineHeight:1.7}}>{selectedCL.description}</div>
              </div>
            )}

            {/* Figma link */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase",color:"#3f3f46",marginBottom:6,fontFamily:"'DM Mono',monospace"}}>Figma Reference</div>
              {selectedCL.handoffUrl
                ? <a href={selectedCL.handoffUrl} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:"#18181b",border:"1px solid #27272a",borderRadius:8,textDecoration:"none",fontSize:13,color:"#34d399",fontWeight:600}} onMouseEnter={e=>e.currentTarget.style.borderColor="#3f3f46"} onMouseLeave={e=>e.currentTarget.style.borderColor="#27272a"}>
                    <Ic t="doc" s={16} c="#34d399"/> Open Handoff in Figma <Ic t="arrow" s={13} c="#3f3f46"/>
                  </a>
                : <div style={{padding:"10px 14px",background:"#18181b",border:"1px solid #1f1f1f",borderRadius:8,fontSize:13,color:"#3f3f46"}}>No Figma link added yet</div>}
            </div>

            {/* Author / date */}
            <div style={{display:"flex",gap:8,fontSize:11,color:"#3f3f46",fontFamily:"'DM Mono',monospace",paddingTop:12,borderTop:"1px solid #18181b"}}>
              <span>{selectedCL.author}</span><span>{"\u00B7"}</span><span>{fmt(selectedCL.date)}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
