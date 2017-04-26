FROM debian

ENV NSS_VERSION v0.4.0
ENV NSS_ARCH linux-amd64
ENV NSS_FILE nats-streaming-server-${NSS_VERSION}
ENV NSS_ZIPFILE ${NSS_FILE}-${NSS_ARCH}.zip

# deps
RUN apt-get update -y \
  && apt-get install -yq wget unzip

# downloading nss
RUN wget -nv -P /tmp https://github.com/nats-io/nats-streaming-server/releases/download/${NSS_VERSION}/${NSS_ZIPFILE} \
  && unzip /tmp/${NSS_ZIPFILE} -d /usr/local/etc \
  && ln -s /usr/local/etc/${NSS_FILE}-${NSS_ARCH}/${NSS_FILE} /usr/local/bin/nats-streaming-server \
  && nats-streaming-server -v

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

CMD ["nats-streaming-server", "-m", "8222", "-sc", "./nss-config"]
