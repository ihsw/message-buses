FROM telegraf

# env vars
ENV INFLUXDB_HOST 0.0.0.0
ENV TELEGRAF_AGENT_HOSTNAME telegraf-collector

# add config
COPY ./app/telegraf.conf /etc/telegraf/telegraf.conf
