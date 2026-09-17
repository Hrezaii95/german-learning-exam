"""Lesson 11 source vocabulary with authored Perfekt practice and explanations."""
import csv
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
words=[]
with (ROOT/'research/lesson-expansion/lesson-11-vocabulary.tsv').open(encoding='utf8',newline='') as f:
    for row in csv.DictReader(f,delimiter='\t'):
        slug=re.sub(r'^(der|die|das) ','',row['de']).lower()
        for a,b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:slug=slug.replace(a,b)
        words.append({**row,'id':'l11-'+re.sub('[^a-z0-9]+','-',slug).strip('-')})
paradigms='''machen|mache,machst,macht,machen,macht,machen|gemacht|regular
arbeiten|arbeite,arbeitest,arbeitet,arbeiten,arbeitet,arbeiten|gearbeitet|regular
hören|höre,hörst,hört,hören,hört,hören|gehört|regular
kochen|koche,kochst,kocht,kochen,kocht,kochen|gekocht|regular
kaufen|kaufe,kaufst,kauft,kaufen,kauft,kaufen|gekauft|regular
spielen|spiele,spielst,spielt,spielen,spielt,spielen|gespielt|regular
schauen|schaue,schaust,schaut,schauen,schaut,schauen|geschaut|regular
frühstücken|frühstücke,frühstückst,frühstückt,frühstücken,frühstückt,frühstücken|gefrühstückt|regular
lernen|lerne,lernst,lernt,lernen,lernt,lernen|gelernt|regular
malen|male,malst,malt,malen,malt,malen|gemalt|regular
tanzen|tanze,tanzt,tanzt,tanzen,tanzt,tanzen|getanzt|regular
surfen|surfe,surfst,surft,surfen,surft,surfen|gesurft|regular
chatten|chatte,chattest,chattet,chatten,chattet,chatten|gechattet|regular
trinken|trinke,trinkst,trinkt,trinken,trinkt,trinken|getrunken|strong
lesen|lese,liest,liest,lesen,lest,lesen|gelesen|strong
schreiben|schreibe,schreibst,schreibt,schreiben,schreibt,schreiben|geschrieben|strong
essen|esse,isst,isst,essen,esst,essen|gegessen|strong
singen|singe,singst,singt,singen,singt,singen|gesungen|strong
schlafen|schlafe,schläfst,schläft,schlafen,schlaft,schlafen|geschlafen|strong
backen|backe,backst,backt,backen,backt,backen|gebacken|strong
treffen|treffe,triffst,trifft,treffen,trefft,treffen|getroffen|strong
waschen|wasche,wäschst,wäscht,waschen,wascht,waschen|gewaschen|strong
aufräumen|räume auf,räumst auf,räumt auf,räumen auf,räumt auf,räumen auf|aufgeräumt|separable
abwaschen|wasche ab,wäschst ab,wäscht ab,waschen ab,wascht ab,waschen ab|abgewaschen|separable
einladen|lade ein,lädst ein,lädt ein,laden ein,ladet ein,laden ein|eingeladen|separable
einkaufen|kaufe ein,kaufst ein,kauft ein,kaufen ein,kauft ein,kaufen ein|eingekauft|separable
fernsehen|sehe fern,siehst fern,sieht fern,sehen fern,seht fern,sehen fern|ferngesehen|separable
anrufen|rufe an,rufst an,ruft an,rufen an,ruft an,rufen an|angerufen|separable
abholen|hole ab,holst ab,holt ab,holen ab,holt ab,holen ab|abgeholt|separable
fotografieren|fotografiere,fotografierst,fotografiert,fotografieren,fotografiert,fotografieren|fotografiert|ieren
telefonieren|telefoniere,telefonierst,telefoniert,telefonieren,telefoniert,telefonieren|telefoniert|ieren'''
tips={'regular':'Usually ge- + stem + -t. Arbeiten and chatten need -et: gearbeitet, gechattet.','strong':'Learn the participle as a whole: strong verbs usually end in -en and may change their stem vowel.','separable':'Put ge inside the separable verb, after its prefix. The complete participle stays at the sentence end.','ieren':'Verbs ending in -ieren form their participle with -t and no ge-.'}
verbs=[]
for line in paradigms.splitlines():
    v,forms,participle,group=line.split('|')
    verbs.append({'verb':v,'meaning':next(w['en'] for w in words if w['de']==v),'forms':forms.split(','),'participle':participle,'auxiliary':'haben','pastGroup':group,'tip':f'Perfekt: hat {participle}. '+tips[group],'source':'KB69–72; AB70–73'})
verbs.append({'verb':'zurückkommen','meaning':'to come back','forms':['komme zurück','kommst zurück','kommt zurück','kommen zurück','kommt zurück','kommen zurück'],'tip':'Source question: Wann kommst du morgen zurück? This is present tense for a future plan. Its Perfekt uses sein, introduced in Lesson 12.','source':'KB71'})
concepts=[
 {'id':'l11-perfekt','title':'One past action, two verb parts','de':'Ich habe gestern gearbeitet.','en':'Perfekt is a common way to talk about completed actions in conversation. Conjugate haben for the person and place the past participle at the end. Yesterday is gestern.','examples':['Ich habe gestern gearbeitet.','Wir haben Kaffee getrunken.','Gestern habe ich Zeitung gelesen.'],'source':'KB69–70; AB70–72'},
 {'id':'l11-regular','title':'Regular participles: ge- … -t','de':'machen → gemacht · arbeiten → gearbeitet','en':'For many regular verbs, add ge- before the stem and -t after it. Some stems need -et: gearbeitet, gechattet. The participle does not change with the person.','examples':['Ich habe gelernt.','Du hast gelernt.','Wir haben gearbeitet.'],'source':'KB70; AB71'},
 {'id':'l11-strong','title':'Strong participles: learn the whole word','de':'trinken → getrunken · schreiben → geschrieben','en':'Many strong verbs end in -en in the participle. Their vowel may change: trinken/getrunken, singen/gesungen, treffen/getroffen. Do not build every participle with -t.','examples':['Ich habe ein Buch gelesen.','Sie hat einen Kuchen gebacken.','Wir haben Freunde getroffen.'],'source':'KB70–72; AB71'},
 {'id':'l11-separable','title':'The prefix stays attached to the participle','de':'aufräumen → aufgeräumt · einladen → eingeladen','en':'Put ge between the separable prefix and the rest of the verb. Present: Ich räume auf. Perfekt: Ich habe aufgeräumt. The complete participle is last.','examples':['Ich habe eingekauft.','Wir haben abgewaschen.','Hast du ferngesehen?'],'source':'KB70–72; AB71'},
 {'id':'l11-ieren','title':'-ieren: skip ge-','de':'telefonieren → telefoniert','en':'Verbs ending in -ieren take -t without ge-. In this lesson: telefoniert and fotografiert. Keep the same complete participle for every person.','examples':['Ich habe telefoniert.','Wir haben Vögel fotografiert.'],'source':'KB70; AB71'},
 {'id':'l11-questions','title':'Ask about the past, then answer briefly','de':'Was hast du gemacht? / Hast du gelernt?','en':'A W-question puts haben after the question word. A yes/no question starts with haben. The participle stays last. A short answer can leave out the action already mentioned.','examples':['Was habt ihr gestern gemacht?','Hast du gelernt?','Ja, habe ich.','Nein, habe ich nicht.'],'source':'KB70–71; AB71–73'},
 {'id':'l11-opening','title':'Opening hours: a point, an interval or a starting point','de':'um acht · von acht bis eins · ab September','en':'Um identifies a clock time. Von … bis gives a start and an end. Ab gives a starting point with no stated end. Ask Wann ist die Praxis geöffnet? or Ab wann ist sie wieder geöffnet?','examples':['Die Praxis ist von acht bis eins geöffnet.','Der Kurs beginnt um acht Uhr.','Ab September ist die Boutique wieder geöffnet.'],'source':'KB71 partner pages169/197; AB73'},
 {'id':'l11-last','title':'Last: follow the time noun','de':'letzten Freitag · letztes Wochenende · letzte Woche','en':'These time expressions have no preposition: letzten with masculine weekdays, letztes with neuter Wochenende or Jahr, letzte with feminine Woche. Learn each colour-coded chunk together.','examples':['Letzten Samstag habe ich gelernt.','Letztes Wochenende habe ich Freunde getroffen.','Letzte Woche habe ich gearbeitet.'],'source':'KB71; AB73'},
]
phrases=[('Was hast du gestern gemacht?','What did you do yesterday?'),('Ich habe gestern gearbeitet.','I worked yesterday.'),('Ich habe Zeitung gelesen.','I read the newspaper.'),('Ich habe meinen Schreibtisch aufgeräumt.','I tidied my desk.'),('Ich habe einen Spaziergang gemacht.','I went for a walk.'),('Ich habe zu wenig gegessen.','I ate too little.'),('Ich habe zu viel Kaffee getrunken.','I drank too much coffee.'),('Habt ihr gestern Abend aufgeräumt?','Did you tidy up yesterday evening?'),('Wir haben Freunde eingeladen.','We invited friends.'),('Ich habe Wäsche gewaschen.','I did the laundry.'),('Hast du gestern lange geschlafen?','Did you sleep for a long time yesterday?'),('Ja, habe ich.','Yes, I did.'),('Nein, habe ich nicht.','No, I did not.'),('Wann ist die Praxis geöffnet?','When is the practice open?'),('Von acht bis dreizehn Uhr.','From eight until one p.m.'),('Ab wann ist die Praxis wieder geöffnet?','From when is the practice open again?'),('Ab September.','From September onward.'),('Heute ist der Laden geschlossen.','The shop is closed today.'),('Letzte Woche habe ich viel gearbeitet.','Last week I worked a lot.'),('Danach haben wir ein Eis gegessen.','Afterwards we ate an ice cream.')]
quiz=[('Ich ___ gestern gearbeitet.',['habe','bin','hat'],'habe','This action uses haben: ich habe gearbeitet.'),('Wir ___ Kaffee getrunken.',['haben','hat','hast'],'haben','Wir takes haben; getrunken stays unchanged.'),('The participle of arbeiten',['gearbeitet','gearbeitetet','gearbeitt'],'gearbeitet','The stem needs -et after ge-.'),('The participle of trinken',['getrunken','getrinkt','getrinken'],'getrunken','Strong verb: trinken → getrunken.'),('The participle of aufräumen',['aufgeräumt','geaufräumt','aufräumt'],'aufgeräumt','Ge goes after the separable prefix auf.'),('Ich habe ___. (telefonieren)',['telefoniert','getelefoniert','telefonieren'],'telefoniert','-ieren verbs form the participle without ge-.'),('Choose the standard past question.',['Was hast du gestern gemacht?','Was du hast gestern gemacht?','Was hast gemacht du gestern?'],'Was hast du gestern gemacht?','Question word, auxiliary, subject, time, participle.'),('___ Woche habe ich gelernt.',['Letzte','Letzten','Letztes'],'Letzte','Die Woche → letzte Woche.'),('A complete opening interval',['von acht bis eins','ab acht','um acht'],'von acht bis eins','Von … bis names the start and end.'),('A starting date with no stated end',['ab September','um September','von September'],'ab September','Ab marks the beginning of a period.')]
unit={'number':11,'summary':'Talk about yesterday with Perfekt, remember participle patterns and ask about opening hours.','words':words,'concepts':concepts,'verbs':verbs,'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
(ROOT/'platform/apps/web/generated/lesson-eleven-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':11,'words':len(words),'verbs':len(verbs),'concepts':len(concepts),'phrases':len(phrases),'quiz':len(quiz)}))
