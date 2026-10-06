"use client";
import {Children,createContext,createElement,cloneElement,isValidElement,useContext,type ReactNode,type ReactElement,type JSX} from 'react';
import {useLocale} from './LocaleProvider';
import {translate,type Locale} from '@/lib/i18n/catalog';
export type TextProtection='none'|'german'|'verbatim';
export const ProtectedText=createContext<TextProtection>('none');
type TextProps={children?:ReactNode;lang?:string|undefined;translate?:string|undefined;className?:string|undefined};
const translatedAttributes=['aria-label','aria-description','placeholder','title','alt'];
export function isProtectedText(props:TextProps):boolean{
 return /^de(?:-|$)/i.test(props.lang??'')||props.translate==='no'||/(?:^|\s)(?:no-translate|notranslate)(?:\s|$)/.test(props.className??'');
}
export function textProtection(props:TextProps,inherited:TextProtection='none'):TextProtection{
 if(inherited==='verbatim'||props.translate==='no'||/(?:^|\s)(?:no-translate|notranslate)(?:\s|$)/.test(props.className??''))return 'verbatim';
 return inherited==='german'||/^de(?:-|$)/i.test(props.lang??'')?'german':'none';
}
function localizedAttributes(props:Record<string,unknown>,locale:Locale):Record<string,string>{
 const output:Record<string,string>={};
 for(const attribute of translatedAttributes)if(typeof props[attribute]==='string')output[attribute]=translate(props[attribute] as string,locale);
 return output;
}
export function localizeChildren(children:ReactNode,locale:Locale):ReactNode{
 if(typeof children==='string')return translate(children,locale);
 if(Array.isArray(children)){
  // JSX splits counts into separate text/number nodes. Translate a contiguous
  // run together so "Activity {current} of {total}" can keep local word order.
  const output:ReactNode[]=[];let parts:(string|number)[]=[];
  const flush=()=>{
   if(!parts.length)return;
   const text=parts.join('');const translated=translate(text,locale);
   // A sentence may also surround a dynamic German example. If there is no
   // whole-message template, translate its known static fragments as before.
   output.push(translated!==text?translated:parts.map(part=>typeof part==='string'?translate(part,locale):part).join(''));
   parts=[];
  };
  for(const child of Children.toArray(children)){
   if(typeof child==='string'||typeof child==='number')parts.push(child);
   else{flush();output.push(localizeChildren(child,locale));}
  }
  flush();return Children.toArray(output);
 }
 if(isValidElement(children)){
  const element=children as ReactElement<TextProps&Record<string,unknown>>;
  // A raw <span lang="de"> may contain localized components. Carry its
  // protection through context instead of only skipping the raw children.
  if(isProtectedText(element.props)||element.type==='code'||element.type==='pre'){
   const protection=element.type==='code'||element.type==='pre'?'verbatim':textProtection(element.props);
   const control=element.type==='input'||element.type==='textarea';
   const content=protection==='german'&&control?cloneElement(element,localizedAttributes(element.props,locale)):element;
   return <ProtectedText.Provider key={element.key??undefined} value={protection}>{content}</ProtectedText.Provider>;
  }
  // Component props may also be option values or grading inputs. Let each
  // localized component translate at its own render boundary.
  if(typeof element.type==='string'||typeof element.type==='symbol'){
   const translated=typeof element.type==='string'?localizedAttributes(element.props,locale):{};
   return element.props.children===undefined?cloneElement(element,translated):cloneElement(element,translated,localizeChildren(element.props.children,locale));
  }
 }
 return children;
}
function localized<K extends keyof JSX.IntrinsicElements>(tag:K){
 function LocalizedElement(props:JSX.IntrinsicElements[K]){
  const {locale}=useLocale();const inherited=useContext(ProtectedText);
  const input=props as Record<string,unknown> & TextProps;
  const protection=textProtection(input,inherited);const protect=protection!=='none';
  const output:Record<string,unknown>={...input};
  // lang="de" describes the answer's language. Controls still need localized
  // instructions, while explicit translate="no" protects the entire field.
  if(!protect||(protection==='german'&&['input','textarea'].includes(tag)))Object.assign(output,localizedAttributes(output,locale));
  if(!protect && !['input','textarea','code','pre'].includes(tag))output.children=localizeChildren(input.children,locale);
  // A translated option must keep the source value used by the application's filters.
  if(tag==='option'&&output.value===undefined){
   if(typeof input.children==='string')output.value=input.children;
   else if(Array.isArray(input.children)&&input.children.every(child=>typeof child==='string'||typeof child==='number'))output.value=input.children.join('');
  }
  const element=createElement(tag,output);
  return protection!==inherited?<ProtectedText.Provider value={protection}>{element}</ProtectedText.Provider>:element;
 }
 return LocalizedElement;
}
export const LA=localized("a");
export const LArticle=localized("article");
export const LAside=localized("aside");
export const LB=localized("b");
export const LButton=localized("button");
export const LCaption=localized("caption");
export const LDd=localized("dd");
export const LDetails=localized("details");
export const LDialog=localized("dialog");
export const LDiv=localized("div");
export const LDl=localized("dl");
export const LDt=localized("dt");
export const LFieldset=localized("fieldset");
export const LFigcaption=localized("figcaption");
export const LFigure=localized("figure");
export const LFooter=localized("footer");
export const LForm=localized("form");
export const LH1=localized("h1");
export const LH2=localized("h2");
export const LH3=localized("h3");
export const LH4=localized("h4");
export const LHeader=localized("header");
export const LI=localized("i");
export const LInput=localized("input");
export const LLabel=localized("label");
export const LLegend=localized("legend");
export const LLi=localized("li");
export const LMain=localized("main");
export const LNav=localized("nav");
export const LOl=localized("ol");
export const LOption=localized("option");
export const LP=localized("p");
export const LSection=localized("section");
export const LSelect=localized("select");
export const LSmall=localized("small");
export const LSpan=localized("span");
export const LStrong=localized("strong");
export const LSummary=localized("summary");
export const LTable=localized("table");
export const LTbody=localized("tbody");
export const LTd=localized("td");
export const LTextarea=localized("textarea");
export const LTh=localized("th");
export const LThead=localized("thead");
export const LTr=localized("tr");
export const LUl=localized("ul");
