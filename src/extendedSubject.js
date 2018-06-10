import { Subject } from 'rxjs';

//Extension of the default Subject that is extremely tightly coupled to the AMQP Messenger
export class ExtendedSubject extends Subject {
  constructor(preservedObservableInputs, topic, type, queue) {
    super();
    this.preservedObservableInputs = preservedObservableInputs;
    this.topic = topic;
    this.type = type;
    this.queue = queue;
  }

  //When we are restarting, we don't want to re-preserve the subscribe inputs, or we get expontentionally
  //more subscriptions per restart. So this method is really the vanilla Subject subscribe, and should
  //really only be used within cnn-messaging
  internalSubscribe(...args) {
    return super.subscribe(...args);
  }
  //Extension of subscribe that preserves the subscribe arguments so that the subscription can be recreated in a restart
  subscribe(...args) {
    this.preservedObservableInputs.forEach(({ topic, type, queue }, index) => {
      if (topic === this.topic && type === this.type && queue === this.queue) {
        this.preservedObservableInputs[index].subscriptions.push(args);
      }
    });
    return super.subscribe(...args);
  }
}

export default ExtendedSubject;
