"""Lesson 8: source glossary pp. 11-12, KB 51-54 and AB 50-53.

Source vocabulary plus named book words; explanations, examples and quizzes
are authored study aids. The clock uses the variants taught in these pages.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
words = []
with (ROOT / 'research/lesson-expansion/lesson-08-vocabulary.tsv').open(encoding='utf8', newline='') as source:
    for row in csv.DictReader(source, delimiter='\t'):
        slug = re.sub(r'^(der|die|das) ', '', row['de']).lower()
        for old, new in [('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')]:
            slug = slug.replace(old, new)
        words.append({**row, 'id': 'l8-' + re.sub('[^a-z0-9]+', '-', slug).strip('-')})

concepts = [
    {'id':'l8-am-um','title':'Days take am; clock times take um','de':'am Montag · am Abend · um vier','en':'Use am with a weekday, the weekend and most parts of the day. Use um with a clock time. The exception to remember is in der Nacht. Heute needs no preposition: heute Abend, not am heute Abend.','examples':['Am Montag habe ich Zeit.','Wir gehen um vier ins Kino.','Heute Abend habe ich keine Zeit.','In der Nacht arbeite ich.'],'source':'KB 52-54; AB 50-52'},
    {'id':'l8-days','title':'Seven days, all masculine','de':'der Montag → der Sonntag · das Wochenende','en':'All seven weekday names are masculine nouns and start with a capital letter. Saturday and Sunday make das Wochenende. Combine day and part of day into one noun: am Samstagnachmittag.','examples':['Am Mittwoch arbeite ich.','Am Wochenende habe ich frei.','Am Samstagnachmittag gehe ich ins Museum.'],'source':'KB 52-53; AB 50-51'},
    {'id':'l8-time-first','title':'Time first? The verb stays second','de':'Ich habe am Montag Zeit. → Am Montag habe ich Zeit.','en':'A complete time phrase counts as one block. When it comes first, the subject follows the conjugated verb. Do not leave ich before habe after Am Montag. A modal keeps its infinitive at the end.','examples':['Am Abend gehen wir ins Kino.','Um drei treffe ich Nina.','Vielleicht können wir am Sonntag Tennis spielen.'],'source':'KB 52, 54; AB 50'},
    {'id':'l8-half','title':'Halb points to the next hour','de':'halb vier = 3:30 / 15:30','en':'Think halfway to four, not half past four. Viertel nach drei is 3:15; Viertel vor vier is 3:45. Fünf vor halb vier is 3:25; fünf nach halb vier is 3:35. The spoken 12-hour form needs context to distinguish morning and afternoon.','examples':['Es ist halb vier.','Es ist fünf vor halb vier.','Es ist fünf nach halb vier.'],'source':'KB 53; AB 52'},
    {'id':'l8-clock','title':'Read official and everyday time','de':'fünfzehn Uhr fünfzehn = Viertel nach drei','en':'The official form reads hours, Uhr, then minutes using the 24-hour clock. The everyday form uses the 12-hour clock, nach, vor and halb. Say ein Uhr, but eins without Uhr: Viertel nach eins. Regional variants also exist; use the book patterns here.','examples':['Es ist dreizehn Uhr.','Es ist ein Uhr.','Es ist Viertel nach eins.','Wie spät ist es?'],'source':'KB 53-54; AB 52'},
    {'id':'l8-know','title':'Wissen: a fact you know','de':'weiß · weißt · weiß · wissen · wisst · wissen','en':'Wissen describes knowing information. The singular uses weiß; the plural uses wiss-. Ich and er/sie/es have the same form. Kennen describes familiarity with a person, place or thing.','examples':['Das weiß ich noch nicht.','Weißt du die Antwort?','Wisst ihr das schon?'],'source':'KB 52; AB 51'},
    {'id':'l8-destinations','title':'Choose a destination phrase','de':'ins Kino · in eine Bar · in einen Klub','en':'For going to an indoor destination, these book phrases use in + accusative. Ins is in das. Neuter: ins Kino / Museum / Theater. Feminine: in eine Ausstellung / Disco / Bar. Masculine: in einen Klub. Keep each place and its article together.','examples':['Gehen wir ins Kino?','Wir gehen in eine Ausstellung.','Am Abend gehe ich in einen Klub.'],'source':'KB 52-53; AB 51'},
    {'id':'l8-arrange','title':'Suggest, agree, decline, or leave it open','de':'Lust auf Kino? → Gute Idee! / Tut mir leid. / Vielleicht.','en':'Gehen wir ins Kino? proposes an activity. Hast du am Abend Zeit? checks availability. Accept with Ja, gern or Gute Idee. Decline politely with Tut mir leid, ich habe leider keine Zeit. Das weiß ich noch nicht leaves the answer open.','examples':['Hast du am Samstag Zeit?','Ja, da kann ich.','Tut mir leid, ich kann leider nicht.','Das weiß ich noch nicht.'],'source':'KB 54; AB 53'},
]
verbs = [
 ('wissen','to know (a fact)',['weiß','weißt','weiß','wissen','wisst','wissen'],'Singular weiß-, plural wiss-. Ich and er/sie/es take weiß.'),
 ('gehen','to go',['gehe','gehst','geht','gehen','geht','gehen'],'Time first: Am Abend gehe ich ins Kino.'),
 ('haben','to have',['habe','hast','hat','haben','habt','haben'],'Zeit haben means to have time; frei haben means to have time off.'),
 ('können','can / to be able to',['kann','kannst','kann','können','könnt','können'],'The infinitive closes the frame: Wir können ins Kino gehen.'),
 ('treffen','to meet',['treffe','triffst','trifft','treffen','trefft','treffen'],'e → i in du and er/sie/es. Um drei treffe ich Nina.'),
 ('planen','to plan',['plane','planst','plant','planen','plant','planen'],'Regular endings. Wir planen einen Traumtag.'),
]
phrases = [
 ('Ich habe leider keine Zeit.','Unfortunately, I have no time.'),
 ('Hast du am Samstag Zeit?','Do you have time on Saturday?'),
 ('Gehen wir ins Kino?','Shall we go to the cinema?'),
 ('Lust auf Schwimmbad?','Feel like going to the swimming pool?'),
 ('Gute Idee!','Good idea!'),
 ('Ja, gern.','Yes, gladly.'),
 ('Ja, da kann ich.','Yes, I am available then.'),
 ('Tut mir leid, ich kann leider nicht.','I am sorry, unfortunately I cannot.'),
 ('Das weiß ich noch nicht.','I do not know yet.'),
 ('Nein, keine Lust.','No, I do not feel like it.'),
 ('Wann denn?','When, then?'),
 ('Wie spät ist es?','What time is it?'),
 ('Wie viel Uhr ist es?','What time is it?'),
 ('Es ist halb vier.','It is half past three.'),
 ('Es ist fünfzehn Uhr fünfzehn.','It is fifteen fifteen.'),
 ('Um Viertel nach sieben?','At quarter past seven?'),
 ('Nein, das ist zu spät.','No, that is too late.'),
 ('Am Abend habe ich keine Zeit.','I have no time in the evening.'),
 ('Bis dann!','See you then!'),
 ('Vielleicht können wir am Sonntag Tennis spielen.','Maybe we can play tennis on Sunday.'),
]
quiz = [
 ('___ Montag habe ich Zeit.',['Am','Um','In'],'Am','Weekdays take am.'),
 ('Wir gehen ___ vier ins Kino.',['am','um','in der'],'um','Clock times take um.'),
 ('___ Nacht arbeite ich.',['Am','Um','In der'],'In der','Remember the exception: in der Nacht.'),
 ('Which sentence keeps the verb in position 2?',['Am Montag habe ich Zeit.','Am Montag ich habe Zeit.','Am Montag Zeit ich habe.'],'Am Montag habe ich Zeit.','Am Montag is one block. Habe stays second and ich follows.'),
 ('halb vier means …',['3:30','4:30','4:00'],'3:30','Halb points to the next hour: halfway to four.'),
 ('fünf nach halb vier means …',['3:25','3:35','4:35'],'3:35','Five minutes after 3:30 is 3:35.'),
 ('15:45 in the book’s everyday pattern',['Viertel nach vier','Viertel vor vier','halb vier'],'Viertel vor vier','A quarter of an hour before four.'),
 ('Ich ___ das noch nicht.',['weiß','weiße','wisst'],'weiß','Ich and er/sie/es use weiß.'),
 ('Wir gehen ___ Klub.',['in einen','in eine','ins'],'in einen','Der Klub is masculine; the destination phrase uses accusative einen.'),
 ('Which answer politely declines an invitation?',['Tut mir leid, ich habe keine Zeit.','Gute Idee!','Ja, gern.'],'Tut mir leid, ich habe keine Zeit.','This apologizes and explains that you have no time.'),
]
unit={'number':8,'summary':'Tell the time, arrange a meeting and put time phrases first. Practise weekdays, am and um, wissen and going to places.','words':words,'concepts':concepts,'verbs':[{'verb':v,'meaning':m,'forms':f,'tip':t} for v,m,f,t in verbs],'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
assert all(w['example'] and w['translation'] for w in words)
(ROOT/'platform/apps/web/generated/lesson-eight-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':8,'words':len(words),'concepts':len(concepts),'verbs':len(verbs),'phrases':len(phrases),'quiz':len(quiz)}))
