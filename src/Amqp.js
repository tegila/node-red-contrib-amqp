"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqplib_1 = require("amqplib");
const types_1 = require("./types");
const constants_1 = require("./constants");
class Amqp {
    constructor(RED, node, config) {
        this.RED = RED;
        this.node = node;
        this.config = {
            name: config.name,
            broker: config.broker,
            prefetch: config.prefetch,
            noAck: config.noAck,
            exchange: {
                name: config.exchangeName ||
                    this.determineDefaultExchange(config.exchangeType),
                type: config.exchangeType,
                routingKey: config.exchangeRoutingKey,
                durable: config.exchangeDurable,
            },
            queue: {
                name: config.queueName,
                exclusive: config.queueExclusive,
                durable: config.queueDurable,
                autoDelete: config.queueAutoDelete,
            },
            amqpProperties: this.parseJson(config.amqpProperties),
            headers: this.parseJson(config.headers),
        };
    }
    determineDefaultExchange(exchangeType) {
        switch (exchangeType) {
            case types_1.ExchangeType.Direct:
                return types_1.DefaultExchangeName.Direct;
            case types_1.ExchangeType.Fanout:
                return types_1.DefaultExchangeName.Fanout;
            case types_1.ExchangeType.Topic:
                return types_1.DefaultExchangeName.Topic;
            case types_1.ExchangeType.Headers:
                return types_1.DefaultExchangeName.Headers;
            default:
                return types_1.DefaultExchangeName.Direct;
        }
    }
    async connect() {
        const { broker } = this.config;
        this.broker = this.RED.nodes.getNode(broker);
        const brokerUrl = Amqp.getBrokerUrl(this.broker);
        this.connection = await amqplib_1.connect(brokerUrl, { heartbeat: 2 });
        /* istanbul ignore next */
        this.connection.on('error', () => {
            // If we don't set up this empty event handler
            // node-red crashes with an Unhandled Exception
            // This method allows the exception to be caught
            // by the try/catch blocks in the amqp nodes
        });
        /* istanbul ignore next */
        this.connection.on('close', () => {
            this.node.status(constants_1.NODE_STATUS.Disconnected);
        });
        return this.connection;
    }
    async initialize() {
        await this.createChannel();
        await this.assertExchange();
    }
    async consume() {
        try {
            await this.assertQueue();
            this.bindQueue();
            const { noAck } = this.config;
            await this.channel.consume(this.q.queue, amqpMessage => {
                const msg = this.assembleMessage(amqpMessage);
                this.node.send(msg);
                /* istanbul ignore else */
                if (!noAck && !this.isManualAck()) {
                    this.ack(msg);
                }
            }, { noAck });
        }
        catch (e) {
            this.node.error(`Could not consume message: ${e}`);
        }
    }
    setRoutingKey(newRoutingKey) {
        this.config.exchange.routingKey = newRoutingKey;
    }
    ack(msg) {
        this.channel.ack(msg);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    publish(msg, properties) {
        const { name } = this.config.exchange;
        try {
            this.parseRoutingKeys().forEach(routingKey => {
                this.channel.publish(name, routingKey, Buffer.from(msg), Object.assign(Object.assign({}, this.config.amqpProperties), properties));
            });
        }
        catch (e) {
            this.node.error(`Could not publish message: ${e}`);
        }
    }
    async close() {
        var _a;
        const { name: exchangeName } = this.config.exchange;
        const queueName = (_a = this.q) === null || _a === void 0 ? void 0 : _a.queue;
        try {
            /* istanbul ignore else */
            if (exchangeName && queueName) {
                const routingKeys = this.parseRoutingKeys();
                try {
                    for (let x = 0; x < routingKeys.length; x++) {
                        await this.channel.unbindQueue(queueName, exchangeName, routingKeys[x]);
                    }
                }
                catch (e) {
                    /* istanbul ignore next */
                    console.error('Error unbinding queue: ', e.message);
                }
            }
            await this.channel.close();
            await this.connection.close();
        }
        catch (e) { } // Need to catch here but nothing further is necessary
    }
    async createChannel() {
        const { prefetch } = this.config;
        this.channel = await this.connection.createChannel();
        this.channel.prefetch(Number(prefetch));
        /* istanbul ignore next */
        this.channel.on('error', () => {
            // If we don't set up this empty event handler
            // node-red crashes with an Unhandled Exception
            // This method allows the exception to be caught
            // by the try/catch blocks in the amqp nodes
        });
    }
    async assertExchange() {
        const { name, type, durable } = this.config.exchange;
        /* istanbul ignore else */
        if (name) {
            await this.channel.assertExchange(name, type, {
                durable,
            });
        }
    }
    async assertQueue() {
        const { name, exclusive, durable, autoDelete } = this.config.queue;
        this.q = await this.channel.assertQueue(name, {
            exclusive,
            durable,
            autoDelete,
        });
    }
    async bindQueue() {
        const { name, type } = this.config.exchange;
        if (type === types_1.ExchangeType.Direct || type === types_1.ExchangeType.Topic) {
            /* istanbul ignore else */
            if (name) {
                this.parseRoutingKeys().forEach(async (routingKey) => {
                    await this.channel.bindQueue(this.q.queue, name, routingKey);
                });
            }
        }
        if (type === types_1.ExchangeType.Fanout) {
            await this.channel.bindQueue(this.q.queue, name, '');
        }
        if (type === types_1.ExchangeType.Headers) {
            await this.channel.bindQueue(this.q.queue, name, '', this.config.headers);
        }
    }
    static getBrokerUrl(broker) {
        let url = '';
        if (broker) {
            const { host, port, vhost, tls, credentials: { username, password }, } = broker;
            const protocol = tls ? /* istanbul ignore next */ 'amqps' : 'amqp';
            url = `${protocol}://${username}:${password}@${host}:${port}/${vhost}`;
        }
        return url;
    }
    parseRoutingKeys() {
        const keys = this.config.exchange.routingKey
            .split(',')
            .map(key => key.trim());
        return keys;
    }
    assembleMessage(amqpMessage) {
        const payload = this.parseJson(amqpMessage.content.toString());
        return Object.assign(Object.assign({}, amqpMessage), { payload });
    }
    isManualAck() {
        return this.node.type === types_1.NodeType.AMQP_IN_MANUAL_ACK;
    }
    parseJson(jsonInput) {
        let output;
        try {
            output = JSON.parse(jsonInput);
        }
        catch (_a) {
            output = jsonInput;
        }
        return output;
    }
}
exports.default = Amqp;
