const { Kafka } = require('kafkajs');
const { isEmpty } = require('./utils');

let kafka;
let producer;
let config;

exports.register = function () {
  this.init();
};

exports.data = function (next, connection) {
  connection.transaction.parse_body = true;

  next();
};

exports.queue = function (next, connection) {
  const plugin = this;

  producer.connect().then(function () {
    connection.transaction.message_stream.get_data((body) => {
      producer
        .send({
          topic: config.topic,
          messages: [{ value: body }],
        })
        .then(function () {
          producer.disconnect().then(function () {
            return next();
          });
        });
    });
  });
};

exports.init = function () {
  const plugin = this;

  config = this.getConfig();

  kafka = new Kafka(config);

  producer = kafka.producer();

  plugin.register_hook('queue', 'queue');
  plugin.register_hook('data', 'data');
};

exports.getConfig = function () {
  const plugin = this;

  const config = plugin.config.get('kafka.ini');
  const clientConfig = Object.assign({}, config.server);

  clientConfig.brokers = config.brokers.broker.map((broker) => broker);

  if (!isEmpty(config.retry)) {
    clientConfig.retry = Object.assign({}, config.retry);
  }

  if (!isEmpty(config.ssl)) {
    if ('enabled' in config.ssl && config.ssl.enabled) {
      clientConfig.ssl = true;
    } else {
      clientConfig.ssl = Object.assign({}, config.ssl);
    }
  }

  if (!isEmpty(config.sasl)) {
    clientConfig.sasl = Object.assign({}, config.sasl);
  }

  return clientConfig;
};
