FROM node

# add app dir
ENV APP_DIR /srv/app
COPY ./app $APP_DIR
WORKDIR $APP_DIR

# build app
RUN npm install -s \
  && npm run -s build

CMD ["node", "."]