FROM golang

ENV INFLUX_HOST 0.0.0.0
ENV INFLUX_PORT 8086
ENV NATS_HOST 0.0.0.0
ENV NATS_PORT 4222

# add app dir
ENV APP_DIR ./src/influxdb-buffer
COPY . $APP_DIR

# build app
ENV APP_PROJECT influxdb-buffer/app
RUN go get ./src/$APP_PROJECT/... \
  && go install $APP_PROJECT

CMD ["./bin/app"]
