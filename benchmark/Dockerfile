FROM yokogawa/siege

# env vars
ENV TARGET_HOST 0.0.0.0

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

ENTRYPOINT []
CMD ["./bin/run-app"]
