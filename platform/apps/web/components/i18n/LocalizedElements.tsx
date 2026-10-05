"use client";
import {Children,createContext,createElement,cloneElement,isValidElement,useContext,type ReactNode,type ReactElement,type JSX} from 'react';
import {useLocale} from './LocaleProvider';
import {translate,type Locale} from '@/lib/i18n/catalog';
const ProtectedText=createContext(false);
export function localizeChildren(children:ReactNode,locale:Locale):ReactNode{
 if(typeof children==='string')return translate(children,locale);
 if(Array.isArray(children))return Children.map(children,child=>localizeChildren(child,locale));
 if(isValidElement(children)){
  const element=children as ReactElement<{children?:ReactNode;lang?:string;translate?:string}>;
  if(element.props.lang==='de'||element.props.translate==='no')return element;
  // Component props may also be option values or grading inputs. Let each
  // localized component translate at its own render boundary.
  if((typeof element.type==='string'||typeof element.type==='symbol') && element.props.children!==undefined)return cloneElement(element,{},localizeChildren(element.props.children,locale));
 }
 return children;
}
function localized<K extends keyof JSX.IntrinsicElements>(tag:K){
 function LocalizedElement(props:JSX.IntrinsicElements[K]){
  const {locale}=useLocale();const inherited=useContext(ProtectedText);
  const input=props as Record<string,unknown> & {children?:ReactNode;lang?:string;translate?:string};
  const protect=inherited||input.lang==='de'||input.translate==='no';
  const output:Record<string,unknown>={...input};
  for(const attribute of ['aria-label','aria-description','placeholder','title','alt'])if(typeof output[attribute]==='string')output[attribute]=translate(output[attribute] as string,locale);
  if(!protect && !['input','textarea','code','pre'].includes(tag))output.children=localizeChildren(input.children,locale);
  // A translated option must keep the source value used by the application's filters.
  if(tag==='option'&&output.value===undefined&&typeof input.children==='string')output.value=input.children;
  const element=createElement(tag,output);
  return protect!==inherited?<ProtectedText.Provider value={protect}>{element}</ProtectedText.Provider>:element;
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
