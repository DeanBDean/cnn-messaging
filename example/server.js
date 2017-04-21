'use strict';

const app = require('http').createServer(handler);
const fs = require('fs');
const Message = require('../index').Message;
const messenger = require('../index').AmqpMessenger({
    amqp: {
        connectionString: 'amqp://localhost:5672',
        exchangeName: 'EXAMPLE_APP'
    },
    http: app
});

messenger.start()
    .then(() => {
        console.log(`Starting on port ${process.env.PORT || 3000}`);
        app.listen(process.env.PORT || 3000);
    });

setInterval(() => {
    messenger.publish('test.message.new', new Message({
        event: {
            some: {
                thing: '123'
            }
        }
    }));
}, 3000);

function handler(req, res) {
    fs.readFile(`${__dirname}/index.html`,
    function (err, data) {
        if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
        }

        res.writeHead(200);
        res.end(data);
    });
}
