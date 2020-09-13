"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = function (RED) {
    function AmqpBroker(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.host = n.host;
        this.port = n.port;
        this.tls = n.tls;
        this.vhost = n.vhost;
    }
    RED.nodes.registerType('amqp-broker', AmqpBroker, {
        credentials: {
            username: { type: 'text' },
            password: { type: 'password' },
        },
    });
};
