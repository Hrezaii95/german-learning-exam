"""Project Lesson 10 glossary and exercises; examples and explanations are study aids."""
import csv
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
words=[]
with (ROOT/'research/lesson-expansion/lesson-10-vocabulary.tsv').open(encoding='utf8',newline='') as f:
    for row in csv.DictReader(f,delimiter='\t'):
        slug=re.sub(r'^(der|die|das) ','',row['de']).lower()
        for a,b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:slug=slug.replace(a,b)
        words.append({**row,'id':'l10-'+re.sub('[^a-z0-9]+','-',slug).strip('-')})
next(w for w in words if w['de']=='das Taxi')['pluralVariants']=['die Taxis']
concepts=[
 {'id':'l10-bracket','title':'A separable verb makes a sentence bracket','de':'Ich komme um acht Uhr an.','en':'In an ordinary main clause, conjugate the verb stem in position 2. Put the separable prefix at the end. Ankommen becomes komme … an. Count sentence parts: um acht Uhr can be one first-position time phrase.','examples':['Ich komme um acht Uhr an.','Um acht Uhr komme ich an.','Natürlich hole ich dich ab.'],'source':'KB66-67; AB67'},
 {'id':'l10-questions','title':'Two question patterns, the same final prefix','de':'Wann kommst du an? / Kommst du um acht Uhr an?','en':'A W-question starts with the question word, then the conjugated stem. A yes/no question starts with the conjugated stem itself. In both, the separable prefix remains at the end.','examples':['Wann fliegst du ab?','Rufst du mich noch mal an?','Wo steigt ihr um?'],'source':'KB66-67; AB67-68'},
 {'id':'l10-modal','title':'With können, keep the infinitive together','de':'Kannst du mich abholen?','en':'Können supplies the conjugated verb. The other verb stays together as an infinitive at the end: abholen, not holen … ab. Compare Du holst mich ab with Du kannst mich abholen.','examples':['Du holst mich ab.','Du kannst mich abholen.','Kannst du mich anrufen?'],'source':'KB66-67; AB67-68'},
 {'id':'l10-prefixes','title':'One stem, several journeys','de':'einsteigen → umsteigen → aussteigen','en':'Einsteigen means get on or in. Umsteigen means change trains or buses. Aussteigen means get off or out. Abfahren is departing; einfahren is pulling into a station; ankommen is arriving. Abfliegen specifically means departing by plane.','examples':['Ich steige in die U-Bahn ein.','Wir steigen in Hamburg um.','Ich steige am Hauptbahnhof aus.'],'source':'KB67-68; AB68'},
 {'id':'l10-stress','title':'Stress the separable prefix','de':'ABfliegen · ANkommen · ABholen · ANrufen','en':'The stressed prefix helps you hear a separable verb as a whole word. When you use it in a sentence, remember that the final prefix still belongs to the earlier verb. Listen to the workbook pronunciation recording for the four source pairs.','examples':['fliegen – abfliegen','kommen – ankommen','holen – abholen','rufen – anrufen'],'source':'AB67 Exercise7'},
 {'id':'l10-irregular','title':'A separated prefix does not remove a vowel change','de':'du fährst ab · er sieht fern','en':'Abfahren and einfahren use the present-tense forms of fahren: du fährst, er fährt. Fernsehen follows sehen: du siehst, er sieht. Wir and Sie use fahren / sehen before the final prefix.','examples':['Wann fährt der Zug ab?','Siehst du heute fern?','Ihr seht am Abend fern.'],'source':'KB67 partner pages167/195; AB68'},
 {'id':'l10-announcements','title':'Listen for destination, time and boarding place','de':'nach Salzburg · von Bahnsteig drei · an Gleis zwei','en':'Nach names the destination city. Bahnsteig is the platform where passengers wait; Gleis is the track, often the number used for boarding. Learn the exact source chunks: von Bahnsteig 3, von Gleis 4, auf Gleis 7, an Gleis 2. An airport Ausgang may mean the boarding gate in an announcement.','examples':['Der Zug fährt von Bahnsteig drei ab.','Die U-Bahn fährt an Gleis zwei ein.','Das Flugzeug steht am Ausgang B48.'],'source':'KB68; AB69'},
 {'id':'l10-reactions','title':'Keep travel messages short and clear','de':'Hoffentlich … / Verstehe. / Alles klar! / Bis gleich!','en':'Hoffentlich expresses a hope. Verstehe acknowledges that you understand. Alles klar confirms that things are clear. Bis gleich says you expect to see the other person very soon. Mich and dich name the person receiving the action: Holst du mich ab? Ich hole dich ab.','examples':['Hoffentlich haben wir keine Verspätung.','Mein Handy hat nur noch wenig Akku.','Verstehe. Bis gleich!'],'source':'KB66; AB69'},
]
verbs=[
 ('ankommen','to arrive',['komme an','kommst an','kommt an','kommen an','kommt an','kommen an'],'The prefix an goes to the end.'),
 ('abfliegen','to depart by plane',['fliege ab','fliegst ab','fliegt ab','fliegen ab','fliegt ab','fliegen ab'],'Conjugate fliegen and place ab at the end.'),
 ('abholen','to pick up',['hole ab','holst ab','holt ab','holen ab','holt ab','holen ab'],'Ich hole dich ab; with können: Ich kann dich abholen.'),
 ('anrufen','to call by phone',['rufe an','rufst an','ruft an','rufen an','ruft an','rufen an'],'Rufst du mich an? The prefix is still last in a question.'),
 ('einsteigen','to get on / in',['steige ein','steigst ein','steigt ein','steigen ein','steigt ein','steigen ein'],'Ich steige in die U-Bahn ein.'),
 ('umsteigen','to change trains or buses',['steige um','steigst um','steigt um','steigen um','steigt um','steigen um'],'Wir steigen in Hamburg um.'),
 ('aussteigen','to get off / out',['steige aus','steigst aus','steigt aus','steigen aus','steigt aus','steigen aus'],'Ich steige am Hauptbahnhof aus.'),
 ('einkaufen','to shop / buy groceries',['kaufe ein','kaufst ein','kauft ein','kaufen ein','kauft ein','kaufen ein'],'Ich kaufe Brot ein.'),
 ('abfahren','to depart',['fahre ab','fährst ab','fährt ab','fahren ab','fahrt ab','fahren ab'],'Du and er/sie/es change a to ä: fährst, fährt.'),
 ('einfahren','to pull in',['fahre ein','fährst ein','fährt ein','fahren ein','fahrt ein','fahren ein'],'Same vowel change as fahren. A train fährt ein.'),
 ('fernsehen','to watch television',['sehe fern','siehst fern','sieht fern','sehen fern','seht fern','sehen fern'],'Du siehst and er/sie/es sieht change e to ie.'),
 ('starten','to start / take off',['starte','startest','startet','starten','startet','starten'],'Extra e makes du startest and er startet easier to say.'),
 ('landen','to land',['lande','landest','landet','landen','landet','landen'],'Extra e after d: du landest, ihr landet.'),
 ('versuchen','to try',['versuche','versuchst','versucht','versuchen','versucht','versuchen'],'Ver- stays attached. Ich versuche es.'),
 ('verstehen','to understand',['verstehe','verstehst','versteht','verstehen','versteht','verstehen'],'Ver- is not separated: Ich verstehe.'),
 ('beginnen','to begin',['beginne','beginnst','beginnt','beginnen','beginnt','beginnen'],'Be- stays attached. Do not separate every verb beginning.'),
 ('enden','to end',['ende','endest','endet','enden','endet','enden'],'Die Fahrt endet hier.'),
 ('stehen','to stand / be situated',['stehe','stehst','steht','stehen','steht','stehen'],'The plane stands at the gate: Das Flugzeug steht am Ausgang.'),
 ('chatten','to chat online',['chatte','chattest','chattet','chatten','chattet','chatten'],'Keep both t letters and add an e where needed.'),
 ('sich freuen','to be happy / look forward',['freue mich','freust dich','freut sich','freuen uns','freut euch','freuen sich'],'Learn the whole source phrase: Ich freue mich auf dich.'),
 ('fahren','to go by vehicle',['fahre','fährst','fährt','fahren','fahrt','fahren'],'Base verb for abfahren and einfahren.'),
 ('fliegen','to fly',['fliege','fliegst','fliegt','fliegen','fliegt','fliegen'],'Present-tense forms are regular; abfliegen separates ab.'),
 ('informieren','to inform',['informiere','informierst','informiert','informieren','informiert','informieren'],'Informierst du die Kollegen?'),
 ('bestellen','to order',['bestelle','bestellst','bestellt','bestellen','bestellt','bestellen'],'Be- stays attached: Ich bestelle einen Kaffee.'),
 ('besuchen','to visit',['besuche','besuchst','besucht','besuchen','besucht','besuchen'],'Be- stays attached: Ich besuche meine Freundin.'),
]
phrases=[
 ('Wann kommst du an?','When do you arrive?'),('Ich komme um acht Uhr an.','I arrive at eight.'),('Wann fliegst du denn ab?','So when do you depart?'),('Ich nehme jetzt doch den Abendflug.','I am taking the evening flight after all.'),
 ('Hoffentlich haben wir keine Verspätung.','Hopefully we will not be delayed.'),('So früh? Bist du sicher?','So early? Are you sure?'),('Ich versuche es.','I will try.'),('Rufst du mich noch mal an?','Will you call me again?'),
 ('Mein Handy hat nur noch wenig Akku.','My phone has very little battery left.'),('Kannst du mich abholen?','Can you pick me up?'),('Natürlich hole ich dich ab.','Of course I will pick you up.'),('Ich freue mich auf dich.','I am looking forward to seeing you.'),
 ('Verstehe.','I understand.'),('Alles klar!','All right!'),('Bis gleich!','See you in a moment!'),('Wo steigst du um?','Where do you change trains or buses?'),('Wir steigen in Hamburg um.','We change trains in Hamburg.'),
 ('Wo fährt der Zug nach Stuttgart ab?','Where does the train to Stuttgart depart from?'),('Von Gleis vier.','From track four.'),('Bitte Vorsicht!','Please be careful!'),
]
quiz=[
 ('Ich ___ um acht Uhr ___.',['komme … an','ankomme … —','an … komme'],'komme … an','Conjugate komme in position 2; put an at the end.'),
 ('A W-question about arrival',['Wann kommst du an?','Wann du kommst an?','Wann ankommst du?'],'Wann kommst du an?','Question word, conjugated stem, subject, final prefix.'),
 ('Standard yes/no question: verb first',['Holst du mich ab?','Du holst mich ab?','Abholst du mich?'],'Holst du mich ab?','The conjugated stem starts an ordinary yes/no question.'),
 ('Kannst du mich ___?',['abholen','holen ab','abholst'],'abholen','After können, keep the infinitive together at the end.'),
 ('Der Zug ___ um zwölf Uhr ab.',['fährt','fahrt','fahre'],'fährt','Er/der Zug uses fährt with ä.'),
 ('Du ___ heute fern.',['siehst','sehst','seht'],'siehst','Fernsehen follows sehen: du siehst.'),
 ('Change trains or buses',['umsteigen','einsteigen','aussteigen'],'umsteigen','Einsteigen gets on; umsteigen changes; aussteigen gets off.'),
 ('Ich komme kurz vor sieben an.',['Shortly before seven','Shortly after seven','Exactly at seven'],'Shortly before seven','Vor means before; nach means after.'),
 ('Which prefix stays attached?',['ver- in verstehen','an- in anrufen','ab- in abholen'],'ver- in verstehen','Ver- in verstehen is not separated.'),
 ('The platform where passengers wait',['der Bahnsteig','das Gleis','der Ausgang'],'der Bahnsteig','Gleis is the track; Ausgang is an exit or airport gate.'),
]
unit={'number':10,'summary':'Plan a journey, understand announcements and put separable verbs in the right places. Practise arrival, departure, calls and pickups.','words':words,'concepts':concepts,'verbs':[{'verb':v,'meaning':m,'forms':f,'tip':t} for v,m,f,t in verbs],'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
(ROOT/'platform/apps/web/generated/lesson-ten-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':10,'words':len(words),'verbs':len(verbs),'concepts':len(concepts),'phrases':len(phrases),'quiz':len(quiz)}))
