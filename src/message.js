import uuidV1 from 'uuid/v1';
import Debug from 'debug';
const debug = Debug('cnn-messaging:message');

// allowed actions
const actions = ['create', 'update', 'delete', 'upsert', 'event', 'error'];

// map older actions to allowed actions
const actionsMap = {
    new: 'create',
    insert: 'create',
    remove: 'delete',
    change: 'update'
};

const defaults = {
    systemId: 'unknownSystemId',
    environment: 'unknownEnvironment',
    model: 'unknownModel',
    objectId: 'unknownObjectId',
    action: 'event'
};

// sample message data
// context.systemId, context.environment, context.model, context.objectId, context.action
export const sampleMessageData = {
    id: null,
    timestamp: null,
    context: {
        systemId: null,
        environment: null,
        model: null,
        objectId: null,
        action: null,
        objectVersion: null,
        requestId: null,
        userId: null
    },
    event: null
}

// A Message object
export class Message {
    // create a new instance of Message
    constructor(message = {}) {
        debug('new message', message);
        message.context = message.context || defaults;
        this.context = message.context;
        if (actions.indexOf(this.context.action) < 0 && actionsMap[this.context.action]) {
            this.context.action = actionsMap[this.context.action];
        }
        if (!this.context.action || actions.indexOf(this.context.action) < 0) {
            debug(`Use of deprecated action "${this.context.action}" in Message Context.`);
            this.context.action = 'event';
        }
        this.event = message.event;
        this.id = (message.id || uuidV1());
        this.timestamp = (message.timestamp || (new Date()).toISOString());
    }

    // Stringify the message
    toString() {
        const shadow = {
            id: this.id,
            timestamp: this.timestamp,
            context: this.context,
            event: this.event
        };
        return JSON.stringify(shadow);
    }

    // Convert the message for websocket delivery
    toWS() {
        return this.toString();
    }


    // Convert the message for amqp delivery
    toAmqp() {
        return new Buffer(this.toString());
    }


    // Get the preferred topic name from the message context
    getTopic() {
        const topic = [];
        const context = this.context || {};
        topic.push((context.systemId || defaults['systemId']));
        topic.push((context.environment || defaults['environment']));
        topic.push((context.model || defaults['model']));
        topic.push((context.objectId || defaults['objectId']));
        topic.push((context.action || defaults['action']));
        return topic.join('.');
    }


    // Ack a work message (mark it as completed)
    ack() {
        if (this.meta && this.meta.rawMessage && this.meta.channel) {
            debug('Ack message', this.meta.rawMessage);
            this.meta.channel.ack(this.meta.rawMessage);
        }
    }


    // Nack a work message (mark it as failed, for redelivery)
    nack() {
        if (this.meta && this.meta.rawMessage && this.meta.channel) {
            debug('Nack message', this.meta.rawMessage);
            this.meta.channel.nack(this.meta.rawMessage);
        }
    }


    // Convert a raw amqp message into an instance of Message
    static fromAmqp(rawMessage, channel) {
        debug(`from amqp: ${JSON.stringify(rawMessage)}`);
        const messageString = rawMessage.content.toString();
        const messageObject = JSON.parse(messageString);
        const message = new Message(messageObject);
        message.meta = {
            rawMessage,
            channel
        };
        return message;
    }
}

export default Message;
