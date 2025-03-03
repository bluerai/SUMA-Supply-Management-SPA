# SUMA - Single-Page-App for Supply Management

SUMA ist eine Single-Page-App für die Vorratsverwaltung von Artikeln, die eine zeitliche Begrenzung (z.B. Mindesthaltbarkeitsdatum) haben. SUMA ist als Webapp vor allem für Mobilgeräte ausgelegt und sollte ohne aufwändige Einarbeitung verständlich sein. Der Client, auf dem die Single-Page-App läuft, kann ein beliebiges Gerät mit ausreichend modernen Browser sein: Smartphone, Tablet, E-Reader, Desktop- oder Laptop-PC.

Die Anwendung wurde als Proof-Of-Concept für eine Lösung mit serverseitigem Rendering unter Verwendung von npm-Paketen entwickelt.

Im Einzelnen basiert die Anwendung auf Node, Express & PUG und ist in "Vanilla"-Javascript geschrieben. SUMA benutzt den von Node zur Verfügung gestellten Webserver, der auf eine sqlite-Datenbank zugreift. Es wird das in Node seit Version 22 integrierte sqlite-Modul verwendet. Die Datenbank wird bei der ersten Benutzung angelegt.

Als Server sind einfache Ein-Platinen-Rechner (ab ca. Raspberry PI 3 oä.) vollkommen ausreichend.

Die Sprache der Oberfläche ist zurzeit ausschließlich Deutsch.

Am besten das Docker-Image verwenden: bluerai72/suma auf DockerHub.


# Installation 


1. Erstelle ein Verzeichnis <YOUR_SUMA>, in dem die SUMA-Datenbank erstellt werden soll.

2. (optional) Falls automatische Backups der SUMA-Datenbank erstellt werden sollen, erstelle ein Verzeichnis <YOUR_SUMA>/backup.

3. (optional) Erstelle in <YOUR_SUMA> ein Verzeichnis config für Konfigurationsdateien. Die Konfigurationdateien sind optional. Falls sie nicht verhanden sind stehen bestimmte Eigenschaften des SUMA-Server eben nicht zur Verfügung.


## 3.1 (optional) HTTPS-Server
Falls ein HTTPS-Server aktiviert werden soll, stelle die Zertifikats-Dateien in das Verzeichnis  
<YOUR_SUMA>/config.
Für einen lokalen Server kannst du selbstsignierte Zertifikate erstellen. Gehe in das Verzeichnis <YOUR_SUMA>/config und führe den folgenden Befehl aus:

openssl req -nodes -new -x509 -keyout key.pem -out cert.pem

Es werden in <YOUR_SUMA>/config die Dateien key.pem und cert.pem erstellt.


## 3.2 (optional) Authentifizierung
Eine tokenbasierte Anmeldung mit Hilfe von JWT ist implementiert. Die Angeban in der Konfigurationsdatei jwt.json werden zum Erstellen eines Token benötigt. Der Token wird vom Browser zum Server gesendet und identifiziert den Klient.

Erstelle in <YOUR_SUMA>/config eine Datei jwt.json mit einem JSON-Objekt nach folgenden Muster:
```
{
  "key": ".....",  
  "duration": "10000h",           
  "credentials": {
    "terra":   "...  Passwort1  ... ",
    "mars":    "...  Passwort2  ... ",
    "jupiter": "...  Passwort3  ... ",
	usw.    
  }
}
```


key = beliebige Zeichenfolge, die zur Verschlüsselung des Token verwendet wird. Wenn sie geändert wird, verlieren alle damit erzeugten Token ihre Gültigkeit.

duration = Gültigkeitsdauer des Tokens

credentials = Paare vom Usernamen und Passwörtern


## 3.3 (optional) Messaging mit Pushover

Lege auf der Seite https://pushover.net einen Account an. Generiere dort ein Anwendungstoken und ein User-Token. Erstelle die Datei pushover.json in <YOUR_SUMA>/config in mit dem Inhalt:
```
{
  "url": "https://api.pushover.net/1/messages.json",
  "token": "... Anwendungstoken ...",
  "user": "... User Token ..."
}
```

url = URL der Pushover-API (Falls eine andere gültig werden sollte, kann das hier angepasst werden.)

token = Anwerndungstoken

user = User Token

Damit man Pushover nutzen kann, benötigt man eine entsprechende App. Die ist zu einem sehr moderaten Preis in den AppStzores zu erhalten. Näheres unter https://pushover.net


# Docker CLI

```
docker run -d \
    --name suma \
    -p <Your Http-Port>:80 \
    -p <Your Https-Port>:443 \
    -e TZ=<Your Timezone> \
    -e KEYFILE=<Your Key file> \
    -e CERTFILE=<Your Cert file> \
    --mount type=bind,source=<Your SUMA>,target=/home/node/data  \
    --restart=on-failure:3 \
    raiblue72/suma:<Your Tag>
```

 Wenn der Http-Port oder Https-Port von den Standardwerten (80 bzw. 443) abweicht, kann hier jeweils der zutreffende PORT angegeben werden. 

 Die optionalen Einträge KEYFILE und CERTFILE enthalten nur die Dateinamen, also z.B. "key.pem" und "cert.pem". Die Dateien liegen in dem Verzeichnis <YOUR_SUMA>/config 
