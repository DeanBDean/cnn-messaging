<!-- Generated by documentation.js. Update this documentation by updating the source code. -->

### Table of Contents

-   [AmqpMessenger][1]
    -   [start][2]
    -   [stop][3]
    -   [publish][4]
    -   [\_createObservable][5]
    -   [createNotificationObservable][6]
    -   [createWorkObservable][7]
-   [Message][8]
    -   [toString][9]
    -   [toWS][10]
    -   [toAmqp][11]
    -   [getTopic][12]
    -   [ack][13]
    -   [nack][14]
    -   [fromAmqp][15]
-   [Messenger][16]
    -   [start][17]
    -   [stop][18]
    -   [publish][19]
    -   [createNotificationObservable][20]
    -   [createWorkObservable][21]
-   [WebsocketRelay][22]

## AmqpMessenger

**Extends Messenger**

A messenger that can use amqp topic exchanges and queues

**Parameters**

-   `params` **{amqp: {connectionString: [string][23], exchangeName: [string][23]}, port: [number][24]?, http&#x3A; any?, websocketActive: [boolean][25]?}** 

### start

start the service

Returns **[Promise][26]&lt;any>** 

### stop

stop the service

Returns **[Promise][26]&lt;any>** 

### publish

publish a message to a topic

**Parameters**

-   `topicOrMessage` **any** 
-   `messageOnly` **[Message][27]** 

Returns **[Promise][26]&lt;any>** 

### \_createObservable

create an observable for a given topic, type, and queue

**Parameters**

-   `topic` **[string][23]** 
-   `type` **[string][23]** 
-   `queue` **[string][23]** 

Returns **[Promise][26]&lt;Rx.Observable&lt;any>>** 

### createNotificationObservable

create an observable for a given topic, that is meant for multiple recipients per message

**Parameters**

-   `topic` **[string][23]** 

Returns **[Promise][26]&lt;Rx.Observable&lt;any>>** 

### createWorkObservable

create an observable for a given topic, that is meant for a single recipient per message

**Parameters**

-   `topic` **[string][23]** 
-   `queue` **[string][23]** 

Returns **[Promise][26]&lt;Rx.Observable&lt;any>>** 

## Message

A Message object

**Parameters**

-   `message` **MessageData** 

### toString

Stringify the message

Returns **[string][23]** 

### toWS

Convert the message for websocket delivery

Returns **[string][23]** 

### toAmqp

Convert the message for amqp delivery

Returns **[Buffer][28]** 

### getTopic

Get the preferred topic name from the message context

Returns **[string][23]** 

### ack

Ack a work message (mark it as completed)

Returns **void** 

### nack

Nack a work message (mark it as failed, for redelivery)

Returns **void** 

### fromAmqp

Convert a raw amqp message into an instance of Message

**Parameters**

-   `rawMessage`  
-   `channel`  

Returns **[Message][27]** 

## Messenger

**Extends events.EventEmitter**

An in-memory messenger, providing pub/sub like features

**Parameters**

-   `params` **{port: [number][24]?, http&#x3A; any?, websocketActive: [boolean][25]?}** 

### start

start the service

Returns **[Promise][26]&lt;any>** 

### stop

stop the service

Returns **[Promise][26]&lt;any>** 

### publish

publish a message to a topic

**Parameters**

-   `topicOrMessage` **any** 
-   `messageOnly` **[Message][27]** 

Returns **[Promise][26]&lt;any>** 

### createNotificationObservable

create an observable for a given topic, that is meant for multiple recipients per message

**Parameters**

-   `topic` **[string][23]** 

Returns **[Promise][26]&lt;Rx.Observable&lt;any>>** 

### createWorkObservable

create an observable for a given topic, that is meant for a single recipient per message

**Parameters**

-   `topic` **[string][23]** 
-   `sharedQueue` **[string][23]** 

Returns **[Promise][26]&lt;Rx.Observable&lt;any>>** 

## WebsocketRelay

**Extends events.EventEmitter**

A performant websocket relay for messenger

**Parameters**

-   `params` **{messenger: [Messenger][29], port: [number][24]?, http&#x3A; any?, pingInterval: [number][24]}** 

[1]: #amqpmessenger

[2]: #start

[3]: #stop

[4]: #publish

[5]: #_createobservable

[6]: #createnotificationobservable

[7]: #createworkobservable

[8]: #message

[9]: #tostring

[10]: #tows

[11]: #toamqp

[12]: #gettopic

[13]: #ack

[14]: #nack

[15]: #fromamqp

[16]: #messenger

[17]: #start-1

[18]: #stop-1

[19]: #publish-1

[20]: #createnotificationobservable-1

[21]: #createworkobservable-1

[22]: #websocketrelay

[23]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[24]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number

[25]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[26]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise

[27]: #message

[28]: https://nodejs.org/api/buffer.html

[29]: #messenger
