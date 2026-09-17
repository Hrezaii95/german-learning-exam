"""Audited Lesson 6 glossary plus named KB/AB exercise and Module 2 vocabulary.

Core: KB 37-40, AB 34-37; module review: KB 41-46, AB 38-45.
Examples, explanations and quizzes are authored study aids, not official keys.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
examples = {
 "Oh Gott!": ("Oh Gott! So viel Arbeit!","Oh God! So much work!"),
 "viel": ("Ich habe viel Arbeit.","I have a lot of work."),
 "die Arbeit": ("Ich habe viel Arbeit.","I have a lot of work."),
 "Hilfe!": ("Hilfe! Mein Passwort ist falsch.","Help! My password is wrong."),
 "der Hunger": ("Ich habe Hunger.","I am hungry."),
 "Hunger haben": ("Ich habe Hunger.","I am hungry."),
 "telefonieren": ("Ich telefoniere mit Anna.","I am talking on the phone to Anna."),
 "das WLAN": ("Ich komme nicht ins WLAN.","I cannot connect to the Wi-Fi."),
 "brauchen": ("Wir brauchen einen Stift.","We need a pen."),
 "neu": ("Ist das Passwort neu?","Is the password new?"),
 "Viele Grüße": ("Viele Grüße!","Kind regards!"),
 "das Yoga": ("Morgen leider kein Yoga.","Unfortunately, no yoga tomorrow."),
 "morgen": ("Morgen habe ich einen Termin.","I have an appointment tomorrow."),
 "leider": ("Frau Müller ist leider nicht da.","Unfortunately, Ms Müller is not here."),
 "Zeit haben": ("Ich habe Zeit.","I have time."),
 "keine Zeit haben": ("Ich habe keine Zeit.","I have no time."),
 "die Zeit": ("Ich habe keine Zeit.","I have no time."),
 "von": ("Das ist eine Nachricht von Anna.","This is a message from Anna."),
 "Liebe Grüße / LG": ("Liebe Grüße!","Kind regards!"),
 "dann": ("Dann suchen Sie bitte einen Stift.","Then please look for a pen."),
 "notieren": ("Ich notiere den Termin.","I note down the appointment."),
 "in die Tasche packen": ("Ich packe einen Laptop in meine Tasche.","I put a laptop in my bag."),
 "Ach, da ist er ja!": ("Ach, da ist er ja!","Oh, there it is!"),
 "schon wieder": ("Wo ist schon wieder der Kalender?","Where is the calendar again?"),
 "vielleicht": ("Haben Sie vielleicht den Kalender?","Do you perhaps have the calendar?"),
 "Hallo, … hier.": ("Hallo, Sara hier.","Hello, Sara speaking."),
 "hier": ("Hier ist Sara.","This is Sara speaking."),
 "Was kann ich für Sie tun?": ("Was kann ich für Sie tun?","How can I help you?"),
 "da sein": ("Ist Frau Müller da?","Is Ms Müller there?"),
 "Auf Wiederhören.": ("Auf Wiederhören.","Goodbye (on the phone)."),
 "schnell": ("Der Computer ist schnell.","The computer is fast."),
 "schwer": ("Der Tisch ist schwer.","The table is heavy."),
 "suchen": ("Ich suche den Kalender.","I am looking for the calendar."),
 "packen": ("Ich packe einen Stift in meine Tasche.","I put a pen in my bag."),
 "haben": ("Wir haben einen Termin.","We have an appointment."),
 "sehen": ("Ich sehe keinen Kalender.","I do not see a calendar."),
 "finden": ("Ich finde das Passwort nicht.","I cannot find the password."),
 "das Leder": ("Die Tasche ist aus Leder.","The bag is made of leather."),
 "der Stress": ("Wir brauchen keinen Stress.","We do not need stress."),
 "die Liebe": ("Wir brauchen Liebe.","We need love."),
 "das Glück": ("Ich habe Glück.","I am lucky."),
 "der Würfel": ("Das ist ein Würfel.","This is a die."),
 "würfeln": ("Du würfelst zuerst.","You roll the dice first."),
}
words=[]
with (ROOT/'research/lesson-expansion/lesson-06-vocabulary.tsv').open(encoding='utf8',newline='') as source:
 for row in csv.DictReader(source,delimiter='\t'):
  de,en=row['de'],row['en']
  if de in examples:example,translation=examples[de]
  else:
   article,noun=de.split(' ',1)
   example=f"Das ist {'eine' if article=='die' else 'ein'} {noun}."
   meaning=en.split(' / ')[0].split(' (')[0]
   translation=f"This is {'an' if meaning[0] in 'aeiou' else 'a'} {meaning}."
  slug=de.removeprefix('der ').removeprefix('die ').removeprefix('das ').lower()
  for a,b in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:slug=slug.replace(a,b)
  words.append({**row,'id':'l6-'+re.sub('[^a-z0-9]+','-',slug).strip('-'),'example':example,'translation':translation})
concepts=[
 {'id':'l6-plural','title':'One noun, five plural families','de':'-n / -en · -s · -e · -er · no ending','en':'Learn the plural with each noun. Nachricht → Nachrichten, Laptop → Laptops, Stift → Stifte, Passwort → Passwörter, Drucker → Drucker. Some plurals add an umlaut, with or without an ending: Maus → Mäuse; Vater → Väter. Every definite plural uses die.','examples':['der Termin → die Termine','die Maus → die Mäuse','das Passwort → die Passwörter'],'source':'KB 38; AB 34–35'},
 {'id':'l6-accusative','title':'The object changes the masculine article','de':'der → den · ein → einen · kein → keinen','en':'After haben, brauchen, suchen, sehen and finden, the direct object takes the accusative. In the singular only the masculine article changes. Neuter das/ein/kein and feminine die/eine/keine keep their form. Compare the subject or identification (nominative) with the object (accusative).','examples':['Das ist ein Stift. Ich brauche einen Stift.','Wo ist der Kalender? Ich habe den Kalender.','Ich suche die Maus. Ich brauche das Tablet.'],'source':'KB 39; AB 35–37'},
 {'id':'l6-no-plural-ein','title':'Plural: no ein, but still keine','de':'ein Termin → Termine · kein Termin → keine Termine','en':'There is no plural of ein as an indefinite article. Say Ich habe Termine, or Ich habe zwei Termine. For none, use keine: Ich habe keine Termine. The definite plural is die in both nominative and accusative.','examples':['Ich brauche Stifte.','Ich habe keine Stifte.','Wo sind die Stifte? Ich suche die Stifte.'],'source':'KB 38–39; AB 36'},
 {'id':'l6-negation','title':'No thing or not a description?','de':'Ich habe keinen Stift. Das Passwort ist nicht richtig.','en':'Use kein with a noun that would have ein or no article, and choose the case ending. Use nicht to negate an adjective or another statement. Fixed chunks: keine Zeit haben, keinen Hunger haben.','examples':['Ich habe keine Zeit.','Ich brauche keinen Kaffee.','Der Laptop ist nicht günstig.'],'source':'KB 37–39; AB 36–37'},
 {'id':'l6-messages','title':'Read an appointment message','de':'morgen · leider · von · Viele Grüße · LG','en':'Morgen means tomorrow; leider means unfortunately. Von introduces the sender or owner. End a message with Viele Grüße or Liebe Grüße; LG abbreviates Liebe Grüße. Capitalize nouns and formal Sie/Ihr.','examples':['Morgen habe ich einen Termin.','Ich habe leider keine Zeit.','Das ist eine Nachricht von Anna.'],'source':'KB 38; AB 37'},
 {'id':'l6-phone','title':'A phone call in five moves','de':'Hier ist … → Was kann ich für Sie tun? → Ist … da? → Einen Moment bitte. → Auf Wiederhören.','en':'Give the company and your name. Ask who the caller needs. Use Herr before a male name and Frau before a female name. Auf Wiederhören is the usual telephone goodbye. Learn Was kann ich für Sie tun? as a fixed phrase here.','examples':['Guten Tag, hier ist Sara Rahimi.','Ist Frau Müller da?','Frau Müller ist leider nicht da.'],'source':'KB 40; AB 37'},
 {'id':'l6-ue','title':'Say ü: start with i, round your lips','de':'Grüße · Schlüssel · Stühle · fünf · grün · tschüs','en':'Keep your tongue in the i position while rounding your lips. Long ü: Grüße, Stühle, grün. Short ü: Schlüssel, fünf, tschüs. Use the original workbook recordings to compare i, u and ü.','examples':['Grüße','Schlüssel','Stühle','fünf','grün','tschüs'],'source':'AB 35, exercise 5'},
]
verb_rows=[
 ('haben','to have',['habe','hast','hat','haben','habt','haben'],'du and er/sie/es lose b: hast, hat.'),
 ('brauchen','to need',['brauche','brauchst','braucht','brauchen','braucht','brauchen'],'The thing you need takes the accusative.'),
 ('suchen','to look for',['suche','suchst','sucht','suchen','sucht','suchen'],'Ich suche den Kalender. The searched-for object is accusative.'),
 ('sehen','to see',['sehe','siehst','sieht','sehen','seht','sehen'],'e → ie in du and er/sie/es. Ich sehe einen Stift.'),
 ('finden','to find / have an opinion',['finde','findest','findet','finden','findet','finden'],'Extra e after d. Ich finde das Passwort nicht.'),
 ('packen','to pack',['packe','packst','packt','packen','packt','packen'],'Learn the full chunk: Ich packe einen Laptop in meine Tasche.'),
 ('notieren','to note down',['notiere','notierst','notiert','notieren','notiert','notieren'],'Regular forms; note the ending -ieren.'),
 ('telefonieren','to talk on the phone',['telefoniere','telefonierst','telefoniert','telefonieren','telefoniert','telefonieren'],'Use mit for the person you are speaking to: mit Anna.'),
 ('würfeln','to roll dice',['würfle','würfelst','würfelt','würfeln','würfelt','würfeln'],'Module 2 game vocabulary. ich würfle; ich würfele is also possible.'),
]
phrases=[('Wir haben einen Termin.','We have an appointment.'),('Ich brauche einen Kaffee.','I need a coffee.'),('Ich habe keinen Stift.','I do not have a pen.'),('Ich habe keine Zeit.','I have no time.'),('Ich habe Hunger.','I am hungry.'),('Wo sind die Passwörter?','Where are the passwords?'),('Ich komme nicht ins WLAN.','I cannot connect to the Wi-Fi.'),('Haben Sie vielleicht den Kalender?','Do you perhaps have the calendar?'),('Ach, da ist er ja!','Oh, there it is!'),('Guten Tag, hier ist Sara Rahimi.','Hello, this is Sara Rahimi speaking.'),('Was kann ich für Sie tun?','How can I help you?'),('Ist Frau Müller da?','Is Ms Müller there?'),('Einen Moment bitte.','One moment, please.'),('Frau Müller ist leider nicht da.','Unfortunately, Ms Müller is not here.'),('Vielen Dank. Auf Wiederhören.','Thank you very much. Goodbye (on the phone).'),('Viele Grüße','Kind regards'),('Liebe Grüße','Kind regards / love')]
quiz=[
 ('Ich brauche ___ Stift.',['ein','einen','eine'],'einen','Der Stift is masculine; brauchen takes an accusative object: einen Stift.'),
 ('Wo ist ___ Kalender?',['der','den','dem'],'der','Here the calendar is the subject: nominative der.'),
 ('Hast du ___ Kalender?',['der','den','dem'],'den','The calendar is the object of haben: accusative den.'),
 ('Ich suche ___ Tablet.',['den','das','der'],'das','Neuter das stays das in the accusative.'),
 ('Wir haben ___ Termine. (none)',['kein','keinen','keine'],'keine','The plural negative article is keine.'),
 ('What is the plural of das Passwort?',['die Passworte','die Passwörter','die Passworts'],'die Passwörter','Passwort adds an umlaut and -er: Passwörter.'),
 ('What is the plural of der Drucker?',['die Drucker','die Druckern','die Drücker'],'die Drucker','Drucker keeps its form. The plural article is die.'),
 ('Which goodbye fits a telephone call?',['Auf Wiederhören.','Guten Morgen.','Wie bitte?'],'Auf Wiederhören.','Auf Wiederhören is the standard telephone goodbye.'),
]
unit={'number':6,'summary':'Handle office messages and calls, learn noun plurals and use accusative objects with confidence. Includes Module 2 review.','words':words,'concepts':concepts,'verbs':[{'verb':v,'meaning':m,'forms':f,'tip':t} for v,m,f,t in verb_rows],'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
(ROOT/'platform/apps/web/generated/lesson-six-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':6,'words':len(words),'concepts':len(concepts),'verbs':len(verb_rows),'phrases':len(phrases),'quiz':len(quiz)}))
