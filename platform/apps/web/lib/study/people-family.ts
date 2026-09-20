export type FamilyView="anna"|"martin";
export type FamilyRelation={de:string;en:string;plural:string;tone:"male"|"female"};
const relative=(de:string,en:string,plural:string):FamilyRelation=>({de,en,plural,tone:de.startsWith("der ")?"male":"female"});
const r={
  father:relative("der Vater","father","die Väter"),mother:relative("die Mutter","mother","die Mütter"),
  grandfather:relative("der Großvater","grandfather","die Großväter"),grandmother:relative("die Großmutter","grandmother","die Großmütter"),
  brother:relative("der Bruder","brother","die Brüder"),sister:relative("die Schwester","sister","die Schwestern"),
  aunt:relative("die Tante","aunt","die Tanten"),uncle:relative("der Onkel","uncle","die Onkel"),
  daughter:relative("die Tochter","daughter","die Töchter"),son:relative("der Sohn","son","die Söhne"),
  granddaughter:relative("die Enkelin","granddaughter","die Enkelinnen"),grandson:relative("der Enkel","grandson","die Enkel"),
  partner:relative("die Partnerin","partner","die Partnerinnen"),
};
export const familyPeople=[
  {id:"karl",name:"Karl",x:320,y:15,relations:{anna:r.grandfather,martin:r.father}},
  {id:"eva",name:"Eva",x:490,y:15,relations:{anna:r.grandmother,martin:r.mother}},
  {id:"julia",name:"Julia",x:115,y:170,relations:{anna:r.aunt,martin:r.sister}},
  {id:"martin",name:"Martin",x:320,y:170,relations:{anna:r.father,martin:null}},
  {id:"nora",name:"Nora",x:490,y:170,relations:{anna:r.mother,martin:r.partner}},
  {id:"david",name:"David",x:720,y:170,relations:{anna:r.uncle,martin:r.brother}},
  {id:"anna",name:"Anna",x:320,y:325,relations:{anna:null,martin:r.daughter}},
  {id:"ben",name:"Ben",x:570,y:325,relations:{anna:r.brother,martin:r.son}},
  {id:"mia",name:"Mia",x:220,y:480,relations:{anna:r.daughter,martin:r.granddaughter}},
  {id:"noah",name:"Noah",x:420,y:480,relations:{anna:r.son,martin:r.grandson}},
] as const;
export type FamilyPerson=typeof familyPeople[number];
export function familyStatement(person:FamilyPerson,view:FamilyView){
  const relation=person.relations[view];
  return relation?`${person.name} ist ${relation.tone==="female"?"meine":"mein"} ${relation.de.replace(/^(der|die) /,"")}.`:`Ich bin ${person.name}.`;
}
export function familyMeaning(person:FamilyPerson,view:FamilyView){
  const relation=person.relations[view];
  return relation?`${person.name} is my ${relation.en}.`:`I am ${person.name}.`;
}
export const familyConnections=[
  {parents:["karl","eva"],children:["julia","martin","david"],text:"Karl and Eva are the parents of Julia, Martin and David."},
  {parents:["martin","nora"],children:["anna","ben"],text:"Martin and Nora are the parents of Anna and Ben."},
  {parents:["anna"],children:["mia","noah"],text:"Anna is the mother of Mia and Noah."},
];
export const familySpeechTexts=[...new Set(familyPeople.flatMap(person=>(["anna","martin"] as const).flatMap(view=>{
  const relation=person.relations[view];return [familyStatement(person,view),...(relation?[relation.de,relation.plural]:[])];
})))];
