#!/bin/bash
export DISCOGS_VIEWER_PATH="/git/music/discogs-nextjs-viewer"

alias discogs-docker-down="cd $DISCOGS_VIEWER_PATH/compose & docker compose --env-file ../.env.local down -v"
alias discogs-docker-build="cd $DISCOGS_VIEWER_PATH/compose & docker compose --env-file ../.env.local build --no-cache"
alias discogs-docker-up="cd $DISCOGS_VIEWER_PATH/compose & docker compose --env-file ../.env.local up -d"

 
function  discogs-docker-redeploy () {
    cd $DISCOGS_VIEWER_PATH/compose
    docker compose --env-file ../.env.local down -v
    sleep 1
    docker compose --env-file ../.env.local build --no-cache
    sleep 1
    docker compose --env-file ../.env.local up -d
    cd -
}
   



   # The Dispatcher
case "$1" in
    discogs-docker-redeploy)
        discogs-docker-redeploy
        ;;
    *)
        echo "Usage: $0 {discogs-docker-redeploy}"
        ;;
esac