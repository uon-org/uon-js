import json5 from 'json5';

import {Connection} from '../Connection.mjs';
import {say,dbg} from '../util.mjs';

export class ConnectionWSBase extends Connection {
    static ID = 0;

    constructor(opt)
    {
        opt ||= {};

        super(opt);

        this.id  = ++ConnectionWSBase.ID;
        this.req = 0;
        this.pm  = {};
    }

    establish(ws, opt)
    {
        this.side   = opt.connectingSide ? 'c' : 'l';
        this.object = opt.object;
        this.proto  = new opt.protoClass(this, this.object);

        ws.addEventListener('error', console.error);
        ws.addEventListener('open', async () => {
            if(opt.connectingSide) this.proto.handshake();
        });
        ws.addEventListener('message', (event) => this.recv(event.data));
        ws.addEventListener('close', () => {
            this.proto.close();
            this.emit('close');
        });

        this.ws = ws;
    }

    send(str, id_p)
    {
        let t   = id_p === undefined ? 'm' : 'r';
        let id  = id_p === undefined ? this.req++ : id_p;
        let msg = {t: t, id: id, data: str};

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
