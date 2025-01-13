# SUMA - Single-Page-App for Supply Management

SUMA ist eine Single-Page-App für die Vorratsverwaltung von Artikeln, die eine zeitliche Begrenzung (z.B. Mindesthaltbarkeitsdatum) haben. SUMA ist als Webapp vor allem für Mobilgeräte ausgelegt und sollte ohne aufwändige Einarbeitung verständlich sein. Der Client, auf dem die Single-Page-App läuft, kann ein beliebiges Gerät mit ausreichend modernen Browser sein: Smartphone, Tablet, E-Reader, Desktop- oder Laptop-PC.

Die Anwendung wurde als Proof-Of-Concept für eine Lösung mit serverseitigem Rendering unter Verwendung von npm-Paketen entwickelt.

Im Einzelnen basiert die Anwendung auf Node, Express & PUG und ist in "Vanilla"-Javascript geschrieben. SUMA benutzt den von Node zur Verfügung gestellten Webserver, der auf eine sqlite-Datenbank zugreift. Es wird das in Node seit Version 22 integrierte sqlite-Modul verwendet. Die Datenbank wird bei der ersten Benutzung angelegt.

Als Server sind einfache Ein-Platinen-Rechner (ab ca. Raspberry PI 3 oä.) vollkommen ausreichend.

Die Sprache der Oberfläche ist zurzeit ausschließlich Deutsch.

Am besten das Docker-Image verwenden: bluerai72/suma
