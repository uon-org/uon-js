import {PassThrough} from 'node:stream';

import {Connection, Listener, proxify} from '../Connection.mjs';

import makeDuplexPair from './DuplexSocket.mjs';

export {proxify};

export class ConnectionNull extends Connection {
    constructor(opt)
    {
        super();

        opt ||= {};

        if(!opt.remote && !opt.stream) throw `No remote specified`;
        if(!opt.protoClass) throw `No protocolClass specified`;

        if(opt.remote) {
            this.remote = opt.remote;
            this.phys   = this.remote._establish(this);
            this.side   = 'c';
        } else {
            this.phys = opt.stream;
            this.side = 'l';
        }

        this.name  = opt.name;
        this.proto = new opt.protoClass(this, opt.object);
        this.phys.on('data', data => this.recv(data));
        this.phys.on('end', () => {});
        this.req = 0;
        this.pm  = {};

        if(opt.remote) this.proto.handshake();
    }

    send(data, id_p)
    {
        let t   = id_p === undefined ? 'm' : 'r';
        let id  = id_p === undefined ? this.req++ : id_p;
        let msg = {t: t, id: id, data: data};

        if(t == 'r') {
            this.phys.write(JSON.stringify(msg));
        } else {
            return new Promise((resolve, reject) => {
                // console.log(this.name, "send>", msg, resolve);
                this.pm[msg.id] = {resolve, reject};
                this.phys.write(JSON.stringify(msg));
            });
        }
    }

    recv(data)
    {
        let msg = JSON.parse(data.toString());
        let rr  = msg.t == 'r' ? this.pm[msg.id] : null;

        // console.log(this.name, "recv>", msg, rr !== undefined);

        if(rr) { // Got response from our request
            try {
                let ret = this.proto.processResponse(msg.data);
                rr.resolve(ret);
            } catch(err) {
                rr.reject(err);
            }

            delete this.pm[msg.id];
        } else { // Got request
            this.proto.processRequest(msg.data, msg.id);
        }
    }

    close()
    {
        this.phys.end();
        this.emit('close');
    }
}

export class ListenerNull extends Listener {
    constructor(opt)
    {
        super();

        opt ||= {};

        if(!opt.protoClass) throw `No protoClass specified`;

        this.protoClass  = opt.protoClass;
        this.object      = opt.object;
        this.connections = new Set();

        // If this were a real listener, we would establish listening here; see _establish()
    }

    _establish(con)
    {
        const [cSide, lSide] = makeDuplexPair();
        this.connections.add(new ConnectionNull(
            {name: "listenCon", protoClass: this.protoClass, stream: lSide, object: this.object}));

        return cSide;
    }
}
