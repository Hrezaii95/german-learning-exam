import {foodModels,foodModes,foodCompounds,type FoodMode} from "./food-sheet";

export type FoodSettings={food:number;mode:FoodMode;negative:boolean;speakerLikes:boolean;youLike:boolean;compound:number};
export type FoodSection="lab"|"replies"|"compounds"|"order";
export function foodBookmark(state:FoodSettings,section:FoodSection="lab"){
 return `#food-${section}-${state.food}-${state.mode}-${Number(state.negative)}-${Number(state.speakerLikes)}-${Number(state.youLike)}-${state.compound}`;
}
export function readFoodBookmark(hash:string):(FoodSettings&{section:FoodSection})|null{
 const match=hash.match(/^#food-(lab|replies|compounds|order)-(\d+)-(like|enjoy|wish|take)-(0|1)-(0|1)-(0|1)-(\d+)$/);
 if(!match)return null;
 const food=Number(match[2]),compound=Number(match[7]);
 if(!foodModels[food]||!foodCompounds[compound]||!foodModes.some(mode=>mode.id===match[3]))return null;
 return {section:match[1] as FoodSection,food,mode:match[3] as FoodMode,negative:match[4]==="1",speakerLikes:match[5]==="1",youLike:match[6]==="1",compound};
}
export const foodMenuGroups=[
 {label:"All food",items:foodModels.map((_,index)=>index)},
 {label:"Meals & sides",items:[0,1,4,9,11]},
 {label:"Bread, eggs & cheese",items:[7,8,10]},
 {label:"Fruit & vegetables",items:[5]},
 {label:"Sweets",items:[2,6]},
 {label:"Drinks",items:[3]},
];
export function foodPortionCue(index:number){
 const food=foodModels[index]!;
 if(food.order.startsWith("ein Stück"))return {head:"das Stück",tone:"neuter",cue:`Stück chooses ein: ${food.de} keeps its own gender, but the order names a piece.`};
 if(food.order.startsWith("eine Portion"))return {head:"die Portion",tone:"female",cue:`Portion chooses eine: ${food.de} keeps its own gender, but the order names a portion.`};
 return {head:food.de,tone:food.orderTone,cue:food.tone==="male"?"The masculine object changes der → einen in this order.":`The object keeps its gender: ${food.de} → ${food.order}.`};
}
export function foodOrderChoices(index:number){
 const item=foodModels[index]!;
 const options=["einen","eine","ein"].map(article=>`Ich möchte ${item.order.replace(/^(einen|eine|ein) /,`${article} `)}.`);
 return [...options.slice(index%3),...options.slice(0,index%3)];
}
