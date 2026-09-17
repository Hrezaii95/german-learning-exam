"""Source vocabulary: Momente A1.1 glossary pp.12-13, KB55-64, AB54-65.
Examples, explanations and quizzes are authored learning aids.
"""
import csv
import json
import re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
words=[]
with (ROOT/'research/lesson-expansion/lesson-09-vocabulary.tsv').open(encoding='utf8',newline='') as f:
    for row in csv.DictReader(f,delimiter='\t'):
        slug=re.sub(r'^(der|die|das) ','',row['de']).lower()
        for old,new in [('ä','ae'),('ö','oe'),('ü','ue'),('ß','ss')]:slug=slug.replace(old,new)
        if row['de']=='das Essen':slug='essen-noun'
        words.append({**row,'id':'l9-'+re.sub('[^a-z0-9]+','-',slug).strip('-')})
next(w for w in words if w['de']=='der Ketchup')['variants']=['das Ketchup']
concepts=[
 {'id':'l9-like','title':'Like food; enjoy eating it','de':'Ich mag Käse. = Ich esse gern Käse.','en':'Mögen expresses liking. Essen or trinken + gern expresses enjoying the activity. For general food preferences, mass nouns and plural nouns often have no article: Käse, Brot, Tomaten.','examples':['Ich mag Schokolade.','Ich esse gern Schokolade.','Ich trinke gern Kaffee.'],'source':'KB55-56; AB54-55'},
 {'id':'l9-negation','title':'Food after mögen takes the accusative','de':'keinen Käse · kein Fleisch · keine Suppe · keine Tomaten','en':'For these general negative food preferences, use kein. Masculine accusative is keinen; neuter kein; feminine and plural keine. With essen/trinken gern, negate the enjoyment with nicht gern.','examples':['Ich mag keinen Fisch.','Ich mag kein Fleisch.','Ich esse nicht gern Fisch.'],'source':'KB55-56; AB54-55'},
 {'id':'l9-replies','title':'Four short replies, two different starting points','de':'Ich auch. · Ich nicht. · Ich schon. · Ich auch nicht.','en':'After a positive statement: Ich auch agrees; Ich nicht disagrees. After a negative statement: Ich auch nicht agrees; Ich schon disagrees. Schon here means that you do like it, despite the other speaker not liking it.','examples':['Ich mag Tee. – Ich auch.','Ich mag Käse. – Ich nicht.','Ich mag keinen Käse. – Ich schon.','Ich mag keinen Fisch. – Ich auch nicht.'],'source':'KB55,61; AB54'},
 {'id':'l9-irregular','title':'Learn mögen, essen and nehmen as six forms','de':'mag / magst · esse / isst · nehme / nimmst','en':'Mögen changes ö to a in the singular: mag, magst, mag. Essen changes e to i in du and er/sie/es: both use isst. Nehmen changes to nimmst/nimmt and loses h in these forms. The plural returns to mögen, essen and nehmen patterns.','examples':['Magst du Salat?','Was isst du gern?','Was nimmst du?'],'source':'KB56-57; AB55-56'},
 {'id':'l9-order','title':'Möchte is a polite wish, not a preference','de':'Ich mag Kaffee. ≠ Ich möchte einen Kaffee.','en':'Ich mag Kaffee says that you like coffee. Ich möchte einen Kaffee requests a coffee now. Learn möchte, möchtest, möchte, möchten, möchtet, möchten. These are polite forms of mögen, commonly taught together as möchten. Ich nehme … means I will have … when ordering.','examples':['Ich möchte eine Suppe.','Möchten Sie einen Tee?','Dann nehme ich einen Salat.'],'source':'KB57; AB56-57'},
 {'id':'l9-portion','title':'Order a serving with its own article','de':'eine Tasse Kaffee · ein Stück Kuchen · eine Portion Pommes','en':'The container or portion controls its article: die Tasse → eine Tasse, das Stück → ein Stück, die Portion → eine Portion. Coffee in general has no article in Ich mag Kaffee; einen Kaffee in an order means a serving of coffee.','examples':['Eine Tasse Kaffee, bitte.','Ich möchte ein Stück Kuchen.','Eine Portion Pommes, bitte.'],'source':'KB57,166'},
 {'id':'l9-compounds','title':'The last noun chooses the gender','de':'die Nuss + der Kuchen → der Nusskuchen','en':'The final noun gives a compound its article and basic meaning. A Nusskuchen is a kind of Kuchen, so it is masculine. Learn the joining form too: Schokolade becomes Schokoladen-; Orange becomes Orangen-. The first part does not choose the final article.','examples':['der Apfel + der Saft → der Apfelsaft','die Tomate + die Suppe → die Tomatensuppe','der Schinken + das Brötchen → das Schinkenbrötchen'],'source':'KB58; AB57'},
 {'id':'l9-restaurant','title':'Keep a restaurant conversation going','de':'Sie wünschen? → Einen Salat, bitte. → Gern.','en':'State what you would like. If a dish is no longer available, you may hear Wir haben keinen … mehr. Answer Schade, dann nehme ich … with an alternative, or Nein, danke. Guten Appetit wishes someone enjoyment of their meal.','examples':['Sie wünschen?','Tut mir leid, wir haben keinen Apfelkuchen mehr.','Schade, dann nehme ich einen Nusskuchen.','Guten Appetit!'],'source':'KB57,166; AB57,91'},
]
verbs=[
 ('mögen','to like',['mag','magst','mag','mögen','mögt','mögen'],'Singular ö → a. Ich and er/sie/es both use mag.'),
 ('essen','to eat',['esse','isst','isst','essen','esst','essen'],'Du and er/sie/es share isst. Ihr uses esst.'),
 ('trinken','to drink',['trinke','trinkst','trinkt','trinken','trinkt','trinken'],'Regular present tense. Ich trinke gern Tee.'),
 ('möchten','would like',['möchte','möchtest','möchte','möchten','möchtet','möchten'],'Polite forms of mögen, taught as a pattern: ich möchte, er möchte (no final t).'),
 ('nehmen','to take / have when ordering',['nehme','nimmst','nimmt','nehmen','nehmt','nehmen'],'Du nimmst and er/sie/es nimmt change e to i and drop h.'),
 ('wünschen','to wish / want',['wünsche','wünschst','wünscht','wünschen','wünscht','wünschen'],'Sie wünschen? is a polite restaurant prompt.'),
 ('schmecken','to taste',['schmecke','schmeckst','schmeckt','schmecken','schmeckt','schmecken'],'Food is the subject: Der Kuchen schmeckt gut.'),
 ('lieben','to love',['liebe','liebst','liebt','lieben','liebt','lieben'],'Ich liebe Schokolade expresses a strong preference.'),
 ('haben','to have',['habe','hast','hat','haben','habt','haben'],'Wir haben keinen Kuchen mehr: we have no cake left.'),
 ('brauchen','to need',['brauche','brauchst','braucht','brauchen','braucht','brauchen'],'Ich brauche keinen Salat uses accusative keinen.'),
]
phrases=[
 ('Ich mag Hamburger.','I like hamburgers.'),('Ich mag keinen Käse.','I do not like cheese.'),('Ich esse gern Fisch.','I like eating fish.'),('Ich trinke gern Tee.','I like drinking tea.'),
 ('Ich auch.','Me too.'),('Ich nicht.','I do not.'),('Ich schon.','I do (contrasting a negative statement).'),('Ich auch nicht.','Me neither.'),
 ('Was isst du gern zum Frühstück?','What do you like eating for breakfast?'),('Zum Frühstück esse ich gern Müsli.','I like eating muesli for breakfast.'),
 ('Guten Appetit!','Enjoy your meal!'),('Hier bitte.','There you are.'),('Sie wünschen?','What would you like?'),('Eine Tasse Kaffee, bitte.','A cup of coffee, please.'),
 ('Ich möchte einen Salat.','I would like a salad.'),('Was nimmst du?','What will you have?'),('Tut mir leid, wir haben keinen Apfelkuchen mehr.','I am sorry, we have no apple cake left.'),
 ('Schade, dann nehme ich einen Nusskuchen.','What a pity, then I will have a nut cake.'),('Nein, danke.','No, thank you.'),('Das schmeckt gut.','That tastes good.'),
]
quiz=[
 ('Du ___ gern Fisch.',['isst','esst','esse'],'isst','Essen changes its vowel with du and er/sie/es: isst.'),
 ('Ich ___ Schokolade.',['mag','magst','mögt'],'mag','Ich and er/sie/es use mag.'),
 ('Ich möchte ___ Salat.',['einen','ein','eine'],'einen','Der Salat becomes einen Salat in the accusative.'),
 ('Ich mag ___ Fleisch.',['kein','keinen','keine'],'kein','Das Fleisch is neuter: kein Fleisch.'),
 ('Ich mag ___ Tomaten.',['keine','kein','keinen'],'keine','Plural negative nouns take keine.'),
 ('Ich mag Tee. You agree.',['Ich auch.','Ich schon.','Ich nicht.'],'Ich auch.','Ich auch agrees with a positive statement.'),
 ('Ich mag keinen Käse. You DO like cheese.',['Ich schon.','Ich auch.','Ich auch nicht.'],'Ich schon.','Ich schon contrasts with the negative statement.'),
 ('die Nuss + der Kuchen = …',['der Nusskuchen','die Nusskuchen','das Nusskuchen'],'der Nusskuchen','The last noun, Kuchen, supplies the article.'),
 ('Was ___ du? (nehmen)',['nimmst','nehmst','nimmt'],'nimmst','Du nimmst changes the stem vowel and drops h.'),
 ('A polite request for coffee now',['Ich möchte einen Kaffee.','Ich mag Kaffee.','Ich trinke gern Kaffee.'],'Ich möchte einen Kaffee.','Möchte expresses the current request; mag expresses a preference.'),
]
unit={'number':9,'summary':'Talk about food preferences, order politely and build compound nouns. Practise mögen, essen, möchten and nehmen, then review Module 3.','words':words,'concepts':concepts,'verbs':[{'verb':v,'meaning':m,'forms':f,'tip':t} for v,m,f,t in verbs],'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words})==len(words)
assert all(w['example'] and w['translation'] for w in words)
(ROOT/'platform/apps/web/generated/lesson-nine-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':9,'words':len(words),'concepts':len(concepts),'verbs':len(verbs),'phrases':len(phrases),'quiz':len(quiz)}))
