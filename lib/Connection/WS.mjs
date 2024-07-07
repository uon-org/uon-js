#!/usr/bin/env node

import {createServer as createHttpsServer} from 'https';
import {createServer as createHttpServer} from 'http';
import {WebSocket, WebSocketServer} from 'ws';

import {readFileSync} from 'fs';
import readline from 'readline';
import json5 from 'json5';

import {ConnectionWSBase} from './WSBase.mjs';
import {Listener, proxify} from '../Connection.mjs';

import {say, dbg, classof} from '../util.mjs';

export {proxify};

export class ConnectionWS extends ConnectionWSBase {
    constructor(opt)
    {
        opt ||= {};
        super(opt);

        let ws = opt.ws;

        if(!ws) {
            if(!opt.url) throw "No URL specified";

            ws = new WebSocket(opt.url, {
                ca: readFileSync("../CERTS/ca.crt.pem"),
                checkServerIdentity: (host, cert) => {
                    if(host == 'localhost') return null;
                    return tls.checkServerIdentity(host, cert);
                },
            });
        }

        this.establish(ws, {
            connectingSide: !opt.ws,
            object: opt.object,
            protoClass: opt.protoClass,
        });
    }
}

export class ListenerWS extends Listener {
    constructor(opt)
    {
        super();

        opt ||= {};

        if(!opt.protoClass) throw `No protoClass specified`;

        this.protoClass  = opt.protoClass;
        this.object      = opt.object;
        this.connections = new Set();

        if(opt.useTLS)
            this.server = createHttpsServer(opt.serverOptions);
        else
            this.server = createHttpServer(opt.serverOptions);

        this.wss = new WebSocketServer({server: this.server});

        this.wss.on('connection', ws => {
            let con = new ConnectionWS({
                ws: ws,
                protoClass: this.protoClass,
                object: this.object,
            });
            this.connections.add(con);

            con.on('open', obj => this.emit('open', obj, con));
        });
    }

    listen(port) { this.server.listen(port); }
}
