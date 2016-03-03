const superagent = require("superagent");
const extend = require("xtend");
const cheerio = require("cheerio");
const _ = require("underscore");
const request_agent = superagent.agent();

const Constants = require("./Constants");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const Hapi = require('hapi');
const server = new Hapi.Server();

server.connection({port: process.env.PORT || 9000});

const parse = (html, type) => {
    return new Promise((resolve, reject) => {
        var text;
        $ = cheerio.load(html);
        if (type === Constants.TYPE_APP_LIST) {
            text = $('#app_list').text();
        }
        else if (type === Constants.TYPE_APP_DETAIL) {
            text = $('#key_list').text();
        }
        else {
            text = JSON.stringify({"data": "NOT CASE"});
            reject(text);
        }

        resolve(text);
    })

};

const parse_app_detail = _.partial(parse, _, Constants.TYPE_APP_DETAIL);
const parse_app_list = _.partial(parse, _, Constants.TYPE_APP_LIST);

const get = (url) => {
    return new Promise((resolve, reject) => {
        request_agent.get(url).end(function (err, res) {
            err && reject(err) || resolve(res.text);
        });
    });
};


var get_app_list = (request, reply) => {
    get('https://netpie.io/app', Constants.TYPE_APP_LIST)
        .then(parse_app_list)
        .then(JSON.parse)
        .then((json) => {
            return extend({}, {apps: json});
        })
        .then((object) => {
            var tasks = _.collect(object.apps.app, (app) => {
                return get('https://netpie.io/app/' + app.appid, Constants.TYPE_APP_DETAIL);
            });

            return Promise.all(tasks)
        })
        .then((apps) => {
            return new Promise((resolve, reject) => {
                var tasks = _.collect(apps, (content) => {
                    return parse_app_detail(content).then(JSON.parse);
                });
                resolve(tasks);
            });
        })
        .then((tasks) => {
            return Promise.all(tasks);
        })
        .then(JSON.stringify)
        .then(reply);
};

const login = (request, reply) => {
    request_agent.post('https://netpie.io/actions/login')
        .redirects(2)
        .type('form')
        .send(request.params)
        .end(function (err, res) {
            if (err || !res.ok) {
                console.log('Oh no! error', err);
            }
            else {
                request_agent.saveCookies(res);
                get_app_list(request, reply);
            }
        });
};

server.route({
    method: 'GET',
    path: '/api/{username}/{password}',
    config: {
        handler: (request, reply) => {
            login(request, reply, (content) => {
                reply(request.params);
            });
        },
        jsonp: 'callback'
    }
});

server.start(() => {
    console.log("STARTED");
});
