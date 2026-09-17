"""Checked AB source transcript projection, pp. 7-10, tracks 1/48-62.

Join broken PDF word wraps; preserve speaker turns and publisher wording.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows={
48:([7],"""Mann|Was kann ich für Sie tun?
Frau|Ich suche einen Sessel.
Mann|Schauen Sie doch mal. Der Sessel ist doch schön.
Frau|Ja, das finde ich auch. Er ist wirklich schön. Wie viel kostet er denn?
Mann|Sie haben Glück. Er kostet nur 40 Euro. Das ist ein Sonderangebot.
Frau|Oh, das ist aber günstig."""),
49:([7],"""Mann|Hören Sie und sprechen Sie nach. Beispiel:
Frau|Firma Brenner. Guten Tag. Hier ist Christian Schmidt.
Mann|Firma Brenner. Guten Tag. Hier ist Christian Schmidt.
Mann|Und jetzt Sie:
Frau|Guten Tag. Hier ist Marlene Neumann.
Frau|Hallo, hier ist Marlene.
Frau|Auf Wiedersehen.
Frau|Auf Wiederhören.
Frau|Tschüs."""),
50:([8],"""Mann|Antworten Sie mit nein.
Frau|Ist das ein Kugelschreiber? – Bleistift
Mann|Nein, das ist kein Kugelschreiber. Das ist ein Bleistift.
Mann|Und jetzt Sie:
Frau|Ist das ein Feuerzeug? – Streichholz
Mann|Nein, das ist kein Feuerzeug. Das ist ein Streichholz.
Frau|Ist das ein Stuhl? – Sessel
Mann|Nein, das ist kein Stuhl. Das ist ein Sessel.
Frau|Ist das eine Tasche? – Geldbörse
Mann|Nein, das ist keine Tasche. Das ist eine Geldbörse.
Frau|Ist das ein Tisch? – Bett
Mann|Nein, das ist kein Tisch. Das ist ein Bett."""),
51:([8],"""Mann|Hören Sie die Sätze und antworten Sie. Beispiel:
Frau|Hier ist die Rechnung.
Mann|Danke. Ich brauche keine Rechnung.
Frau|Ach, Sie brauchen keine Rechnung.
Mann|Und jetzt Sie:
Frau|Hier ist der Kalender.
Mann|Ach, Sie brauchen keinen Kalender.
Frau|Hier ist das Notizbuch.
Mann|Ach, Sie brauchen kein Notizbuch.
Frau|Hier ist der Laptop.
Mann|Ach, Sie brauchen keinen Laptop.
Frau|Hier ist das Formular.
Mann|Ach, Sie brauchen kein Formular.
Frau|Hier ist die Maus.
Mann|Ach, Sie brauchen keine Maus.
Frau|Hier ist das Handy.
Mann|Ach, Sie brauchen kein Handy.
Frau|Hier ist der Kugelschreiber.
Mann|Ach, Sie brauchen keinen Kugelschreiber."""),
52:([8],"""|Möbel XXX! Ihre Möbel sehr günstig! Die Sonderangebote von heute: Tisch, aus Holz, braun: nur 56 Euro! Stuhl, aus Plastik, grün: nur 10 Euro. Regal aus Metall, schwarz, nur 23 Euro. Nur heute. Nur bei Möbel XXX in Pleinzberg."""),
53:([8],"""|Hallo Michi. Ich bin gerade im Möbelhaus. Du, hier ist ein Sessel. Ich finde ihn super schön und sehr modern. Er ist blau und nicht zu groß. Du findest Blau doch auch gut, oder? Das Problem ist: Er ist nicht günstig. Ruf mich bitte an."""),
54:([8],"""|Sandra, hier ist Ingo. Wo bist du denn? Ich bin jetzt im Büro, aber du bist nicht hier. Wir haben doch einen Termin! Also, ich habe jetzt Hunger und brauche einen Kaffee. Ich bin dann im Café Schön und arbeite mit dem Laptop. Kommst du? Bitte melde dich."""),
55:([9],"""Frau|Hallo Jan! Bei Fischer-Computer gibt es tolle Sonderangebote! Und sehr günstig! Tablets, Handys, Laptops … Wie viel Geld haben wir?
Mann|Sylvia! Wir brauchen kein Tablet, kein Handy und auch keinen Laptop. Wir brauchen nur eine Maus. Bitte kauf nur eine Maus."""),
56:([9],"""|Sonderangebote bei Computer Hansen: Maus, Computec, rot und schwarz, nur 7,99 Euro; Tablet, Hangwei, nur 149 Euro, Drucker, Conan, nur 179,99 Euro. Supergünstig! Nur bei Computer Hansen!"""),
57:([9],"""|Hallo Valentin, hier ist Rita. Du, ich komme nicht ins WLAN. Der Computer sagt: Mein Passwort ist falsch. Aber es ist doch neu. Wo bist du denn? Ich habe um 15 Uhr einen Termin und brauche meine E-Mails. Bitte komm jetzt!"""),
58:([9],"""|Hallo Markus! Hier ist Anja. Und hier ist mein Rätsel. Also: Ich sehe etwas. Was ist das? Es ist klein. Es ist aus Papier. Da ist mein Vorname, mein Familienname und mein Beruf."""),
59:([9],"""Frau|Bürohaus Hansen. Leider sind wir im Moment nicht da. Bitte sprechen Sie nach dem Ton.
Mann|Guten Tag, hier ist Erwin Los von der Firma Huber. Ich möchte etwas bestellen: Wir brauchen dreiundzwanzig neue Bürostühle. Modell XXLdreizehneinundfünfzig. Fünfzehn in blau und acht in grau. Und vielleicht auch einen Tisch, vielleicht in braun. Was haben Sie denn da? Meine Telefonnummer ist 03276 …"""),
60:([9],"""|Kerner AG. Hier ist Martin Holz.
|Guten Tag! Was kann ich für Sie tun?
|Einen Moment bitte. … Nein, Frau Müller ist leider nicht da.
|Sehr gern. Auf Wiederhören!"""),
61:([9],"""Peter|B&K Versicherungen, Peter Flemming, guten Tag. Was kann ich für Sie tun?
Svenja|Guten Tag, mein Name ist Svenja Hofert von eco-Office. Ist Frau Krämer da?
Peter|Einen Moment bitte. Ich verbinde. ... Hören Sie? Frau Krämer spricht gerade.
Svenja|Danke. Ich rufe später wieder an. Auf Wiederhören.
Peter|Auf Wiederhören.
Peter|B&K Versicherungen. Peter Flemming. Guten Tag.
Svenja|Svenja Hofert hier.
Peter|Guten Tag, Frau Hofert. Ich verbinde. … Es tut mir leid. Frau Krämer ist gerade nicht am Platz. Sie ruft Sie zurück.
Svenja|Nein danke, ich rufe später wieder an. Auf Wiederhören.
Peter|Auf Wiederhören.
Peter|B&K Versicherungen. Peter Flemming.
Svenja|Svenja Hofert nochmal. Ist Frau Krämer da?
Peter|Ja, Frau Krämer ist da. Einen Moment. Ich verbinde.
Fr. Krämer|Krämer.
Svenja|Guten Morgen, Frau Krämer. Svenja Hofert von eco-Office hier. Vielen Dank für die Bestellung."""),
62:([9,10],"""Fr. Krämer|Krämer.
Svenja|Guten Morgen, Frau Krämer. Svenja Hofert von eco-Office hier. Vielen Dank für die Bestellung. … Ist das richtig? ... Sie brauchen 2577 Bleistifte?
Fr. Krämer|Oh, nein! Wir brauchen nur 25 Bleistifte.
Svenja|Okay. Und wie viele Notizbücher brauchen Sie? Hundertfünfzig?
Fr. Krämer|Nein, nein das ist auch falsch. Wir brauchen nur 15 Notizbücher.
Svenja|Gut, 15 Notizbücher ... aus Holz, Farbe braun.
Fr. Krämer|Braun? Nein! Wir brauchen rote Notizbücher.
Svenja|Ja, kein Problem. Dann habe ich jetzt: 25 Bleistifte, 50 Kugelschreiber, 15 rote Notizbücher und 20 Mappen.
Fr. Krämer|Ja, genau. Das ist richtig. Die Mappen sind schwarz, oder?
Svenja|Ja. Sie sind schwarz.
Fr. Krämer|Sehr gut.
Svenja|Okay. Dann ist alles klar. Auf Wiederhören, Frau Krämer.
Fr. Krämer|Auf Wiederhören und noch mal vielen Dank, Frau Hofert."""),
}
data={f'1_{n:02}':{'sourcePages':pages,'lines':[{'speaker':s or None,'text':t} for s,t in (line.split('|',1) for line in text.splitlines())]} for n,(pages,text) in rows.items()}
(ROOT/'research/lesson-expansion/module2-workbook-transcripts.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(f'{len(data)} source transcripts projected')
