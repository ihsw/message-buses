FROM nats-streaming

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

CMD ["-m", "8222", "-sc", "./nss-config"]
