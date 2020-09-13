"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultExchangeName = exports.ExchangeType = exports.NodeType = exports.ErrorType = void 0;
var ErrorType;
(function (ErrorType) {
    ErrorType["INALID_LOGIN"] = "ENOTFOUND";
})(ErrorType = exports.ErrorType || (exports.ErrorType = {}));
var NodeType;
(function (NodeType) {
    NodeType["AMQP_IN"] = "amqp-in";
    NodeType["AMQP_OUT"] = "amqp-out";
    NodeType["AMQP_IN_MANUAL_ACK"] = "amqp-in-manual-ack";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
var ExchangeType;
(function (ExchangeType) {
    ExchangeType["Direct"] = "direct";
    ExchangeType["Fanout"] = "fanout";
    ExchangeType["Topic"] = "topic";
    ExchangeType["Headers"] = "headers";
})(ExchangeType = exports.ExchangeType || (exports.ExchangeType = {}));
var DefaultExchangeName;
(function (DefaultExchangeName) {
    DefaultExchangeName["Direct"] = "amq.direct";
    DefaultExchangeName["Fanout"] = "amq.fanout";
    DefaultExchangeName["Topic"] = "amq.topic";
    DefaultExchangeName["Headers"] = "amq.headers";
})(DefaultExchangeName = exports.DefaultExchangeName || (exports.DefaultExchangeName = {}));
