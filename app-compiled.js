const superagent = require("superagent");
const extend = require("xtend");
const cheerio = require("cheerio");

const request_agent = superagent.agent();

var Constants = require("./Constants");

//var {
//    TYPE_APP_LIST,
//    TYPE_APP_DETAIL,
//} = Constants;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const Hapi = require('hapi');
const server = new Hapi.Server();

server.connection({ port: process.env.PORT || 9000 });

const login = (request, reply, callback) => {
    request_agent.post('https://netpie.io/actions/login').redirects(5).type('form').send(request.params).end(function (err, res) {
        if (err || !res.ok) {
            console.log('Oh no! error', err);
        } else {
            request_agent.saveCookies(res);
            callback(res.text);
        }
    });
};

var cheer = (content, type, callback) => {
    $ = cheerio.load(content);
    if (type === Constants.TYPE_APP_LIST) {
        var text = $('#app_list').text();

        var j = JSON.parse(text);
        j.app.forEach((v, k) => {
            console.log(">>", v.appid, "<<");
            //cb('https://netpie.io/app/' + v.appid, TYPE_APP_DETAIL);
        });
    } else if (type === Constants.TYPE_APP_DETAIL) {
            var text = $('#key_list').text();
            console.log(text);
            //var j = JSON.parse(text);
            //console.log(j);
        }
};

server.route({
    method: 'POST',
    path: '/api/{username}/{password}',
    config: {
        handler: (request, reply) => {
            console.log(request.params);
            console.log(request.params);
            login(request, reply, content => {
                cheer(content, Constants.TYPE_APP_DETAIL, () => {
                    console.log("CHEER CALLBACK");
                    reply(request.params);
                });
            });
        },
        jsonp: 'callback'
    }
});

server.start(() => {
    console.log("STARTED");
});

//# sourceMappingURL=app-compiled.js.map