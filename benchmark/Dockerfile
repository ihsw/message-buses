FROM yokogawa/siege

CMD apt-get update -y \
  apt-get install -yq vim

# env vars
ENV TARGET_HOST 0.0.0.0

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

ENTRYPOINT []
CMD ["./bin/run-app"]
