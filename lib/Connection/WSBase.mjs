import json5 from 'json5';

import {Connection} from '../Connection.mjs';
import {dbg, say} from '../util.mjs';

export class ConnectionWSBase extends Connection {
    static ID = 0;

    constructor(opt)
    {
        opt ||= {};

        super(opt);

        this.id      = ++ConnectionWSBase.ID;
        this.req     = 0;
        this.pm      = {};
        this.auth    = {};
        this.preAuth = opt.preAuth;
        this.wsOpts  = opt.wsOpts || {};

        for(const a of opt.auth) {
            if(this.auth[a.type()]) throw `Multiple auth given of the same type: '${a.type()}'`;
            this.auth[a.type()] = a;

            if(a.wsSetClientOptions) a.wsSetClientOptions(this.wsOpts);
        }
    }

    establish(ws, opt)
    {
        this.side   = opt.connectingSide ? 'c' : 'l';
        this.object = opt.object;
        this.proto  = new opt.protoClass(this, this.object);

        this.earlyRecv = (this.side == 'l') ? (e) => this.earlyRecvL(json5.parse(e.data))
                                            : (e) => this.earlyRecvC(json5.parse(e.data));

        ws.addEventListener('error', console.error);
        ws.addEventListener('open', async () => {});
        ws.addEventListener('message', this.earlyRecv);
        ws.addEventListener('close', () => {
            this.proto.close();
            this.emit('close');
        });

        this.ws = ws;

        if(this.side == 'l') this.negotiate();
    }

    earlySend(data)
    {
        dbg("earlySend", data);
        this.ws.send(json5.stringify(data));
    }

    negotiate()
    {
        dbg("negotiate");
        const authTypes = Object.keys(this.auth);
        this.earlySend({t: "start", version: "1", authorized: !!this.preAuth, auth: authTypes});

        if(this.preAuth) this.welcome();
    }

    welcome()
    {
        this.earlySend({t: 'welcome'});
        this.protocolHandoff();
    }

    earlyRecvL(data)
    {
        dbg("earlyRecvL", data);

        switch(data.t) {
            case 'auth':
                let auth = this.auth[data.auth.t];
                if(auth && auth.authenticate(data.auth)) {
                    this.welcome();
                } else {
                    this.earlySend({t: 'authfail'});
                    this.close();
                }
                break;
        }
    }

    earlyRecvC(data)
    {
        dbg("earlyRecvC", data);

        switch(data.t) {
            case 'start': {
                // If we sent preauthorization, e.g. TLS client cert, we're done
                if(data.authorized) break;

                let sentAuth = false;

                for(const m of data.auth) {
                    let auth = this.auth[m];
                    if(auth && !auth.preSend) {
                        this.earlySend({t: "auth", auth: auth});
                        sentAuth = true;
                        break;
                    }
                }

                if(!sentAuth)
                    throw `
No authentication method found
  Ours:   ${Object.keys(this.auth)}
  Theirs: ${data.auth}`;

                break;
            }
            case 'welcome': this.protocolHandoff(); break;

            case 'authfail':
                this.close();
                throw `Authentication failed`;
                break;
        }
    }

    protocolHandoff()
    {
        dbg("handoff", this.side);

        this.ws.removeEventListener("message", this.earlyRecv);
        this.ws.addEventListener("message", (e) => this.recv(e.data));

        dbg("reset listener");

        switch(this.side) {
            case 'c': this.proto.handshake(); break;
            case 'l': break;
        }
    }

    send(data, id_p)
    {
        let t   = id_p === undefined ? 'm' : 'r';
        let id  = id_p === undefined ? this.req++ : id_p;
        let msg = {t: t, id: id, data: data};

        if(t == 'r') {
            // say("send>" + this.id, json5.stringify(msg));
            this.ws.send(json5.stringify(msg));
        } else {
            return new Promise((resolve, reject) => {
                // say("send>" + this.id, json5.stringify(msg));
                this.pm[msg.id] = {resolve, reject};
                this.ws.send(json5.stringify(msg));
            });
        }
    }

    recv(data)
    {
        // dbg("recv<" + this.id, data.toString());

        let msg = json5.parse(data.toString());

        if(msg.t == 'r') { // Got response from our request
            let rr = this.pm[msg.id];
            delete this.pm[msg.id];

            if(!rr) throw Error(`No rr for ${msg}!`)

                try {
                    let ret = this.proto.processResponse(msg.data);
                    rr.resolve(ret);
                } catch(err) {
                    rr.reject(err);
                }
        } else { // Got request
            this.proto.processRequest(msg.data, msg.id);
        }
    }

    close() { this.ws.close(); }
}
