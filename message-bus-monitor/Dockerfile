FROM golang

ENV INFLUX_HOST 0.0.0.0
ENV INFLUX_PORT 8086
ENV NATS_HOST 0.0.0.0
ENV NATS_PORT 8222
ENV RABBIT_HOST 0.0.0.0
ENV RABBIT_PORT 15672

# add app dir
ENV APP_DIR ./src/message-bus-monitor
COPY ./app $APP_DIR

# build app
ENV APP_PROJECT message-bus-monitor
RUN go get ./src/$APP_PROJECT/... \
  && go install $APP_PROJECT

ENTRYPOINT ["./bin/message-bus-monitor"]
