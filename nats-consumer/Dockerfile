FROM node

# env vars
ENV NATS_HOST 0.0.0.0
ENV NATS_PORT 4222
ENV APP_PORT 80

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

# build app
RUN npm install -s \
  && npm run -s build

CMD ["./bin/run-app"]
