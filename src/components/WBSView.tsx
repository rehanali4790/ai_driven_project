import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRight, ChevronDown, Search, GitBranch,
  CheckCircle, Clock, AlertTriangle, Sparkles,
  Info, Eye, X, Download,
} from "lucide-react";

/* ── TOKENS ─────────────────────────────────────────────── */
const C = {
  teal:"#12b3a8", tealDk:"#0e9188", tealLt:"#edfaf9", teal10:"#c8eeec",
  navy:"#0f3433", navyMid:"#1a4a49",
  white:"#ffffff",
  g50:"#f8fafb", g100:"#f1f3f5", g200:"#e4e7ea", g300:"#cdd2d7",
  g400:"#9aa3ad", g500:"#6b757f", g600:"#4b535c", g700:"#343c44",
  amber:"#f59e0b", emerald:"#10b981", red:"#ef4444",
  redLt:"#fff1f1", emerLt:"#edfdf5", amberLt:"#fffbeb",
};
const FONT = `-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`;
const MONO = `"SF Mono","Fira Code",Consolas,"Courier New",monospace`;

/* ── DATA ───────────────────────────────────────────────── */
const ROOT = {
  id:"1",code:"1.0",name:"Infrastructure Development of Education City",level:0,status:"in_progress",progress:42,type:"project",
  children:[
    {id:"1.1",code:"1.1",name:"Site Preparation & Earthworks",level:1,status:"completed",progress:100,type:"phase",children:[
      {id:"1.1.1",code:"1.1.1",name:"Site Clearing & Demolition",level:2,status:"completed",progress:100,type:"work_package",children:[]},
      {id:"1.1.2",code:"1.1.2",name:"Excavation & Grading",level:2,status:"completed",progress:100,type:"work_package",children:[]},
      {id:"1.1.3",code:"1.1.3",name:"Soil Testing & Compaction",level:2,status:"completed",progress:100,type:"work_package",children:[]},
    ]},
    {id:"1.2",code:"1.2",name:"Foundation & Structural Works",level:1,status:"in_progress",progress:65,type:"phase",children:[
      {id:"1.2.1",code:"1.2.1",name:"Pile Foundation Installation",level:2,status:"completed",progress:100,type:"work_package",children:[]},
      {id:"1.2.2",code:"1.2.2",name:"RCC Frame Construction",level:2,status:"in_progress",progress:70,type:"work_package",children:[]},
      {id:"1.2.3",code:"1.2.3",name:"Load-Bearing Wall Masonry",level:2,status:"in_progress",progress:45,type:"work_package",children:[]},
      {id:"1.2.4",code:"1.2.4",name:"Slab & Roof Casting",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
    ]},
    {id:"1.3",code:"1.3",name:"MEP Works",level:1,status:"in_progress",progress:28,type:"phase",children:[
      {id:"1.3.1",code:"1.3.1",name:"Electrical Conduit Laying",level:2,status:"in_progress",progress:55,type:"work_package",children:[]},
      {id:"1.3.2",code:"1.3.2",name:"Plumbing & Drainage Network",level:2,status:"in_progress",progress:30,type:"work_package",children:[]},
      {id:"1.3.3",code:"1.3.3",name:"HVAC Duct Installation",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
      {id:"1.3.4",code:"1.3.4",name:"Fire Suppression System",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
    ]},
    {id:"1.4",code:"1.4",name:"Finishing & Interior Works",level:1,status:"not_started",progress:0,type:"phase",children:[
      {id:"1.4.1",code:"1.4.1",name:"Flooring & Tiling",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
      {id:"1.4.2",code:"1.4.2",name:"Plastering & Painting",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
      {id:"1.4.3",code:"1.4.3",name:"Doors, Windows & Glazing",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
    ]},
    {id:"1.5",code:"1.5",name:"External Development",level:1,status:"at_risk",progress:12,type:"phase",children:[
      {id:"1.5.1",code:"1.5.1",name:"Road & Pathway Construction",level:2,status:"at_risk",progress:20,type:"work_package",children:[]},
      {id:"1.5.2",code:"1.5.2",name:"Landscaping & Green Areas",level:2,status:"not_started",progress:0,type:"work_package",children:[]},
      {id:"1.5.3",code:"1.5.3",name:"Boundary Wall & Gates",level:2,status:"in_progress",progress:35,type:"work_package",children:[]},
    ]},
  ],
};

const COSTS = {
  "1":48500000,"1.1":8200000,"1.1.1":1850000,"1.1.2":3200000,"1.1.3":3150000,
  "1.2":18600000,"1.2.1":4200000,"1.2.2":6800000,"1.2.3":4400000,"1.2.4":3200000,
  "1.3":11400000,"1.3.1":3200000,"1.3.2":2800000,"1.3.3":2900000,"1.3.4":2500000,
  "1.4":7200000,"1.4.1":2600000,"1.4.2":2400000,"1.4.3":2200000,
  "1.5":3100000,"1.5.1":1200000,"1.5.2":900000,"1.5.3":1000000,
};

const RESOURCES = {
  "1.1.1":[{id:"r1",name:"Ali Hassan",type:"labor",role:"Site Engineer",costRate:4500,capacity:100,allocated:80,status:"active",email:"ali.hassan@infra.pk",skills:["Demolition","Safety Management"],taskNames:["Site Clearing & Demolition"],estimatedCost:810000}],
  "1.2.2":[
    {id:"r2",name:"Ahmed Raza",type:"labor",role:"Structural Engineer",costRate:6200,capacity:100,allocated:100,status:"active",email:"ahmed.raza@infra.pk",skills:["RCC Design","Structural Analysis"],taskNames:["RCC Frame Construction"],estimatedCost:1240000},
    {id:"r3",name:"Material – RCC",type:"material",role:"Construction Material",costRate:3500,capacity:100,allocated:100,status:"available",email:null,skills:[],taskNames:["RCC Frame Construction"],estimatedCost:2800000},
  ],
  "1.3.1":[{id:"r4",name:"Usman Farooq",type:"labor",role:"Electrical Supervisor",costRate:5000,capacity:100,allocated:90,status:"active",email:"usman.farooq@infra.pk",skills:["HV Wiring","Load Estimation"],taskNames:["Electrical Conduit Laying"],estimatedCost:990000}],
  "1.5.1":[{id:"r5",name:"Hassan Malik",type:"labor",role:"Civil Engineer",costRate:4800,capacity:100,allocated:60,status:"active",email:"hassan.malik@infra.pk",skills:["Road Design","Asphalt Works"],taskNames:["Road & Pathway Construction"],estimatedCost:460800}],
};

const ST = {
  completed:   {bg:C.tealLt, border:C.teal10,  color:C.teal,    dot:C.teal,    Icon:CheckCircle,  label:"Completed"},
  in_progress: {bg:C.emerLt, border:"#bbf0dc",  color:"#059669", dot:C.emerald, Icon:Clock,        label:"In Progress"},
  not_started: {bg:C.g100,   border:C.g200,     color:C.g400,    dot:C.g300,    Icon:AlertTriangle,label:"Not Started"},
  at_risk:     {bg:C.redLt,  border:"#fecaca",  color:C.red,     dot:C.red,     Icon:AlertTriangle,label:"At Risk"},
};

const fmt = n => Number(n).toLocaleString("en-PK");
const barColor = v => v>=100?C.teal:v>=50?C.emerald:C.amber;

/* ── BADGE ──────────────────────────────────────────────── */
function Badge({status}) {
  const s = ST[status]??ST.not_started;
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:7,background:s.bg,border:`1px solid ${s.border}`,color:s.color,fontSize:11,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",whiteSpace:"nowrap",fontFamily:FONT}}>
      <s.Icon size={11} strokeWidth={2.5}/>{s.label}
    </span>
  );
}

/* ── PROGRESS BAR ────────────────────────────────────────── */
function Bar({value,clickable,onClick}) {
  const bc = barColor(value);
  const inner = (
    <div style={{display:"flex",alignItems:"center",gap:7}}>
      <div style={{width:7,height:7,borderRadius:"50%",background:bc,flexShrink:0}}/>
      <div style={{width:80,height:4,background:C.g100,borderRadius:99,overflow:"hidden"}}>
        <div style={{width:`${value}%`,height:"100%",background:bc,borderRadius:99,transition:"width 0.3s"}}/>
      </div>
      <span style={{fontSize:13,fontWeight:700,color:C.navy,minWidth:30,fontFamily:MONO}}>{value}%</span>
    </div>
  );
  if (!clickable) return inner;
  return <button onClick={onClick} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>{inner}</button>;
}

/* ── TABLE ROW ───────────────────────────────────────────── */
function WBSRow({node,expanded,selected,res,onToggle,onSelect,onProgress,onRes,progVal}) {
  const [hov,setHov] = useState(false);
  const isSel = selected?.id===node.id;
  const hasKids = node.children?.length>0;
  const pad = node.level*20;
  return (
    <tr
      onClick={()=>onSelect(node)}
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      style={{background:isSel?C.tealLt:hov?C.g50:C.white,cursor:"pointer",transition:"background 0.1s",borderBottom:`1px solid ${C.g100}`}}
    >
      {/* Code */}
      <td style={{padding:"13px 16px 13px 20px",whiteSpace:"nowrap"}}>
        <div style={{display:"flex",alignItems:"center",paddingLeft:pad}}>
          <div style={{width:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            {hasKids
              ? <button onClick={e=>{e.stopPropagation();onToggle(node.id);}} style={{background:"none",border:"none",cursor:"pointer",padding:"2px 3px",borderRadius:5,display:"flex",color:C.g400}}>
                  {expanded?<ChevronDown size={13} strokeWidth={2.5}/>:<ChevronRight size={13} strokeWidth={2.5}/>}
                </button>
              : <div style={{width:6,height:6,borderRadius:"50%",background:C.g200,marginLeft:3}}/>
            }
          </div>
          <span style={{marginLeft:6,fontSize:12,fontWeight:600,color:C.g400,fontFamily:MONO}}>{node.code}</span>
        </div>
      </td>

      {/* Name */}
      <td style={{padding:"13px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <GitBranch size={14} strokeWidth={1.8} color={isSel?C.teal:C.g300} style={{flexShrink:0}}/>
          <span style={{fontSize:14,fontWeight:node.level===0?800:node.level===1?700:500,color:isSel?C.navy:C.g700,fontFamily:FONT}}>{node.name}</span>
        </div>
      </td>

      {/* Status */}
      <td style={{padding:"13px 16px"}}><Badge status={node.status}/></td>

      {/* Progress */}
      <td style={{padding:"13px 16px"}}>
        <Bar value={progVal} clickable={node.level>0} onClick={e=>{e.stopPropagation();onProgress(node);}}/>
      </td>

      {/* Category */}
      <td style={{padding:"13px 16px"}}>
        <span style={{fontSize:11,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.09em",fontFamily:FONT}}>{node.type.replace("_"," ")}</span>
      </td>

      {/* Cost */}
      <td style={{padding:"13px 16px",whiteSpace:"nowrap"}}>
        <span style={{fontSize:13,fontWeight:700,color:C.navy,fontFamily:MONO}}>PKR {fmt(COSTS[node.id]??0)}</span>
      </td>

      {/* Resources */}
      <td style={{padding:"13px 20px 13px 16px"}}>
        <button
          disabled={!res.length}
          onClick={e=>{e.stopPropagation();if(res.length)onRes(node);}}
          style={{display:"inline-flex",alignItems:"center",gap:5,padding:"5px 11px",borderRadius:8,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:FONT,cursor:res.length?"pointer":"not-allowed",background:res.length?C.tealLt:C.g50,color:res.length?C.navy:C.g300,border:`1px solid ${res.length?C.teal10:C.g200}`,transition:"all 0.1s"}}
        >
          <Eye size={12} strokeWidth={2}/>{res.length?`${res.length} View`:"None"}
        </button>
      </td>
    </tr>
  );
}

/* ── MODAL SHELL ─────────────────────────────────────────── */
function ModalShell({onClose,width=720,children}) {
  return createPortal(
    <div style={{position:"fixed",inset:0,zIndex:200,background:"rgba(10,20,20,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{
        width:Math.min(width,window.innerWidth-32),
        maxHeight:"calc(100vh - 32px)",
        minHeight:0,
        background:C.white,
        borderRadius:18,
        border:`1px solid ${C.g200}`,
        overflow:"hidden",
        display:"flex",
        flexDirection:"column",
        fontFamily:FONT,
      }}>
        {children}
      </div>
    </div>,
    document.body
  );
}

function MHead({title,sub,onClose}) {
  return (
    <div style={{padding:"20px 24px 16px",borderBottom:`1px solid ${C.g100}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexShrink:0}}>
      <div>
        <h2 style={{margin:0,fontSize:17,fontWeight:700,color:C.navy,fontFamily:FONT}}>{title}</h2>
        {sub&&<p style={{margin:"4px 0 0",fontSize:12,color:C.g400,fontFamily:MONO}}>{sub}</p>}
      </div>
      <button onClick={onClose} style={{background:C.g100,border:"none",borderRadius:8,padding:"6px 7px",cursor:"pointer",color:C.g600,display:"flex",alignItems:"center",marginLeft:12,flexShrink:0}}>
        <X size={16} strokeWidth={2}/>
      </button>
    </div>
  );
}

/* ── RESOURCE MODAL ──────────────────────────────────────── */
function ResourceModal({node,onClose}) {
  const res = RESOURCES[node.id]??[];
  const total = res.reduce((s,r)=>s+r.estimatedCost,0);
  const tasks = new Set(res.flatMap(r=>r.taskNames)).size;
  return (
    <ModalShell onClose={onClose} width={780}>
      <MHead title="Allocated Resources" sub={`${node.code} — ${node.name}`} onClose={onClose}/>
      <div style={{padding:"10px 24px",background:C.g50,borderBottom:`1px solid ${C.g100}`,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <span style={{padding:"3px 12px",background:C.white,border:`1px solid ${C.g200}`,borderRadius:20,fontSize:12,fontWeight:600,color:C.navy}}>{res.length} Resource{res.length!==1?"s":""}</span>
        <span style={{fontSize:12,color:C.g400}}>Costs estimated from task duration × allocation percentage.</span>
      </div>
      <div style={{
        flex:1,
        minHeight:0,
        overflowY:"auto",
        overflowX:"hidden",
        WebkitOverflowScrolling:"touch",
        padding:24,
        display:"flex",
        flexDirection:"column",
        gap:14,
      }}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[{l:"Total Estimated Cost",v:`PKR ${fmt(Math.round(total))}`},{l:"Unique Tasks Covered",v:tasks},{l:"Total Resources",v:res.length}].map((k,i)=>(
            <div key={i} style={{background:C.g50,border:`1px solid ${C.g100}`,borderRadius:12,padding:"14px 16px"}}>
              <p style={{margin:"0 0 5px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>{k.l}</p>
              <p style={{margin:0,fontSize:16,fontWeight:700,color:C.navy,fontFamily:MONO}}>{k.v}</p>
            </div>
          ))}
        </div>
        {res.map(r=>(
          <div key={r.id} style={{border:`1px solid ${C.g100}`,borderRadius:14,padding:"16px 18px",background:C.g50}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:C.navy}}>{r.name}</p>
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <span style={{padding:"2px 8px",background:C.white,border:`1px solid ${C.g200}`,borderRadius:6,fontSize:11,fontWeight:600,color:C.g500,textTransform:"uppercase"}}>{r.type}</span>
                  <span style={{padding:"2px 8px",background:C.white,border:`1px solid ${C.g200}`,borderRadius:6,fontSize:11,fontWeight:600,color:C.g500}}>{r.role}</span>
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>Estimated Cost</p>
                <p style={{margin:0,fontSize:15,fontWeight:700,color:C.navy,fontFamily:MONO}}>PKR {fmt(Math.round(r.estimatedCost))}</p>
              </div>
            </div>
            <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.g200}`}}>
              <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>Assigned Tasks</p>
              <p style={{margin:0,fontSize:13,color:C.g600,lineHeight:1.5}}>{r.taskNames.join(", ")}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12}}>
              {[{l:"Capacity",v:`${r.capacity}%`},{l:"Allocated",v:`${r.allocated}%`},{l:"Rate/Unit",v:`PKR ${fmt(r.costRate)}`},{l:"Status",v:r.status}].map((m,i)=>(
                <div key={i} style={{background:C.white,border:`1px solid ${C.g100}`,borderRadius:9,padding:"8px 10px"}}>
                  <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.09em"}}>{m.l}</p>
                  <p style={{margin:0,fontSize:13,fontWeight:600,color:C.navy,fontFamily:MONO,textTransform:"capitalize"}}>{m.v}</p>
                </div>
              ))}
            </div>
            {(r.email||r.skills?.length>0)&&(
              <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.g200}`}}>
                {r.email&&<p style={{margin:"0 0 2px",fontSize:13,color:C.g600,fontFamily:FONT}}><span style={{fontWeight:700,color:C.g500}}>Contact:</span> {r.email}</p>}
                {r.skills?.length>0&&<p style={{margin:0,fontSize:13,color:C.g600,fontFamily:FONT}}><span style={{fontWeight:700,color:C.g500}}>Skills:</span> {r.skills.join(", ")}</p>}
              </div>
            )}
          </div>
        ))}
        {!res.length&&<div style={{textAlign:"center",padding:"32px 0"}}><p style={{margin:0,fontSize:14,fontWeight:600,color:C.g400}}>No resources assigned to this node.</p></div>}
      </div>
    </ModalShell>
  );
}

/* ── PROGRESS MODAL ──────────────────────────────────────── */
function ProgressModal({node,initVal,onSave,onClose}) {
  const [val,setVal] = useState(initVal);
  const bc = barColor(val);
  return (
    <ModalShell onClose={onClose} width={440}>
      <MHead title="Update Progress" sub={`${node.code} — ${node.name}`} onClose={onClose}/>
      <div style={{padding:24,fontFamily:FONT}}>
        <p style={{margin:"0 0 14px",fontSize:11,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>Completion Percentage</p>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <input type="range" min={0} max={100} step={1} value={val} onChange={e=>setVal(+e.target.value)} style={{flex:1,accentColor:C.teal}}/>
          <input type="number" min={0} max={100} value={val} onChange={e=>setVal(Math.max(0,Math.min(100,+e.target.value)))} style={{width:60,padding:"7px 10px",borderRadius:8,border:`1px solid ${C.g200}`,fontSize:14,fontWeight:600,color:C.navy,textAlign:"center",fontFamily:MONO,outline:"none"}}/>
        </div>
        <div style={{height:8,background:C.g100,borderRadius:99,overflow:"hidden",marginBottom:24}}>
          <div style={{width:`${val}%`,height:"100%",background:bc,borderRadius:99,transition:"width 0.25s"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:9,border:`1px solid ${C.g200}`,background:C.white,fontSize:14,fontWeight:600,color:C.g600,cursor:"pointer",fontFamily:FONT}}>Cancel</button>
          <button onClick={()=>onSave(node.id,val)} style={{padding:"9px 20px",borderRadius:9,border:"none",background:C.teal,fontSize:14,fontWeight:600,color:C.white,cursor:"pointer",fontFamily:FONT}}>Save Progress</button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ── DETAIL PANEL ────────────────────────────────────────── */
function DetailPanel({node,progVal}) {
  const cost = COSTS[node.id]??0;
  const fields=[
    {l:"WBS Code",v:node.code,mono:true},
    {l:"Deliverable",v:node.name},
    {l:"Category",v:node.type.replace("_"," ")},
    {l:"Status",v:node.status.replace("_"," ")},
    {l:"Completion",v:`${progVal}%`,mono:true},
    {l:"Child Nodes",v:node.children?.length??0},
    {l:"Task Dates",v:"2024-01-15 – 2024-09-30"},
    {l:"Assigned To",v:"Project Team"},
    {l:"Estimated Cost",v:`PKR ${fmt(cost)}`,mono:true},
  ];
  return (
    <div style={{background:C.white,borderRadius:18,border:`1px solid ${C.g100}`,padding:"24px 28px",fontFamily:FONT}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
        <div style={{width:38,height:38,background:C.tealLt,borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <Info size={18} color={C.teal} strokeWidth={2}/>
        </div>
        <div>
          <h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.navy}}>Element Details</h3>
          <p style={{margin:"2px 0 0",fontSize:12,color:C.g400}}>Selected WBS node information</p>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:"16px 20px",marginBottom:20}}>
        {fields.map((f,i)=>(
          <div key={i}>
            <p style={{margin:"0 0 3px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>{f.l}</p>
            <p style={{margin:0,fontSize:14,fontWeight:600,color:C.navy,textTransform:"capitalize",fontFamily:f.mono?MONO:FONT,wordBreak:"break-word"}}>{f.v}</p>
          </div>
        ))}
      </div>
      <div style={{borderTop:`1px solid ${C.g100}`,paddingTop:18}}>
        <p style={{margin:"0 0 12px",fontSize:11,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:"0.09em"}}>Inventory Allocation</p>
        <div style={{background:C.g50,border:`1px dashed ${C.g200}`,borderRadius:10,padding:"18px 20px",textAlign:"center"}}>
          <p style={{margin:0,fontSize:14,fontWeight:600,color:C.g500}}>No inventory allocated to this node yet.</p>
          <p style={{margin:"4px 0 0",fontSize:12,color:C.g400}}>Once inventory is assigned it will appear here with quantity and resource mapping.</p>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ────────────────────────────────────────────────── */
export default function WBSView() {
  const [expanded,setExpanded]   = useState(new Set(["1","1.1","1.2"]));
  const [selected,setSelected]   = useState(null);
  const [resModal,setResModal]   = useState(null);
  const [progModal,setProgModal] = useState(null);
  const [search,setSearch]       = useState("");
  const [generating,setGen]      = useState(false);
  const [overrides,setOverrides] = useState({});

  const toggle = id => {
    const s = new Set(expanded);
    s.has(id)?s.delete(id):s.add(id);
    setExpanded(s);
  };
  const saveProgress = (id,val) => { setOverrides(p=>({...p,[id]:val})); setProgModal(null); };

  const renderRows = node => {
    const rows=[];
    const q=search.toLowerCase();
    const match=!search||node.name.toLowerCase().includes(q)||node.code.includes(q);
    const res=RESOURCES[node.id]??[];
    const progVal=overrides[node.id]??node.progress;
    if(match) rows.push(
      <WBSRow key={node.id} node={node} expanded={expanded.has(node.id)} selected={selected}
        res={res} onToggle={toggle} onSelect={setSelected}
        onProgress={n=>setProgModal(n)} onRes={n=>setResModal(n)} progVal={progVal}/>
    );
    if(node.children?.length&&(expanded.has(node.id)||search))
      node.children.forEach(c=>rows.push(...renderRows(c)));
    return rows;
  };

  const rootProg = overrides["1"]??ROOT.progress;

  return (
    <div style={{fontFamily:FONT,padding:"0 2px",color:C.navy}}>

      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{margin:0,fontSize:24,fontWeight:800,color:C.navy,letterSpacing:"-0.02em",fontFamily:FONT}}>Work Breakdown Structure</h1>
          <p style={{margin:"5px 0 0",fontSize:13,color:C.g400,fontWeight:500}}>Hierarchical task decomposition · AI-parsed from project documents</p>
        </div>
        <button
          onClick={async()=>{setGen(true);await new Promise(r=>setTimeout(r,2200));setGen(false);}}
          style={{display:"inline-flex",alignItems:"center",gap:7,padding:"10px 20px",borderRadius:11,background:generating?C.navyMid:C.teal,color:C.white,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",fontFamily:FONT}}
        >
          <Sparkles size={15} strokeWidth={2}/>{generating?"Regenerating…":"AI Generate WBS"}
        </button>
      </div>

      {/* AI banner */}
      {generating&&(
        <div style={{background:C.white,border:`1px solid ${C.g100}`,borderRadius:14,padding:"16px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:C.tealLt,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <Sparkles size={15} color={C.teal} strokeWidth={2}/>
          </div>
          <div>
            <p style={{margin:0,fontSize:12,fontWeight:700,color:C.navy,textTransform:"uppercase",letterSpacing:"0.08em"}}>AI Engine Status</p>
            <p style={{margin:"3px 0 0",fontSize:13,color:C.g500}}>Analyzing document context and reconstructing task graph…</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
        {[{l:"Total Nodes",v:"17",color:C.teal},{l:"Completed",v:"4",color:C.emerald},{l:"At Risk",v:"2",color:C.red},{l:"Budget (PKR)",v:"48.5M",color:C.amber}].map((s,i)=>(
          <div key={i} style={{background:C.white,border:`1px solid ${C.g100}`,borderRadius:13,padding:"14px 18px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${s.color}1a`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:s.color}}/>
            </div>
            <div>
              <p style={{margin:"0 0 2px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>{s.l}</p>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:C.navy,fontFamily:MONO}}>{s.v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{background:C.white,borderRadius:18,border:`1px solid ${C.g100}`,overflow:"hidden",marginBottom:16}}>

        {/* Toolbar */}
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.g100}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
          <div style={{position:"relative"}}>
            <Search size={14} color={C.g400} style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)"}} strokeWidth={2}/>
            <input type="text" placeholder="Find WBS element…" value={search} onChange={e=>setSearch(e.target.value)}
              style={{paddingLeft:32,paddingRight:12,paddingTop:8,paddingBottom:8,background:C.g50,border:"none",borderRadius:9,width:220,fontSize:13,fontWeight:500,color:C.navy,outline:"none",fontFamily:FONT}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{background:C.g50,border:`1px solid ${C.g100}`,borderRadius:10,padding:"8px 14px"}}>
              <p style={{margin:"0 0 5px",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.1em"}}>Project Progress</p>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:100,height:4,background:C.g200,borderRadius:99,overflow:"hidden"}}>
                  <div style={{width:`${rootProg}%`,height:"100%",background:C.teal,borderRadius:99}}/>
                </div>
                <span style={{fontSize:14,fontWeight:700,color:C.navy,fontFamily:MONO}}>{rootProg}%</span>
              </div>
            </div>
            <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",background:C.white,border:`1px solid ${C.g200}`,borderRadius:9,fontSize:12,fontWeight:600,color:C.g600,cursor:"pointer",textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:FONT}}>
              <Download size={13} strokeWidth={2}/> Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:C.g50,borderBottom:`1px solid ${C.g100}`}}>
                {["Hierarchy Code","Deliverable Name","Status","Progress","Category","Estimated Cost","Resources"].map((h,i)=>(
                  <th key={i} style={{padding:"11px 16px",textAlign:"left",fontSize:10,fontWeight:700,color:C.g400,textTransform:"uppercase",letterSpacing:"0.11em",whiteSpace:"nowrap",fontFamily:FONT}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>{renderRows(ROOT)}</tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{padding:"10px 20px",borderTop:`1px solid ${C.g50}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.teal}}/>
            <span style={{fontSize:12,color:C.g400,fontWeight:500,fontFamily:FONT}}>17 nodes · real-time sync</span>
          </div>
          <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
            {Object.entries(ST).map(([k,s])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:s.dot}}/>
                <span style={{fontSize:11,fontWeight:500,color:C.g500,fontFamily:FONT}}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detail panel */}
      {selected&&<DetailPanel node={selected} progVal={overrides[selected.id]??selected.progress}/>}

      {/* Modals */}
      {resModal&&<ResourceModal node={resModal} onClose={()=>setResModal(null)}/>}
      {progModal&&<ProgressModal node={progModal} initVal={overrides[progModal.id]??progModal.progress} onSave={saveProgress} onClose={()=>setProgModal(null)}/>}
    </div>
  );
}