FROM telegraf

# env vars
ENV INFLUXDB_HOST 0.0.0.0
ENV GROUP_NAME telegraf-collector-standalone

# add config
COPY ./app/telegraf.conf /etc/telegraf/telegraf.conf
