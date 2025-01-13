# SUMA - Single-Page-App for Supply Management

SUMA ist eine Single-Page-App für die private Vorratsverwaltung von Artikeln, die eine zeitliche Begrenzung (z.B. Mindesthaltbarkeitsdatum) haben. 

SUMA ist als Webapp vor allem für Mobilgeräte ausgelegt und sollte ohne aufwändlige Einarbeiting verständlich sein.

Technisch basiert die Anwendung auf Node, Express & PUG mit serverseitigem Rendering und ist in Javascript geschrieben. Als Server sind einfache Ein-Platinen-Rechner (ab ca. Raspberry PI 3 oä.) vollkommen ausreichend.

SUMA benutzt den von Node zur Verfügung gestellten Webserver, der auf eine sqlite-Datenbank zugreift. Die Datenbank wird bei der ersten Benutzung angelegt. 

Der Client, auf dem die Single-Page-App läuft, kann ein beliebiges Gerät mit ausreichend modernen Browser sein: Smartphone, Tablet, E-Reader, Desktop- oder Laptop-PC. 

Die Sprache der Oberfläche ist zurzeit ausschließlich Deutsch.

Am besten das Docker-Image verwenden: bluerai72/suma
