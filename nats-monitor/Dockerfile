FROM golang

ENV INFLUX_HOST 0.0.0.0
ENV INFLUX_PORT 8086
ENV NATS_HOST 0.0.0.0
ENV NATS_INFO_PORT 8222

# add app dir
ENV APP_DIR ./src/nats-monitor
COPY ./app $APP_DIR

# build app
ENV APP_PROJECT nats-monitor
RUN go get ./src/$APP_PROJECT/... \
  && go install $APP_PROJECT

CMD ["./bin/nats-monitor"]
