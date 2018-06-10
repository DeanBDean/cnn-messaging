import amqplib from 'amqplib';
import { Messenger, states } from './messenger';
import Message from './message';
import { Observable } from 'rxjs';
import Debug from 'debug';
import { ExtendedSubject } from './extendedSubject';
const debug = Debug('cnn-messaging:messenger:amqp');
const restartTimer = 3000;

// A messenger that can use amqp topic exchanges and queues
export class AmqpMessenger extends Messenger {
    // Create a new amqp messenger instance
    constructor(params) {
        super(params);
        this.params = params.amqp;
        this.subjects = [];
        this.preservedObservableInputs = [];
        this.selfCalledClose = false;
        if (!this.params.connectionString || !this.params.exchangeName) {
            throw new Error('Not properly configured for AMQP. See the README.');
        }
    }

    // Generator that iterates attempts to restart the amqp connection
    async * restartIterator() {
        while(true) {
            yield new Promise(async (resolve) => {
                try {
                    await this.start();
                    resolve({ done: true });
                } catch (error) {
                    setTimeout(() => {
                        resolve({ done: false, errorMessage: error.message });
                    }, restartTimer);
                }
            })
        }
    }

    // Reset the observable connections to the preserved observables and subscribes
    async resetConnections() {
        let restartFailed = false;
        try {
            for await (const result of this.restartIterator()) {
                if (result.done) {
                    break;
                }
                console.log(`AMQP connection restart failed: ${result.errorMessage}, attempting again`);
            }
        } catch (error) {
            restartFailed = true;
        }
        if (restartFailed) {
            return Promise.reject(new Error('Could not reset connections'));
        }
        console.log('AMQP connection restarted after connection closed');
        this.preservedObservableInputs.forEach(({unsubscribes}) => {
            if (unsubscribes) {
                unsubscribes.forEach(async (unsubscribe) => {
                    await unsubscribe();
                })
            }
        });
        this.subjects.forEach(({subject}) => {
            subject.unsubscribe();
        })
        this.subjects= [];
        this.preservedObservableInputs.forEach(async ({topic, type, queue, subscriptions, unsubscribes}) => {
            unsubscribes = [];
            const observable = await this._createObservable(topic, type, queue, true);
            if (subscriptions) {
                subscriptions.forEach((args) => {
                    observable.internalSubscribe(...args);
                });
            }
            console.log(`AMQP Observable for topic ${topic}, type ${type} and queue ${queue} successfully restablished`);
        });
        return Promise.resolve();
    }

    // start the service
    async start() {
        if (this.state !== states.stopped) {
            return Promise.reject(new Error(`Cannot start when in state: ${this.state}`));
        }
        this.state = states.starting;
        debug('starting');

        let conn;
        try {
            conn = await amqplib.connect(this.params.connectionString);
        } catch (e) {
            this.state = states.stopped;
            return Promise.reject(e);
        }
        this.connection = conn;
        this.connection.on('error', async (err) => {
            this.state = states.stopped;
            if (err && err.message !== 'Connection closing') {
                console.error('AMQP connection error"', err.message);
            }
            this.subjects.forEach(async ({ subject }) => {
                await subject.error();
            });
            try {
                await this.resetConnections();
            } catch (error) {
                console.error(error.message);
            }
        });
        this.connection.on('close', async () => {
            this.state = states.stopped;
            let subjectHadError = false;
            this.subjects.forEach(async ({ subject }) => {
                if (!subject.hasError) {
                    await subject.complete();
                } else {
                    subjectHadError = true;
                }
            })
            if (!subjectHadError) {
                try {
                    await this.resetConnections();
                } catch (error) {
                    console.error(error.message);
                }
            }
        });
        debug('created connection');

        this.channel = {
            notification: await conn.createChannel(),
            work: await conn.createChannel()
        };
        this.channel.work.prefetch(1, true);
        debug('created channels');

        await this.channel.notification.assertExchange(this.params.exchangeName, 'topic', {durable: true});
        this.state = states.started;
        debug('started');
        return Promise.resolve();
    }

    // stop the service
    async stop() {
        if (this.state !== states.started) {
            return Promise.reject(new Error(`Cannot stop when in state: ${this.state}`));
        }
        this.selfCalledClose = true;
        this.state = states.stopping;
        debug('stopping');

        await this.channel.work.close();
        await this.channel.notification.close();
        debug('closed channels');

        await this.connection.close();
        debug('closed connection');

        this.state = states.stopped;
        debug('stopped');

        return Promise.resolve();
    }

    // publish a message to a topic
    async publish(topicOrMessage, messageOnly) {
        // support old method signature
        const message = messageOnly || topicOrMessage;
        let topic = topicOrMessage;
        if (typeof topicOrMessage !== 'string') {
            topic = message.getTopic();
        }

        debug(`publish to topic: ${topic}, message: ${JSON.stringify(message)}`);
        if (!(message instanceof Message)) {
            return Promise.reject(new Error('provided message is not an instance of Message'));
        }

        return new Promise((resolve, reject) => {
            if (this.channel.notification.publish(this.params.exchangeName, topic, message.toAmqp())) {
                debug('amqp sent message');
                return resolve();
            }
            return reject(new Error('Publish failure. Queue may be full.'));
        });
    }

    // create an observable for a given topic, type, and queue
    async _createObservable(topic, type, queue, recreating = false) {
        let alreadyCreatedIndex = -1;
        this.subjects.forEach((subjectObject, index) => {
            if (subjectObject.topic === topic && subjectObject.type === type) {
                alreadyCreatedIndex = index;
            }
        });
        if (alreadyCreatedIndex !== -1) {
            return this.subjects[alreadyCreatedIndex].subject;
        }

        if (!recreating) {
            this.preservedObservableInputs.push({
                topic,
                type,
                queue,
                subscriptions: [],
                unsubscribes: []
            });
        }
        debug(`creating ${type} observable for topic: ${topic}`);
        let queueparams = {
            durable: false,
            exclusive: true
        };
        let noAck = true;
        if (type === 'work') {
            queueparams = {
                durable: true,
                exclusive: false
            };
            noAck = false;
        }
        debug('creating', type, 'queue with params:', queueparams, 'noAck:', noAck);
        const q = await this.channel[type].assertQueue(queue, queueparams);
        const queueName = q.queue;
        await this.channel[type].bindQueue(queueName, this.params.exchangeName, topic);
        debug(`created ${type} subscription to topic: ${topic}, queue: ${queueName}`);
        const observable = new Observable.create((observer) => {
            let consTag;
            // start consuming from the amqp queue
            this.channel[type].consume(queueName, (msg) => {
                observer.next(Message.fromAmqp(msg, this.channel[type]));
            }, {noAck})
                .then((res) => {
                    consTag = res.consumerTag;
                });

            // return the function that handles unsubscribe here
            return async () => {
                debug(`stop ${type} subscription to ${topic}, queue: ${queueName}`);
                if (type !== 'work') {
                    // unbind the queue from the topic to stop routing at the amqp server
                    await this.channel[type].unbindQueue(queueName, this.params.exchangeName, topic);
                    debug(`unbound queue ${queueName} to topic ${topic}`);
                }
                // stop consuming from the queue
                await this.channel[type].cancel(consTag);
                debug(`stopped receiving new ${type} messages from ${topic}`);
                if (type !== 'work') {
                    // delete queue
                    debug(`deleting queue ${queueName}`);
                    await this.channel[type].deleteQueue(queueName);
                }
                return Promise.resolve();
            };
        });
        const subject = new ExtendedSubject(this.preservedObservableInputs, topic, type, queue);
        observable.subscribe(subject);
        this.subjects.push({
            topic,
            type,
            subject
        })
        return Promise.resolve(subject);
    }

    // create an observable for a given topic, that is meant for multiple recipients per message
    async createNotificationObservable(topic) {
        return this._createObservable(topic, 'notification', '');
    }

    // create an observable for a given topic, that is meant for a single recipient per message
    async createWorkObservable(topic, queue) {
        return this._createObservable(topic, 'work', queue);
    }
}

export default AmqpMessenger;
