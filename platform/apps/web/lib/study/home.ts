export type HomeTone = "male" | "female" | "neuter" | "plural";
export type HomeWord = { id: string; de: string; en: string; plural: string | null; tone: HomeTone; area: "Furniture" | "Objects" | "Home & places"; image: boolean; book: string[]; cue: string };
export const homeWords: HomeWord[] = [
  {id:"haus",de:"das Haus",en:"house",plural:"die Häuser",tone:"neuter",area:"Home & places",image:true,book:[],cue:"Haus is the building. Zuhause is the place you call home. Haus → Häuser: add an umlaut and -er."},
  {id:"zimmer",de:"das Zimmer",en:"room",plural:"die Zimmer",tone:"neuter",area:"Home & places",image:true,book:["L4 · KB 32"],cue:"One room, several rooms: Zimmer stays the same. The article tells you singular or plural."},
  {id:"tisch",de:"der Tisch",en:"table",plural:"die Tische",tone:"male",area:"Furniture",image:true,book:["L4 · KB 31"],cue:"Say Tisch → Tische as a pair. Der Tisch becomes er when you describe it."},
  {id:"stuhl",de:"der Stuhl",en:"chair",plural:"die Stühle",tone:"male",area:"Furniture",image:true,book:["L4 · KB 30"],cue:"Give the chair two umlaut dots: Stuhl → Stühle. Hear the change from u to ü."},
  {id:"bett",de:"das Bett",en:"bed",plural:"die Betten",tone:"neuter",area:"Furniture",image:true,book:["L4 · KB 30"],cue:"Bett → Betten. Keep the double t, then add -en."},
  {id:"schrank",de:"der Schrank",en:"wardrobe / cupboard",plural:"die Schränke",tone:"male",area:"Furniture",image:true,book:["L4 · KB 31"],cue:"Schrank → Schränke: an umlaut plus -e, like Stuhl → Stühle."},
  {id:"lampe",de:"die Lampe",en:"lamp",plural:"die Lampen",tone:"female",area:"Furniture",image:true,book:["L4 · KB 30"],cue:"Lampe already ends in -e. Add just -n for Lampen. Die Lampe → sie."},
  {id:"sofa",de:"das Sofa",en:"sofa",plural:"die Sofas",tone:"neuter",area:"Furniture",image:true,book:["L4 · KB 31"],cue:"Sofa → Sofas. A short -s plural, like Radios."},
  {id:"teppich",de:"der Teppich",en:"carpet / rug",plural:"die Teppiche",tone:"male",area:"Furniture",image:true,book:["L4 · KB 31"],cue:"Teppich → Teppiche. Keep the noun blue even though its plural article is die."},
  {id:"fernseher",de:"der Fernseher",en:"television / TV set",plural:"die Fernseher",tone:"male",area:"Objects",image:true,book:[],cue:"The device is der Fernseher. Its plural has the same spelling."},
  {id:"fenster",de:"das Fenster",en:"window",plural:"die Fenster",tone:"neuter",area:"Home & places",image:true,book:[],cue:"Fenster stays Fenster in the plural. Learn das Fenster and die Fenster together."},
  {id:"tuer",de:"die Tür",en:"door",plural:"die Türen",tone:"female",area:"Home & places",image:true,book:[],cue:"Tür already has ü. Keep it and add -en: Türen."},
  {id:"spiegel",de:"der Spiegel",en:"mirror",plural:"die Spiegel",tone:"male",area:"Objects",image:true,book:["L4 · KB 30"],cue:"Your reflection looks the same: Spiegel also looks the same in singular and plural."},
  {id:"kissen",de:"das Kissen",en:"cushion / pillow",plural:"die Kissen",tone:"neuter",area:"Objects",image:true,book:[],cue:"Kissen already ends in -en, but das Kissen is singular. The plural noun stays unchanged."},
  {id:"decke",de:"die Decke",en:"blanket; also ceiling",plural:"die Decken",tone:"female",area:"Objects",image:true,book:[],cue:"The picture shows a blanket. Decke can also mean the ceiling; context tells you which."},
  {id:"uhr",de:"die Uhr",en:"clock / watch",plural:"die Uhren",tone:"female",area:"Objects",image:true,book:[],cue:"One word covers both a wall clock and a watch. Uhr → Uhren."},
  {id:"computer",de:"der Computer",en:"computer",plural:"die Computer",tone:"male",area:"Objects",image:true,book:[],cue:"Computer has no extra ending in the plural: die Computer."},
  {id:"regal",de:"das Regal",en:"shelf / shelving unit",plural:"die Regale",tone:"neuter",area:"Furniture",image:true,book:["L4 · KB 31"],cue:"Regal → Regale. A Regal is the shelving unit, not the books on it."},
  {id:"pflanze",de:"die Pflanze",en:"plant",plural:"die Pflanzen",tone:"female",area:"Objects",image:true,book:[],cue:"Pflanze → Pflanzen: an -e noun with just -n added."},
  {id:"radio",de:"das Radio",en:"radio",plural:"die Radios",tone:"neuter",area:"Objects",image:true,book:[],cue:"Radio → Radios. Keep its green das color in the singular."},
  {id:"zuhause",de:"das Zuhause",en:"home",plural:null,tone:"neuter",area:"Home & places",image:true,book:[],cue:"The noun is das Zuhause. The book's phrase zu Hause means at home. Noun: capital Z; phrase: lower-case zu."},
  {id:"bild",de:"das Bild",en:"picture",plural:"die Bilder",tone:"neuter",area:"Objects",image:false,book:["L4 · KB 29–30"],cue:"Bild → Bilder: add -er, with no umlaut. Learn the lesson title: Das Bild ist so schön."},
  {id:"sessel",de:"der Sessel",en:"armchair",plural:"die Sessel",tone:"male",area:"Furniture",image:false,book:["L4 · KB 30"],cue:"A Sessel has armrests. A Stuhl is a chair. Sessel stays unchanged in the plural."},
  {id:"moebel",de:"die Möbel",en:"furniture",plural:null,tone:"plural",area:"Furniture",image:false,book:["L4 · KB 29; AB 26"],cue:"Möbel is plural in German: Die Möbel sind modern. Do not say das Möbel or die Möbels for furniture."},
  {id:"geschaeft",de:"das Geschäft",en:"shop / store",plural:"die Geschäfte",tone:"neuter",area:"Home & places",image:false,book:["L4 · glossary 5"],cue:"Geschäft already has ä. Keep it in Geschäfte. Im Geschäft means in the shop."},
  {id:"moebelgeschaeft",de:"das Möbelgeschäft",en:"furniture shop",plural:"die Möbelgeschäfte",tone:"neuter",area:"Home & places",image:false,book:["L4 · KB 29; AB 29"],cue:"The last part decides: das Geschäft → das Möbelgeschäft. Möbel is plural on its own; the whole shop word is singular."},
  {id:"hotel",de:"das Hotel",en:"hotel",plural:"die Hotels",tone:"neuter",area:"Home & places",image:false,book:["L4 · glossary 6"],cue:"Hotel → Hotels. In a hotel you can describe a Zimmer."},
  {id:"hotelzimmer",de:"das Hotelzimmer",en:"hotel room",plural:"die Hotelzimmer",tone:"neuter",area:"Home & places",image:false,book:["L4 · KB 32"],cue:"The last part decides again: das Zimmer → das Hotelzimmer. Its plural spelling stays the same."},
  {id:"wohnort",de:"der Wohnort",en:"place of residence",plural:"die Wohnorte",tone:"male",area:"Home & places",image:false,book:["L2 · KB 18; L3 · AB 17"],cue:"Wohnort answers Wo wohnst du? It is your town or place of residence, not a piece of furniture."},
  {id:"buch",de:"das Buch",en:"book",plural:"die Bücher",tone:"neuter",area:"Objects",image:false,book:["L4 · KB 30, instruction"],cue:"Buch → Bücher: u changes to ü and -er is added. The book tells you: Schließen Sie das Buch."},
];
export const homePronouns = {male:"er",female:"sie",neuter:"es",plural:"sie"} as const;
export const homeLabels = {male:"Masculine · der",female:"Feminine · die",neuter:"Neuter · das",plural:"Plural · die"} as const;
export const homeAdjectives = [
  {de:"schön",en:"beautiful",opposite:"hässlich",oppositeEn:"ugly",cue:"Appearance",symbol:"✦ / ✕"},
  {de:"groß",en:"big",opposite:"klein",oppositeEn:"small",cue:"Size",symbol:"◯ / ·"},
  {de:"teuer",en:"expensive",opposite:"günstig",oppositeEn:"inexpensive / good value",cue:"Price",symbol:"€€€ / €"},
  {de:"alt",en:"old",opposite:"neu",oppositeEn:"new",cue:"Age · AB 28",symbol:"↶ / ✨"},
  {de:"modern",en:"modern",opposite:null,oppositeEn:null,cue:"Style",symbol:"◇"},
  {de:"praktisch",en:"practical / handy",opposite:null,oppositeEn:null,cue:"Usefulness",symbol:"✓"},
];
export const homePhrases = [
  {de:"Ich bin zu Hause.",en:"I am at home.",cue:"zu Hause = at home · L4 KB 29"},
  {de:"Ich wohne in Berlin.",en:"I live in Berlin.",cue:"wohnen = to live / reside · L2"},
  {de:"Wo wohnst du?",en:"Where do you live?",cue:"Ask about someone's home town · L2–3"},
  {de:"Das Bild ist so schön.",en:"The picture is so beautiful.",cue:"so = so / really · L4"},
  {de:"Der Schrank ist zu klein.",en:"The wardrobe is too small.",cue:"zu + adjective = too · L4"},
  {de:"Wie viel kostet der Stuhl?",en:"How much does the chair cost?",cue:"One object → kostet · L4"},
  {de:"Er kostet 59 Euro.",en:"It costs 59 euros.",cue:"der Stuhl → er · L4"},
  {de:"Das ist ein Sonderangebot.",en:"That is a special offer.",cue:"das Sonderangebot · L4"},
  {de:"Das finde ich auch.",en:"I think so too.",cue:"Agree with an opinion · L4"},
  {de:"Das finde ich nicht.",en:"I don't think so.",cue:"Disagree with an opinion · L4"},
];
export function homeExample(word: HomeWord) { return `${word.de[0]!.toUpperCase()}${word.de.slice(1)} ${word.tone==="plural"?"sind":"ist"} schön.`; }
export function homePronounExample(word: HomeWord) {const pronoun=homePronouns[word.tone];return `${pronoun[0]!.toUpperCase()}${pronoun.slice(1)} ${word.tone==="plural"?"sind":"ist"} schön.`;}
export const homeSpeechTexts = [...new Set([...homeWords.flatMap(w=>[w.de,...(w.plural?[w.plural]:[]),homeExample(w),homePronounExample(w)]),...homeAdjectives.flatMap(a=>[a.de,...(a.opposite?[a.opposite]:[])]),...homePhrases.map(p=>p.de)])];
