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
                checkServerIdentity: (host, cert) => {
                    if(host == 'localhost') return null;
                    return tls.checkServerIdentity(host, cert);
                },

                ...this.wsOpts,
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
        this.auth        = opt.auth || [];

        const serverOptions   = {...opt.serverOptions};
        serverOptions.ca    ||= [];

        for(const a of this.auth)
            if(a.wsSetServerOptions) a.wsSetServerOptions(serverOptions);

        if(opt.useTLS)
            this.server = createHttpsServer(serverOptions);
        else
            this.server = createHttpServer(serverOptions);

        this.wss = new WebSocketServer({
            server: this.server,
            verifyClient: serverOptions.verifyClient,
        });

        this.wss.on('connection', (ws, req) => {
            // Hack; fix to use given preauth to find this
            const cert    = req.socket.getPeerCertificate();
            const preAuth = !!req.client.authorized;

            let con = new ConnectionWS({
                ws: ws,
                protoClass: this.protoClass,
                object: this.object,
                auth: [...this.auth],
                preAuth: (preAuth && cert) ? cert.subject.CN : undefined,
            });
            this.connections.add(con);

            con.on('open', obj => this.emit('open', obj, con));
        });
    }

    listen(port) { this.server.listen(port); }
}
