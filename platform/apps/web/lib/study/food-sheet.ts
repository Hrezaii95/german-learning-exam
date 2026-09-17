export const foodModels=[
 {de:'der Hamburger',en:'hamburgers',general:'Hamburger',negative:'keine Hamburger',order:'einen Hamburger',noOrder:'keinen Hamburger',orderEn:'a hamburger',tone:'male',orderTone:'male',verb:'esse',icon:'🍔'},
 {de:'der Salat',en:'salad',general:'Salat',negative:'keinen Salat',order:'einen Salat',noOrder:'keinen Salat',orderEn:'a salad',tone:'male',orderTone:'male',verb:'esse',icon:'🥗'},
 {de:'der Kuchen',en:'cake',general:'Kuchen',negative:'keinen Kuchen',order:'einen Kuchen',noOrder:'keinen Kuchen',orderEn:'a cake',tone:'male',orderTone:'male',verb:'esse',icon:'🍰'},
 {de:'der Tee',en:'tea',general:'Tee',negative:'keinen Tee',order:'einen Tee',noOrder:'keinen Tee',orderEn:'a tea',tone:'male',orderTone:'male',verb:'trinke',icon:'🍵'},
 {de:'die Suppe',en:'soup',general:'Suppe',negative:'keine Suppe',order:'eine Suppe',noOrder:'keine Suppe',orderEn:'a soup',tone:'female',orderTone:'female',verb:'esse',icon:'🥣'},
 {de:'die Tomate',en:'tomatoes',general:'Tomaten',negative:'keine Tomaten',order:'eine Tomate',noOrder:'keine Tomate',orderEn:'a tomato',tone:'female',orderTone:'female',verb:'esse',icon:'🍅'},
 {de:'die Schokolade',en:'chocolate',general:'Schokolade',negative:'keine Schokolade',order:'ein Stück Schokolade',noOrder:'kein Stück Schokolade',orderEn:'a piece of chocolate',tone:'female',orderTone:'neuter',verb:'esse',icon:'🍫'},
 {de:'das Brötchen',en:'bread rolls',general:'Brötchen',negative:'keine Brötchen',order:'ein Brötchen',noOrder:'kein Brötchen',orderEn:'a bread roll',tone:'neuter',orderTone:'neuter',verb:'esse',icon:'🥖'},
 {de:'das Ei',en:'eggs',general:'Eier',negative:'keine Eier',order:'ein Ei',noOrder:'kein Ei',orderEn:'an egg',tone:'neuter',orderTone:'neuter',verb:'esse',icon:'🥚'},
 {de:'das Fleisch',en:'meat',general:'Fleisch',negative:'kein Fleisch',order:'eine Portion Fleisch',noOrder:'keine Portion Fleisch',orderEn:'a portion of meat',tone:'neuter',orderTone:'female',verb:'esse',icon:'🍖'},
 {de:'der Käse',en:'cheese',general:'Käse',negative:'keinen Käse',order:'ein Stück Käse',noOrder:'kein Stück Käse',orderEn:'a piece of cheese',tone:'male',orderTone:'neuter',verb:'esse',icon:'🧀'},
 {de:'die Pommes frites',en:'fries',general:'Pommes frites',negative:'keine Pommes frites',order:'eine Portion Pommes',noOrder:'keine Portion Pommes',orderEn:'a portion of fries',tone:'plural',orderTone:'female',verb:'esse',icon:'🍟'},
] as const;
export type FoodMode='like'|'enjoy'|'wish'|'take';
export const foodModes=[{id:'like',label:'I like · mögen'},{id:'enjoy',label:'I enjoy eating / drinking'},{id:'wish',label:'I would like · möchte'},{id:'take',label:'I will have · nehmen'}] as const;
export function foodSentence(food:number,mode:FoodMode,negative:boolean){const f=foodModels[food]!;return mode==='like'?`Ich mag ${negative?f.negative:f.general}.`:mode==='enjoy'?`Ich ${f.verb} ${negative?'nicht gern':'gern'} ${f.general}.`:`Ich ${mode==='wish'?'möchte':'nehme'} ${negative?f.noOrder:f.order}.`;}
export function foodMeaning(food:number,mode:FoodMode,negative:boolean){const f=foodModels[food]!;return mode==='like'?`I ${negative?'do not like':'like'} ${f.en}.`:mode==='enjoy'?`I ${negative?'do not enjoy':'enjoy'} ${f.verb==='trinke'?'drinking':'eating'} ${f.en}.`:`I ${mode==='wish'?(negative?'would not like':'would like'):(negative?'will not have':'will have')} ${f.orderEn}.`;}
// Reuse the stable phrase-deck IDs where a practice sentence is already taught there.
const foodPhraseIds:Record<string,string>={'Ich mag Hamburger.':'l9-phrase-0','Ich mag keinen Käse.':'l9-phrase-1','Ich trinke gern Tee.':'l9-phrase-3','Ich möchte einen Salat.':'l9-phrase-14'};
export function foodSaveId(food:number,mode:FoodMode,negative:boolean){return foodPhraseIds[foodSentence(food,mode,negative)]??`l9-food-${food}-${mode}-${negative}`;}
export function foodReply(speakerLikes:boolean,youLike:boolean){return speakerLikes?(youLike?'Ich auch.':'Ich nicht.'):(youLike?'Ich schon.':'Ich auch nicht.');}
export const foodCompounds=[
 {left:'die Nuss',right:'der Kuchen',result:'der Nusskuchen',en:'nut cake',tone:'male',cue:'Kuchen is masculine, so Nusskuchen is masculine.'},
 {left:'der Apfel',right:'der Saft',result:'der Apfelsaft',en:'apple juice',tone:'male',cue:'Saft is masculine. The first noun describes which juice.'},
 {left:'die Schokolade',right:'der Kuchen',result:'der Schokoladenkuchen',en:'chocolate cake',tone:'male',cue:'Learn the linking n: Schokolade → Schokoladen-.'},
 {left:'die Tomate',right:'die Suppe',result:'die Tomatensuppe',en:'tomato soup',tone:'female',cue:'Suppe is feminine. Tomate takes the joining form Tomaten-.'},
 {left:'der Schinken',right:'das Brötchen',result:'das Schinkenbrötchen',en:'ham roll',tone:'neuter',cue:'Brötchen is neuter. Its article wins.'},
 {left:'die Orange',right:'der Saft',result:'der Orangensaft',en:'orange juice',tone:'male',cue:'Learn the joining form Orangen-. The last noun is Saft.'},
 {left:'der Käse',right:'der Kuchen',result:'der Käsekuchen',en:'cheesecake',tone:'male',cue:'Käsekuchen is a kind of Kuchen.'},
 {left:'der Schinken',right:'das Brot',result:'das Schinkenbrot',en:'ham sandwich',tone:'neuter',cue:'Brot is neuter; the compound stays neuter.'},
] as const;
export const foodSpeech=[...foodModels.flatMap((f,i)=>[...foodModes.flatMap(m=>[false,true].map(n=>foodSentence(i,m.id,n))),f.de]),...foodCompounds.flatMap(c=>[c.left,c.right,c.result]),'Ich auch.','Ich nicht.','Ich schon.','Ich auch nicht.','Ich mag Tee.','Ich mag keinen Tee.'];
