FROM node

# for editing remotely
RUN apt-get update -y \
  && apt-get install -yq vim

# env vars
ENV NATS_HOST 0.0.0.0
ENV NATS_PORT 4222
ENV METRICS_HOST 0.0.0.0
ENV METRICS_PORT 4222

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

# build app
RUN npm install -s \
  && npm run -s build

ENTRYPOINT "./bin/run-app"
CMD []
