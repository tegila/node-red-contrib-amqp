"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
const types_1 = require("../types");
const Amqp_1 = require("../Amqp");
module.exports = function (RED) {
    function AmqpInManualAck(config) {
        RED.nodes.createNode(this, config);
        this.status(constants_1.NODE_STATUS.Disconnected);
        const amqp = new Amqp_1.default(RED, this, config);
        // So we can use async/await here
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const iife = (async function initializeNode(self, isReconnect = false) {
            try {
                const connection = await amqp.connect();
                // istanbul ignore else
                if (connection) {
                    self.status(constants_1.NODE_STATUS.Connected);
                    await amqp.initialize();
                    await amqp.consume();
                    // We don't want to duplicate these handlers on reconnect
                    if (!isReconnect) {
                        self.on('input', async (msg, send, done) => {
                            amqp.ack(msg);
                            /* istanbul ignore else */
                            if (done) {
                                done();
                            }
                        });
                        // When the server goes down
                        self.on('close', async (done) => {
                            await amqp.close();
                            done();
                        });
                        // When the server goes down
                        connection.on('close', async (e) => {
                            if (e) {
                                const reconnect = () => new Promise(resolve => {
                                    setTimeout(async () => {
                                        try {
                                            await initializeNode(self, true);
                                            resolve();
                                        }
                                        catch (e) {
                                            await reconnect();
                                        }
                                    }, 2000);
                                });
                                await reconnect();
                            }
                        });
                    }
                }
            }
            catch (e) {
                if (isReconnect) {
                    throw e;
                }
                if (e.code === types_1.ErrorType.INALID_LOGIN) {
                    self.status(constants_1.NODE_STATUS.Invalid);
                    self.error(`AmqpInManualAck() Could not connect to broker ${e}`);
                }
                else {
                    self.status(constants_1.NODE_STATUS.Error);
                    self.error(`AmqpInManualAck() ${e}`);
                }
            }
        })(this);
    }
    RED.nodes.registerType(types_1.NodeType.AMQP_IN_MANUAL_ACK, AmqpInManualAck);
};
