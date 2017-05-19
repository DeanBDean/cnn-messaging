// @flow

import uuidV1 from 'uuid/v1';
import Debug from 'debug';
const debug = Debug('cnn-messaging:message');

const defaults = {
    systemId: 'unknownSystemId',
    environment: 'unknownEnvironment',
    model: 'unknownModel',
    objectId: 'unknownObjectId',
    action: 'unknownAction'
};

type MessageData = {
    id?: string,
    timestamp?: string,
    context: {
        systemId: string,
        environment: string,
        model: string,
        objectId: string | number,
        action: string,
        objectVersion: string | number,
        requestId?: string,
        userId?: string
    },
    event?: any
}

/**
A Message object
*/
export default class Message {
    id: string;
    timestamp: string;
    context: {
        systemId: string;
        environment: string;
        model: string;
        objectId: string | number;
        action: string;
        objectVersion: string | number;
        requestId?: string;
        userId?: string;
    };
    event: any;
    meta: any;

    /**
    create a new instance of Message
    */
    constructor(message: MessageData) {
        debug('new message', message);
        message = message || {context: {}};
        this.context = message.context;
        this.event = message.event;
        this.id = (message.id || uuidV1());
        this.timestamp = (message.timestamp || (new Date()).toISOString());
    }

    /**
    Stringify the message
    */
    toString(): string {
        const shadow = {
            id: this.id,
            timestamp: this.timestamp,
            context: this.context,
            event: this.event
        };
        return JSON.stringify(shadow);
    }

    /**
    Convert the message for websocket delivery
    */
    toWS(): string {
        return this.toString();
    }

    /**
    Convert the message for amqp delivery
    */
    toAmqp(): Buffer {
        return Buffer.from(this.toString());
    }

    /**
    Get the preferred topic name from the message context
    */
    getTopic(): string {
        const topic = [];
        const context = this.context || {};
        topic.push((context.systemId || defaults['systemId']));
        topic.push((context.environment || defaults['environment']));
        topic.push((context.model || defaults['model']));
        topic.push((context.objectId || defaults['objectId']));
        topic.push((context.action || defaults['action']));
        return topic.join('.');
    }

    /**
    Ack a work message (mark it as completed)
    */
    ack(): void {
        if (this.meta && this.meta.rawMessage && this.meta.channel) {
            debug('Ack message', this.meta.rawMessage);
            this.meta.channel.ack(this.meta.rawMessage);
        }
    }

    /**
    Nack a work message (mark it as failed, for redelivery)
    */
    nack(): void {
        if (this.meta && this.meta.rawMessage && this.meta.channel) {
            debug('Nack message', this.meta.rawMessage);
            this.meta.channel.nack(this.meta.rawMessage);
        }
    }

    /**
    Convert a raw amqp message into an instance of Message
    */
    static fromAmqp(rawMessage, channel): Message {
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
