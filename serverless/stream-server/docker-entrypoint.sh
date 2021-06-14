#!/bin/bash

set -e

NGINX_TEMPLATE=/etc/nginx/nginx.conf.template
NGINX_CONF=/etc/nginx/nginx.conf 
ENV_OK=0
STUNNEL_IVS=/etc/stunnel/conf.d/ivs.conf

if [ -n "${IVS_KEY}" ]; then
	echo "Ivs activate."
	sed -i 's|#ivs|push '"$IVS_URL"'${IVS_KEY};|g' $NGINX_TEMPLATE
	ENV_OK=1
else 
	sed -i 's|#ivs| |g' $NGINX_TEMPLATE
fi

if [ $ENV_OK -eq 1 ]; then
    envsubst < $NGINX_TEMPLATE > $NGINX_CONF
else 
	echo "Start local server."
fi

if [ -n "${DEBUG}" ]; then 
	echo $NGINX_CONF
	cat $NGINX_CONF
fi

if [ -n "${IVS_INGEST_ENDPOINT}" ]; then
	echo "Ivs ingest endpoint ${IVS_INGEST_ENDPOINT}"
	sed -i 's|connect=|connect='${IVS_INGEST_ENDPOINT}'|g' $STUNNEL_IVS
fi

stunnel4

exec "$@"