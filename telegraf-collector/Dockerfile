FROM telegraf

# env vars
ENV INFLUXDB_HOST 0.0.0.0

# add config
COPY ./app/telegraf.conf /etc/telegraf/telegraf.conf

CMD ["bash"]