"""Lesson 12 source vocabulary and authored seasons, journey and tense learning aids."""
import csv
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
words=[]
with (ROOT/'research/lesson-expansion/lesson-12-vocabulary.tsv').open(encoding='utf8',newline='') as f:
    for row in csv.DictReader(f,delimiter='\t'):
        slug=re.sub(r'^(der|die|das) ','',row['de']).lower()
        for a,b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:slug=slug.replace(a,b)
        words.append({**row,'id':'l12-'+re.sub('[^a-z0-9]+','-',slug).strip('-')})
for w in words:
    if w['de'] in ('das Weihnachten','das Silvester'):w['usage']='Neuter, but normally used without an article: Weihnachten feiern / Silvester feiern.'
old={v['verb']:v for p in sorted((ROOT/'platform/apps/web/generated').glob('lesson-*-study.json')) if p.name!='lesson-twelve-study.json' for v in json.loads(p.read_text(encoding='utf8'))['verbs']}
present={
 'kommen':['komme','kommst','kommt','kommen','kommt','kommen'],
 'gehen':['gehe','gehst','geht','gehen','geht','gehen'],
 'laufen':['laufe','läufst','läuft','laufen','lauft','laufen'],
 'bleiben':['bleibe','bleibst','bleibt','bleiben','bleibt','bleiben'],
 'passieren':['passiere','passierst','passiert','passieren','passiert','passieren'],
 'wandern':['wandere','wanderst','wandert','wandern','wandert','wandern'],
 'segeln':['segle','segelst','segelt','segeln','segelt','segeln'],
 'springen':['springe','springst','springt','springen','springt','springen'],
 'dauern':['dauere','dauerst','dauert','dauern','dauert','dauern'],
 'warten':['warte','wartest','wartet','warten','wartet','warten'],
 'legen':['lege','legst','legt','legen','legt','legen'],
 'reiten':['reite','reitest','reitet','reiten','reitet','reiten'],
 'sein':['bin','bist','ist','sind','seid','sind'],
 'haben':['habe','hast','hat','haben','habt','haben'],
 'feiern':['feiere','feierst','feiert','feiern','feiert','feiern'],
}
for v,prefix in [('weiterfahren','weiter'),('zurückfahren','zurück')]:present[v]=[f'{s} {prefix}' for s in ['fahre','fährst','fährt','fahren','fahrt','fahren']]
models='''laufen|gelaufen|sein
fahren|gefahren|sein
fliegen|geflogen|sein
gehen|gegangen|sein
kommen|gekommen|sein
ankommen|angekommen|sein
abfahren|abgefahren|sein
einsteigen|eingestiegen|sein
weiterfahren|weitergefahren|sein
zurückfahren|zurückgefahren|sein
bleiben|geblieben|sein
passieren|passiert|sein
wandern|gewandert|sein
segeln|gesegelt|sein
springen|gesprungen|sein
schwimmen|geschwommen|sein
reiten|geritten|sein
besuchen|besucht|haben
feiern|gefeiert|haben
dauern|gedauert|haben
warten|gewartet|haben
legen|gelegt|haben
sehen|gesehen|haben
abholen|abgeholt|haben
machen|gemacht|haben
lesen|gelesen|haben
fotografieren|fotografiert|haben
essen|gegessen|haben
trinken|getrunken|haben
treffen|getroffen|haben
sein|gewesen|sein
haben|gehabt|haben'''
verbs=[]
for line in models.splitlines():
    v,part,aux=line.split('|');forms=present.get(v) or old[v]['forms']
    tip=f'Perfekt in this lesson: {"ist" if aux=="sein" else "hat"} {part}. '
    if v in ('bleiben','passieren','sein'):tip+='Remember this sein verb separately; it is not a journey from one place to another.'
    elif v=='besuchen':tip+='A visit uses haben; be- is not separated and the participle has no ge-.'
    elif v in ('schwimmen','reiten','segeln'):tip+='This is the sein pattern used in the source activity. Other contexts may use haben.'
    elif aux=='sein':tip+='This source use describes movement or arrival. Keep the complete participle last.'
    else:tip+='This activity uses haben even when it happens during a trip.'
    item={'verb':v,'meaning':next(w['en'] for w in words if w['de']==v),'forms':forms,'participle':part,'auxiliary':aux,'tip':tip,'source':'KB73–76,171; AB74–77; Magazine4'}
    if v=='passieren':item['tip']='In the meaning happen, use es passiert / etwas ist passiert. First- and second-person forms belong to other meanings of passieren.';item['priority']='phrase'
    if v=='dauern':item['tip']='For duration use es dauert / das Fest dauert; plural: die Ferien dauern. First- and second-person forms are rarely needed.';item['priority']='phrase'
    if v in ('sein','haben'):
        item['preterite']=['war','warst','war','waren','wart','waren'] if v=='sein' else ['hatte','hattest','hatte','hatten','hattet','hatten']
        item['tip']+=' In conversation, war / hatte are often simpler: Die Reise war schön. Wir hatten Spaß.'
    verbs.append(item)
concepts=[
 {'id':'l12-sein','title':'Journeys often use sein in the Perfekt','de':'Ich bin nach Hamburg gefahren.','en':'For the movement uses in this lesson, conjugate sein and put the participle last: bin gefahren, bist gelaufen, ist gekommen. The participle stays the same for every person.','examples':['Wir sind nach Wien geflogen.','Sie ist am Montag angekommen.','Bist du schon einmal einen Marathon gelaufen?'],'source':'KB73–75; AB76'},
 {'id':'l12-choice','title':'Choose the auxiliary for the action, not the holiday','de':'Ich bin gefahren. Ich habe meine Eltern besucht.','en':'Being on a trip does not make every verb use sein. Going or arriving uses sein in these examples; visiting, celebrating, photographing and eating use haben.','examples':['Ich bin nach Berlin gefahren.','Ich habe meine Eltern besucht.','Wir sind ins Café gegangen.','Wir haben Kaffee getrunken.'],'source':'KB74; AB76'},
 {'id':'l12-exceptions','title':'Keep bleiben, passieren and sein in the sein group','de':'ist geblieben · ist passiert · ist gewesen','en':'These verbs use sein although they do not describe a normal journey from place to place. Passieren meaning happen is normally used with es or etwas: Was ist passiert?','examples':['Wir sind drei Tage geblieben.','Was ist passiert?','Ich bin in Hamburg gewesen.'],'source':'KB75'},
 {'id':'l12-war-hatte','title':'War and hatte tell the background','de':'Die Reise war schön. Wir hatten viel Spaß.','en':'These are Präteritum forms of sein and haben, very common in spoken German. War means was or were; hatte means had. They can stand alone without a second verb. Compare ich bin gewesen with ich war.','examples':['Ich war in Spanien.','Du hattest Glück mit dem Wetter.','Wir waren mit Freunden unterwegs.','Wir hatten viel Spaß.'],'source':'KB75; AB77'},
 {'id':'l12-seasons','title':'Months and seasons use im','de':'im Frühling · im März','en':'All twelve month names and all four season names in this lesson are masculine. Im combines in + dem. Use im with months and seasons, am with weekdays and um with a clock time.','examples':['Ich habe im Januar Geburtstag.','Im Sommer machen wir eine Radtour.','Am Samstag fahren wir um acht Uhr ab.'],'source':'KB74–75; AB75'},
 {'id':'l12-destination','title':'Where to? Nach or in plus the article','de':'nach Österreich · in die Schweiz · in den Iran','en':'For destinations, use nach with cities and ordinary article-free country names. Countries with an article use in plus the accusative: die Schweiz → in die Schweiz; der Iran → in den Iran. For origin use aus: aus der Schweiz, aus dem Iran.','examples':['Ich bin nach Hamburg gefahren.','Wir sind in die Schweiz gefahren.','Ich bin in den Iran geflogen.'],'source':'KB74; AB74,79'},
 {'id':'l12-since','title':'Seit connects the beginning to now','de':'Das Fest gibt es seit 1977.','en':'Seit gives the starting point of something that continues. German commonly uses the present tense here: Das Fest gibt es seit 1977. Ask Seit wann? Do not confuse seit with ab, which gives the start of availability or a plan.','examples':['Seit wann gibt es das Fest?','Das Fest gibt es seit 1977.','Wie lange dauert das Fest?'],'source':'KB73,76'},
 {'id':'l12-years','title':'Say the year in chunks','de':'1986 → neunzehnhundertsechsundachtzig','en':'For the years practiced here, 19xx is usually neunzehnhundert plus the remaining number. Years from 2000 use zweitausend plus the remaining number. No und between tausend and the rest: zweitausendeinundzwanzig.','examples':['neunzehnhundertsechsundachtzig','zweitausendneunzehn','zweitausendeinundzwanzig'],'source':'KB73; AB74'},
]
phrases=[('Im Frühling bin ich nach Hamburg gefahren.','I traveled to Hamburg in spring.'),('Ich bin mit dem Zug angekommen.','I arrived by train.'),('Wir sind in die Schweiz gefahren.','We traveled to Switzerland.'),('Ich bin nach Österreich geflogen.','I flew to Austria.'),('Wir sind lange dort geblieben.','We stayed there for a long time.'),('Ich habe meine Eltern besucht.','I visited my parents.'),('Wir haben Weihnachten gefeiert.','We celebrated Christmas.'),('Bist du schon einmal einen Marathon gelaufen?','Have you ever run a marathon?'),('Was ist passiert?','What happened?'),('Die Reise war sehr schön.','The trip was lovely.'),('Ich hatte Glück mit dem Wetter.','I was lucky with the weather.'),('Wir hatten viel Spaß.','We had a lot of fun.'),('Wann hast du Geburtstag?','When is your birthday?'),('Ich habe im Januar Geburtstag.','My birthday is in January.'),('Seit wann gibt es das Fest?','Since when has the festival existed?'),('Das Fest gibt es seit 1977.','The festival has existed since 1977.'),('Wie lange dauert das Fest?','How long does the festival last?'),('Es dauert von Freitag bis Sonntag.','It lasts from Friday until Sunday.'),('Wohin bist du gefahren?','Where did you travel to?'),('Im Frühling bin ich in den Iran geflogen.','I flew to Iran in spring.')]
quiz=[('Ich ___ nach Berlin gefahren.',['bin','habe','hat'],'bin','This journey uses sein: ich bin gefahren.'),('Wir ___ unsere Eltern besucht.',['haben','sind','ist'],'haben','Besuchen uses haben, even during a trip.'),('Er ist drei Tage ___.',['geblieben','gebleibt','bleiben'],'geblieben','Bleiben is a sein verb with the participle geblieben.'),('Was ___ passiert?',['ist','hat','hast'],'ist','Passieren meaning happen uses sein.'),('___ Sommer habe ich Geburtstag.',['Im','Am','Um'],'Im','Months and seasons use im.'),('My birthday is in March.',['Ich habe im März Geburtstag.','Ich bin im März Geburtstag.','Ich habe am März Geburtstag.'],'Ich habe im März Geburtstag.','Use haben Geburtstag and im with a month.'),('Destination: Switzerland',['in die Schweiz','nach die Schweiz','aus der Schweiz'],'in die Schweiz','A country with an article uses in plus the accusative for a destination.'),('Destination: Iran',['in den Iran','aus dem Iran','nach dem Iran'],'in den Iran','Der Iran becomes in den Iran for this destination.'),('Wir ___ viel Spaß.',['hatten','hatte','war'],'hatten','Wir uses hatten in the Präteritum of haben.'),('Something has existed from 1977 until now.',['seit 1977','ab 1977','um 1977'],'seit 1977','Seit links its starting point to the present.')]
unit={'number':12,'summary':'Tell travel stories, choose haben or sein, remember months and seasons, and describe festivals with war, hatte and seit.','words':words,'concepts':concepts,'verbs':verbs,'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
(ROOT/'platform/apps/web/generated/lesson-twelve-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':12,'words':len(words),'verbs':len(verbs),'concepts':len(concepts),'phrases':len(phrases),'quiz':len(quiz)}))
