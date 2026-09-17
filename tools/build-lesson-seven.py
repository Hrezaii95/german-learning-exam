"""Lesson 7 glossary pp. 9-10 and KB 47-50 / AB 46-49.

Examples, grammar explanations and quizzes are authored learning aids.
Source glossary vocabulary is preserved, including phrases and plural-only nouns.
"""
import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
words = []
with (ROOT / 'research/lesson-expansion/lesson-07-vocabulary.tsv').open(encoding='utf8', newline='') as source:
    for row in csv.DictReader(source, delimiter='\t'):
        slug = row['de'].removeprefix('der ').removeprefix('die ').removeprefix('das ').lower()
        for old, new in [('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss')]:
            slug = slug.replace(old, new)
        words.append({**row, 'id': 'l7-' + re.sub('[^a-z0-9]+', '-', slug).strip('-')})

concepts = [
    {'id': 'l7-koennen', 'title': 'Can: learn the six forms together', 'de': 'kann · kannst · kann · können · könnt · können', 'en': 'Können expresses an ability here. The singular changes ö to a. Ich and er/sie/es have the same form, kann; ich has no -e and er has no -t. The plural keeps ö. Formal Sie uses können.', 'examples': ['Ich kann schwimmen.', 'Er kann gut kochen.', 'Könnt ihr tanzen?'], 'source': 'KB 48; AB 46-48'},
    {'id': 'l7-bracket', 'title': 'Two verbs make a frame', 'de': 'Ich kann [sehr gut] schwimmen.', 'en': 'In a statement, conjugate können in position 2. Put the other verb at the end in its infinitive form, with no zu. With an activity such as Gitarre spielen, spielen closes the frame. Count sentence blocks rather than words.', 'examples': ['Ich kann sehr gut Gitarre spielen.', 'Meine Freundin kann gut Ski fahren.', 'Wir können nicht tanzen.'], 'source': 'KB 48; AB 46-48'},
    {'id': 'l7-questions', 'title': 'Ask about an ability', 'de': 'Kannst du schwimmen? · Was kannst du gut?', 'en': 'For a yes/no question, put können first. For a W-question, put the question phrase first and können second. The activity verb still goes at the end. Wer can be the subject: Wer kann gut kochen?', 'examples': ['Kannst du gut schwimmen?', 'Können Sie Gitarre spielen?', 'Wer kann gut kochen?'], 'source': 'KB 49; AB 48-49'},
    {'id': 'l7-ability', 'title': 'How well? Choose an ability phrase', 'de': 'toll / sehr gut / super · gut · ein bisschen · nicht so gut · gar nicht', 'en': 'Gut describes skill. Gern describes enjoyment. These are different: you can enjoy singing without singing well. Gar nicht means not at all; nicht so gut means not very well.', 'examples': ['Ich kann gut kochen.', 'Ich koche gern.', 'Ich kann gar nicht singen, aber ich singe gern.'], 'source': 'KB 48-50; AB 48'},
    {'id': 'l7-frequency', 'title': 'How often? Keep a different scale', 'de': 'immer → oft → manchmal → nie', 'en': 'Immer means always; oft often; manchmal sometimes; nie never. These describe frequency, not skill. Oft and manchmal do not have fixed percentages. Ask Wie oft …? Keep the conjugated verb in position 2 even when the time word comes first.', 'examples': ['Wie oft spielst du Tennis?', 'Ich spiele manchmal Tennis.', 'Manchmal spiele ich Tennis.'], 'source': 'KB 49-50; AB 49'},
    {'id': 'l7-vowel-change', 'title': 'Three verbs change their vowel', 'de': 'lesen → liest · treffen → triffst · fahren → fährst', 'en': 'The vowel changes only in du and er/sie/es: liest/liest, triffst/trifft, fährst/fährt. Ich and the plural keep the original vowel. After können, use the unchanged infinitive: Du kannst lesen, not Du kannst liest.', 'examples': ['Liest du gern?', 'Er trifft Freunde.', 'Sie fährt Rad.', 'Du kannst gut lesen.'], 'source': 'KB 50; AB 49'},
    {'id': 'l7-compliment', 'title': 'Make and accept a compliment', 'de': 'Du kannst ja / wirklich / aber toll tanzen! → Herzlichen Dank!', 'en': 'Ja and aber can add surprised emphasis in a compliment; they do not mean yes and but in this use. Wirklich means really. Thank the speaker with Oh, danke!, Danke sehr!, Vielen Dank! or Herzlichen Dank!', 'examples': ['Sie können wirklich super tanzen!', 'Du kannst aber gut singen!', 'Herzlichen Dank!'], 'source': 'KB 48; AB 48'},
    {'id': 'l7-all-both', 'title': 'All of us, all three, both', 'de': 'wir alle · alle drei · beide · auch nicht', 'en': 'Alle means all; alle drei all three; beide both. Auch nicht adds a second negative statement: Ich kann auch nicht backen means I cannot bake either.', 'examples': ['Wir können alle drei schwimmen.', 'Wir können beide tanzen.', 'Ich kann auch nicht backen.'], 'source': 'KB 49'},
]
verb_rows = [
    ('können','can / to be able to',['kann','kannst','kann','können','könnt','können'],'The other verb stays in the infinitive at the end, with no zu.'),
    ('lesen','to read',['lese','liest','liest','lesen','lest','lesen'],'e → ie in du and er/sie/es. Du and er have the same form, liest.'),
    ('treffen','to meet',['treffe','triffst','trifft','treffen','trefft','treffen'],'e → i in du and er/sie/es.'),
    ('fahren','to drive / ride',['fahre','fährst','fährt','fahren','fahrt','fahren'],'a → ä in du and er/sie/es. Rad fahren, Ski fahren, Auto fahren.'),
    ('tanzen','to dance',['tanze','tanzt','tanzt','tanzen','tanzt','tanzen'],'After the z sound, du uses -t, not -st.'),
    ('kochen','to cook',['koche','kochst','kocht','kochen','kocht','kochen'],'Ich koche gern expresses enjoyment; ich kann gut kochen expresses ability.'),
    ('singen','to sing',['singe','singst','singt','singen','singt','singen'],'The present-tense vowel stays i.'),
    ('schwimmen','to swim',['schwimme','schwimmst','schwimmt','schwimmen','schwimmt','schwimmen'],'Keep the double m in these forms.'),
    ('fotografieren','to take photographs',['fotografiere','fotografierst','fotografiert','fotografieren','fotografiert','fotografieren'],'Regular -ieren forms.'),
    ('malen','to paint',['male','malst','malt','malen','malt','malen'],'Malen is painting; zeichnen is drawing.'),
    ('backen','to bake',['backe','backst','backt','backen','backt','backen'],'Du bäckst and er/sie/es bäckt are also accepted. After können use backen.'),
    ('reiten','to ride a horse',['reite','reitest','reitet','reiten','reitet','reiten'],'Add the connecting e after t: reitest, reitet.'),
    ('spielen','to play',['spiele','spielst','spielt','spielen','spielt','spielen'],'Fußball spielen, Schach spielen, Gitarre spielen.'),
    ('hören','to hear / listen',['höre','hörst','hört','hören','hört','hören'],'Ich höre Musik. No extra preposition is needed here.'),
    ('lieben','to love',['liebe','liebst','liebt','lieben','liebt','lieben'],'Ich liebe Musik. Ich liebe Schwimmen. Capitalize a verb used as a noun.'),
    ('gehen','to go / walk',['gehe','gehst','geht','gehen','geht','gehen'],'The present tense is regular.'),
    ('surfen','to browse / surf',['surfe','surfst','surft','surfen','surft','surfen'],'For browsing: im Internet surfen.'),
    ('mixen','to mix',['mixe','mixt','mixt','mixen','mixt','mixen'],'After x, du uses -t: du mixt.'),
    ('auflegen','to DJ / put on music',['lege auf','legst auf','legt auf','legen auf','legt auf','legen auf'],'A preview of separable verbs: Ich lege Musik auf. After können it stays together: Ich kann Musik auflegen.'),
    ('zeichnen','to draw',['zeichne','zeichnest','zeichnet','zeichnen','zeichnet','zeichnen'],'The n follows a consonant: du zeichnest, er zeichnet.'),
    ('planen','to plan',['plane','planst','plant','planen','plant','planen'],'Workbook phrase: Wer kann gut planen?'),
    ('schreiben','to write',['schreibe','schreibst','schreibt','schreiben','schreibt','schreiben'],'The present-tense vowel stays ei.'),
    ('kennen','to know / be familiar with',['kenne','kennst','kennt','kennen','kennt','kennen'],'Use kennen for familiarity with people or things: Kennst du die Musik?'),
]
phrases = [
    ('Sie können super tanzen!','You can dance very well!'),
    ('Du kannst ja toll Ski fahren!','You really can ski very well!'),
    ('Herzlichen Dank!','Thank you very much!'),
    ('Oh, danke!','Oh, thank you!'),
    ('Danke sehr!','Thank you very much!'),
    ('Ich kann nicht so gut kochen.','I cannot cook very well.'),
    ('Ich kann gar nicht backen.','I cannot bake at all.'),
    ('Könnt ihr schwimmen?','Can you swim?'),
    ('Wir können alle drei schwimmen.','All three of us can swim.'),
    ('Wir können beide tanzen.','Both of us can dance.'),
    ('Ich kann auch nicht backen.','I cannot bake either.'),
    ('Was sind deine Hobbys?','What are your hobbies?'),
    ('Was machst du gern?','What do you like doing?'),
    ('Was machst du in deiner Freizeit?','What do you do in your free time?'),
    ('Ich lese gern.','I like reading.'),
    ('Ich treffe gern Freunde.','I like meeting friends.'),
    ('Wie oft spielst du Tennis?','How often do you play tennis?'),
    ('Ich spiele manchmal Tennis.','I sometimes play tennis.'),
    ('Das macht Spaß.','That is fun.'),
    ('Mein Hobby ist Musik auflegen und mixen.','My hobby is DJing and mixing music.'),
]
quiz = [
    ('Du ___ gut schwimmen.',['kann','kannst','könnt'],'kannst','Du uses kannst. The activity verb stays schwimmen.'),
    ('Er ___ super tanzen.',['könnt','kann','kannt'],'kann','Ich and er/sie/es share kann. Do not add a t.'),
    ('Which sentence has the correct verb frame?',['Ich kann gut schwimmen.','Ich kann schwimme gut.','Ich gut schwimmen kann.'],'Ich kann gut schwimmen.','Kann is in position 2; schwimmen is the final infinitive.'),
    ('Which is a yes/no question?',['Du kannst kochen?','Kannst du kochen?','Was kannst du kochen?'],'Kannst du kochen?','The standard yes/no pattern starts with the conjugated verb.'),
    ('Ich koche gern means …',['I can cook well.','I like cooking.','I always cook.'],'I like cooking.','Gern expresses enjoyment. Gut expresses skill; immer expresses frequency.'),
    ('Put frequency in descending order.',['immer → oft → manchmal → nie','oft → immer → nie → manchmal','nie → manchmal → oft → immer'],'immer → oft → manchmal → nie','Always, often, sometimes, never. The middle words have no fixed percentage.'),
    ('___ du gern? (lesen)',['Lest','Lesst','Liest'],'Liest','Lesen changes e to ie in du and er/sie/es: liest.'),
    ('Er ___ Freunde.',['trefft','trifft','triffst'],'trifft','Treffen changes e to i: er trifft.'),
    ('Du ___ gern Rad.',['fährst','fahrt','fährt'],'fährst','Fahren changes a to ä in du and er/sie/es: du fährst.'),
    ('Both of us can dance.',['Wir können beide tanzen.','Wir können alle drei tanzen.','Wir kann beide tanzen.'],'Wir können beide tanzen.','Beide means both. Wir takes können.'),
]
unit = {'number':7,'summary':'Talk about hobbies, abilities and frequency. Build sentences with können, give compliments and practise lesen, treffen and fahren.','words':words,'concepts':concepts,'verbs':[{'verb':v,'meaning':m,'forms':f,'tip':t} for v,m,f,t in verb_rows],'phrases':[{'de':d,'en':e} for d,e in phrases],'quiz':[{'q':q,'options':o,'answer':a,'why':w} for q,o,a,w in quiz]}
assert len({w['id'] for w in words}) == len(words)
assert all(w['example'] and w['translation'] for w in words)
(ROOT/'platform/apps/web/generated/lesson-seven-study.json').write_text(json.dumps(unit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'lesson':7,'words':len(words),'concepts':len(concepts),'verbs':len(verb_rows),'phrases':len(phrases),'quiz':len(quiz)}))
