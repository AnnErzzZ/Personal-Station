"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import source from "../../../public/cases/echo/figma-source.json";
import styles from "./echo.module.css";
import phoneMasks from "./phone-masks.json";
const mask=(id:string)=>(phoneMasks as Record<string,string>)[id];
type Node = { id:string; name:string; type:string; x:number; y:number; w:number; h:number; asset:boolean; box?:{x:number;y:number;width:number;height:number}|null; fill?:{color:{r:number;g:number;b:number};opacity?:number}[];radius?:number;clip?:boolean;text?:string;font?:number;align?:string;line?:{unit:string;value?:number};children?:Node[] };
const chapters = source as unknown as Node[];
const shortNames = ["回声","参与路径","交友入口","广场推荐","房间分层","上麦流程","礼物反馈","等级身份","消息私聊","视觉系统","复盘"];
const assetPath=(id:string)=>`/cases/echo/assets/${id.replace(":","-")}.png`;
function flatten(n:Node):Node[]{return [n,...(n.children??[]).flatMap(flatten)]}
function color(n:Node){const c=n.fill?.[0];return c ? `rgba(${Math.round(c.color.r*255)},${Math.round(c.color.g*255)},${Math.round(c.color.b*255)},${c.opacity??1})`:undefined;}
function Title({node}:{node:Node}){return node.font!>=58 ? <h2>{node.text}</h2>:node.font!>=31?<h3>{node.text}</h3>:<p>{node.text}</p>}
function Layer({node:n,px=160,py=160,hero=false}:{node:Node;px?:number;py?:number;hero?:boolean}){
 const absoluteX=px+n.x,absoluteY=py+n.y;
 const s:CSSProperties={left:n.x,top:n.y,width:n.w,height:n.h,borderRadius:n.radius,background:color(n),overflow:n.clip?"hidden":undefined};
 if(n.asset){s.clipPath=mask(n.id);const b=n.box;if(b){s.left=b.x-px;s.top=b.y-py;s.width=b.width;s.height=b.height;}return <img className={styles.layerImage} data-figma-node={n.id} style={s} src={assetPath(n.id)} width={n.w} height={n.h} alt={n.name.replace("Phone Mockup / Graphite / ","").replace("Qingyu/","")} loading={hero?"eager":"lazy"} />;}
 if(n.type==="TEXT"){Object.assign(s,{background:undefined,color:color(n),fontSize:n.font,lineHeight:n.line?.unit==="PIXELS"?`${n.line.value}px`:"1.55",fontWeight:n.font!>=58?700:n.font!>=31?500:400,textAlign:n.align?.toLowerCase(),whiteSpace:"pre-wrap"});const content=n.id==="331:8"?<h1>{n.text}</h1>:<Title node={n}/>;return <div className={styles.text} data-figma-node={n.id} style={s}>{content}</div>;}
 return <div className={styles.layer} style={s} data-figma-node={n.id}>{n.children?.map(c=><Layer node={c} key={c.id} px={absoluteX} py={absoluteY} hero={hero}/>)}</div>
}
function Wave(){
 const wave=useRef<SVGSVGElement>(null);
 useEffect(()=>{const element=wave.current;if(!element)return;const observer=new IntersectionObserver(([entry])=>{element.dataset.waveVisible=String(entry.isIntersecting&&entry.intersectionRatio>=.25);},{threshold:[0,.25]});observer.observe(element);return()=>observer.disconnect();},[]);
 return <svg ref={wave} className={styles.wave} data-wave-visible="false" viewBox="0 0 180 60" fill="none" aria-hidden="true">{Array.from({length:15},(_,i)=><path key={i} d={`M${6+i*12} 24v12`} stroke="currentColor" strokeWidth="4" strokeLinecap="round" style={{animationDelay:`${i*85}ms`}}/>)}</svg>
}
function StateViewer({kind}:{kind:"mic"|"gift"|"message"}){
 const options=kind==="mic"?[["申请上麦","407:4853"],["等待确认","407:4968"],["开始发言","407:5083"]]:kind==="gift"?[["送礼前确认","362:3036"],["送礼结果","362:3049"]]:[["消息列表","407:5204"],["私聊","407:5318"]];
 const [active,setActive]=useState(0);
 return <div className={styles.viewer} data-state-viewer={kind}><div className={styles.choices} aria-label={kind==="mic"?"上麦状态":kind==="gift"?"送礼状态":"消息界面"}>{options.map(([label],i)=><button key={label} type="button" aria-pressed={i===active} onClick={()=>setActive(i)}>{label}</button>)}</div><div className={styles.stateContent} aria-live="polite"><img style={{clipPath:mask(options[active][1])}} src={assetPath(options[active][1])} alt={options[active][0]} width="400" height="840" loading="lazy"/><div className={styles.stateLabel}><Wave/><p>{options[active][0]}</p><span>{kind==="mic"?"原型模拟排队通过":kind==="gift"?"价格为展示示例":"从房间互动延续到一对一交流。"}</span></div></div></div>;
}
function MobileChatFeed({node}:{node:Node}){
 return <div className={styles.mobileChatFeed} data-mobile-chat-feed aria-label="公屏消息特写">{node.children?.map(row=><div className={styles.mobileChatRow} key={row.id} style={{background:color(row),borderRadius:row.radius}}>{row.children?.map(item=>item.asset?<img key={item.id} src={assetPath(item.id)} width={item.w} height={item.h} alt={item.name} loading="lazy"/>:<span key={item.id} data-figma-copy={item.id} style={{color:color(item)}}>{item.text}</span>)}</div>)}</div>;
}
function MobileChapter({node,index}:{node:Node;index:number}){
 const all=flatten(node),texts=all.filter(n=>n.text),heading=index===0?texts.find(n=>n.id==="331:8"):texts.find(n=>n.font===58);
 const groups:string[][][]=[
 [[["331:9","331:11"],["361:3010","361:3023"],[]]],
 [[[],[],["331:637"]],[["351:2798"],["351:2807","351:2809","351:2811","351:2812"],["351:3005"]],[["351:2801"],["351:2888","351:2889","351:2890","351:2891","351:2893","351:2894","351:2895","351:2896"],["351:3006"]],[["351:2804"],["351:3001"],["351:3007"]]],
 [[["412:4605"],["362:3400"],["332:1014"]],[["332:1015"],["362:3010"],["332:1016"]]],
 [[[],[],["407:4609"]],[["407:4618"],["407:4619"],["407:4613"]],[["407:4732"],["407:4733"],["407:4616"]]],
 [[["412:4606"],["362:3023"],[]],[["332:1305"],["332:1309","332:1310","332:1311","332:1312","332:1314","332:1315","332:1316","332:1317"],["332:1306"]],[["332:1387"],[],["332:1388"]]],
 [[[],[],["407:4849"]],[["407:4852"],["407:4853"],["407:4965"]],[["407:4967"],["407:4968"],["407:5080"]],[["407:5082"],["407:5083"],["407:5195"]]],
 [[["333:1829"],["362:3036"],["333:1830"]],[["333:1831"],["362:3049"],["333:1832"]],[[],["353:2836","353:2838","353:2840"],[]]],
 [[[],[],["333:2713"]],[["333:2721"],["333:2717"],[]],[["333:2729"],["333:2725"],[]],[["333:2737"],["333:2733"],[]],[["333:2745"],["333:2741"],[]],[["333:2753"],["333:2749"],[]],[["333:3171"],["362:3062"],["333:3172"]],[["333:3173"],["362:3140"],["333:3174"]]],
 [[[],[],["407:5200"]],[["407:5203"],["407:5204"],["407:5432"]],[["407:5317"],["407:5318"],["407:5435"]]],
 [[["334:2391"],[],["334:2392"]],[["334:2394"],[],["334:2395","334:2396","334:2397"]],[["334:2398"],["334:2399","334:2402","334:2405","334:2408","334:2412","334:2416"],[]],[["334:2420"],["334:2458"],[]]],
 [[["412:4607"],["362:3088","362:3075"],["334:2957"]],[["334:2960"],[],["334:2961","334:2963"]]]
 ][index] as unknown as string[][][];
 const get=(id:string)=>all.find(n=>n.id===id);
 return <div className={styles.mobile}><header>{index===0?<h1>{heading?.text}</h1>:<h2>{heading?.text}</h2>}</header>{groups.map(([titles,media,body],i)=><div className={styles.mobileGroup} key={i}><div className={styles.mobileCopy}>{titles.map(id=>{const n=get(id);return n?<h3 key={id}>{n.text}</h3>:null})}</div>{index===4&&titles.includes("332:1387")&&get("332:1400")?<MobileChatFeed node={get("332:1400")!}/>:null}<div className={styles.mobileMedia}>{media.map(id=>{const n=get(id);return n?<figure key={id} data-small={n.w<240}><img style={{clipPath:mask(id)}} src={assetPath(id)} width={n.w} height={n.h} alt={n.name.replace("Phone Mockup / Graphite / ","")} loading={index===0?"eager":"lazy"}/></figure>:null})}</div><div className={styles.mobileCopy}>{body.map(id=><p key={id} data-figma-copy={id}>{get(id)?.text}</p>)}</div></div>)}</div>;
}
function Retrospective(){
 const points=[
  ["串联参与路径","交友入口、语聊房、上麦与送礼按参与过程组织，消息和成长界面承接后续互动。"],
  ["区分信息与反馈","麦位区分发言、静音与空麦状态；公屏分层展示公告、聊天和礼物记录，送礼后保留特效与播报反馈。"],
  ["继续验证使用过程","通过找房、上麦和送礼任务，观察用户在哪一步犹豫或误触，检查反馈是否易懂，以及消息密集时的阅读情况。"],
 ];
 return <div className={styles.retrospective} data-echo-retrospective><header><h2>复盘</h2><p>整理本次设计取舍与下一步验证。</p></header><div className={styles.reflectionList}>{points.map(([title,body],i)=><article key={title}><span aria-hidden="true">{String(i+1).padStart(2,"0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div><p className={styles.reflectionScope}>自主设计探索。价格、奖励与成长门槛为示例，用户测试与业务效果尚待验证。</p></div>;
}
export default function EchoCase(){
 const root=useRef<HTMLElement>(null);const [active,setActive]=useState(0);
 useEffect(()=>{const el=root.current;if(!el)return;const observer=new IntersectionObserver(entries=>{for(const entry of entries){const section=entry.target as HTMLElement;section.dataset.visible=String(entry.isIntersecting);if(entry.isIntersecting)section.dataset.revealed="true";if(entry.isIntersecting&&entry.intersectionRatio>0.12)setActive(Number(section.dataset.chapter));}},{threshold:[0,.12,.3]});el.querySelectorAll("section[data-chapter]").forEach(s=>observer.observe(s));const visibility=()=>{el.dataset.paused=String(document.hidden)};document.addEventListener("visibilitychange",visibility);return()=>{observer.disconnect();document.removeEventListener("visibilitychange",visibility)};},[]);
 return <main ref={root} className={styles.case} data-echo-case><a href="#echo-content" className={styles.skip}>跳至案例内容</a><div className={styles.background} data-echo-background aria-hidden="true"><svg viewBox="0 0 1600 1080" preserveAspectRatio="xMidYMid slice"><g stroke="#b28bdc" opacity=".13" fill="none">{[0,1,2,3].map(i=><ellipse key={i} cx={1180+i*56} cy="500" rx="520" ry="700" transform="rotate(-26 1100 500)"/>)}</g></svg></div><div id="echo-content" className={styles.content}>{chapters.map((node,index)=><section key={node.id} id={`echo-${index+1}`} data-chapter={index} className={styles.chapter} aria-label={shortNames[index]}><>{index===10?<Retrospective/>:<><div className={styles.desktop} style={{height:`calc(${node.h} * var(--u))`}}><div className={styles.canvas}>{node.children?.map(n=><Layer node={n} key={n.id} px={160} py={160+node.y} hero={index===0}/>)}</div></div><MobileChapter node={node} index={index}/></>}</>{index===5?<StateViewer kind="mic"/>:index===6?<StateViewer kind="gift"/>:index===8?<StateViewer kind="message"/>:null}</section>)}<footer className={styles.footer}><Link href="/">返回作品</Link><a href="#echo-1">返回顶部 ↑</a></footer></div><nav className={styles.chapterNav} aria-label="案例章节"><label className={styles.mobileSelect}>章节<select value={active} onChange={e=>document.getElementById(`echo-${Number(e.target.value)+1}`)?.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"})}>{shortNames.map((n,i)=><option value={i} key={n}>{String(i+1).padStart(2,"0")} {n}</option>)}</select></label><div className={styles.navLinks}>{shortNames.map((n,i)=><a key={n} href={`#echo-${i+1}`} aria-current={active===i?"location":undefined}><span>{String(i+1).padStart(2,"0")}</span>{n}</a>)}</div></nav></main>
}


