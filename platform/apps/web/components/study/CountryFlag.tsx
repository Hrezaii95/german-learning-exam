import {withPagesBaseAssetPath} from "@/lib/content/pages-base-path";
export function CountryFlag({id,label}:{id:string;label:string}) {
  return <img className="country-flag" src={withPagesBaseAssetPath(`/flags/${id.toLowerCase()}.svg`)} width="32" height="24" alt={id==="GB"?"Union flag (United Kingdom)":`${label} flag`} loading="lazy"/>;
}
