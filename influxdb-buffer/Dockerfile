FROM golang

# add app dir
ENV APP_DIR ./src/influxdb-buffer
COPY . $APP_DIR

# build app
ENV APP_PROJECT influxdb-buffer/app
RUN go get ./src/$APP_PROJECT/... \
  && go install $APP_PROJECT

CMD ["bash"]
