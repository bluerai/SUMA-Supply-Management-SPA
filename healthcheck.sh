

exitcode1=1

# Prüfen, ob HTTPS_PORT gesetzt ist und größer als 0
if [ -n "${HTTPS_PORT}" ] && [ "${HTTPS_PORT}" -gt 0 ]; then
  curl -k https://localhost:${HTTPS_PORT}/api/health/
  exitcode1=$? 
fi

exitcode2=1

# Prüfen, ob HTTP_PORT gesetzt ist und größer als 0
if [ -n "${HTTP_PORT}" ] && [ "${HTTP_PORT}" -gt 0 ]; then
  curl http://localhost:${HTTP_PORT}/api/health/
  exitcode2=$? 
fi

# Prüfen, ob mindestens eine der Anfragen erfolgreich war
if [ "$exitcode1" -eq 0 ] && [ "$exitcode2" -eq 0 ]; then
    exit 0  # Erfolg
else
    # Fehler, wenn ein Zugriff fehlschlägt
    /usr/bin/curl -s \
      --form-string token=a27uin11xt17yh7ajcdmwseaqzniqd \
      --form-string user=gzite2i9ix6e495buees1wcus5cvbi \
      --form-string title=Fataler\ Fehler \
      --form-string priority=1 \
      --form-string sound=pushover \
      --form-string message="SUMA: Server nicht verfuegbar." \
      https://api.pushover.net/1/messages.json

    exit 1 
fi