import { resolveNoteLink } from './links.ts';
import React from 'react';import { marked }from'marked';import{safeUrl}from'./presentation.ts';import type{Note}from'./shared.ts';
export function Markdown({text,notes,onOpen,path=''}:{text:string;notes:Note[];onOpen:(path:string)=>void;path?:string}){
 function linked(text:string):React.ReactNode[]{return text.split(/(\[\[[^\]]+\]\])/g).map((part,i)=>{const match=part.match(/^\[\[([^|\]#]+)(?:#[^|\]]*)?(?:\|([^\]]+))?\]\]$/);if(!match)return part;const resolved=resolveNoteLink(notes,path,match[1]);return resolved?<button className="wiki-link" key={i} onClick={()=>onOpen(resolved)}>{match[2]||match[1]}</button>:<span className="unresolved" key={i} title="Unresolved link">{match[2]||match[1]}</span>;});}
 function render(tokens:any[]):React.ReactNode[]{return tokens.map((t,i)=>{const inner=()=>t.tokens?render(t.tokens):linked(t.text||'');switch(t.type){
  case 'heading':return React.createElement('h'+Math.min(t.depth,4),{key:i},inner());
  case 'paragraph':return <p key={i}>{inner()}</p>;
  case 'text':case 'escape':return <React.Fragment key={i}>{inner()}</React.Fragment>;
  case 'strong':return <strong key={i}>{inner()}</strong>;case'em':return <em key={i}>{inner()}</em>;
  case 'del':return <del key={i}>{inner()}</del>;case'codespan':return <code key={i}>{t.text}</code>;
  case 'code':return <pre key={i}><code>{t.text}</code></pre>;
  case 'blockquote':return <blockquote key={i}>{inner()}</blockquote>;
  case 'list':return React.createElement(t.ordered?'ol':'ul',{key:i},t.items.map((item:any,j:number)=><li key={j}>{item.task?<span aria-label={item.checked?'Complete':'Incomplete'}>{item.checked?'☑ ':'☐ '}</span>:null}{render(item.tokens)}</li>));
  case 'link':{const href=safeUrl(t.href);if(href)return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{inner()}</a>;const resolved=resolveNoteLink(notes,path,t.href);return resolved?<button className="wiki-link" key={i} onClick={()=>onOpen(resolved)}>{inner()}</button>:<span className="unresolved" key={i} title="Unresolved link">{inner()}</span>;}
  case 'image':return <span className="attachment" key={i}>Attachment: {t.text||t.href}</span>;
  case 'html':return <code key={i}>{t.text}</code>;
  case 'br':return <br key={i}/>;case'hr':return <hr key={i}/>;
  case 'table':return <div className="table-wrap" key={i}><table><thead><tr>{t.header.map((h:any,j:number)=><th key={j}>{render(h.tokens)}</th>)}</tr></thead><tbody>{t.rows.map((r:any,j:number)=><tr key={j}>{r.map((c:any,k:number)=><td key={k}>{render(c.tokens)}</td>)}</tr>)}</tbody></table></div>;
  default:return null;
 }})}
 return <div className="markdown">{render(marked.lexer(text))}</div>;
}
