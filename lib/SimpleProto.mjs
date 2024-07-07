import json5 from 'json5';

import {proxify, Ref, RefProxyHandler, unproxify} from './Connection.mjs';
import Notify from './Notify.mjs';
import {addUonClass, findUonClassProto, OPath, parsePath} from './opath.mjs';
import {classname, classof, dbg, isClassyObject, not, say, str} from './util.mjs';

export default class SimpleProto {
    constructor(con, object)
    {
        this.con    = con;
        this.object = object;

        this.side  = con.side;
        this.oside = con.side == 'l' ? 'c' : 'l';

        this.idToObject = {};
        this.objectToId = new Map();
        this.watches    = new Set();
        this.curId      = 1;

        this.idToRef = new Map(); // Canonicalize refs for notify

        this._notifyFun = (o, m, ...args) => { this.sendNotify(o, m, ...args); };

        this.ensureWatch(this.object);
    }

    isLiteral(ob)
    {
        if(typeof ob != 'object') return true;
        if(Array.isArray(ob)) return true;
        if(!isClassyObject(ob)) return true;
        if(classof(ob) === OPath) return true;
        return false;
    }

    handshake() { this.con.send({t: 'hello', v: this.encodeValue(this.object)}); }

    close() { this.clearWatches(); }

    methods(v) { return this.con.send({t: 'methods', v: this.encodeValue(v)}) }

    call(v, m, args)
    {
        let a = args.map(a => this.encodeValue(a));
        return this.con.send({t: 'call', v: this.encodeValue(v), m: m, a: a});
    }

    ensureWatch(v)
    {
        this.watches.add(v);
        Notify.watch(v, this._notifyFun);
    }

    clearWatches()
    {
        for(const v of this.watches) Notify.unwatch(v, this._notifyFun);
        this.watches.clear();
    }

    sendNotify(v, m, ...args) { this.con.send({t: 'notify', v: this.encodeValue(v), m: m, a: args}); }

    encodeValue(v)
    {
        if(classof(v) === Ref && v._proto === this) return {t: 'ref', s: v._side, ref: v._id};

        if(this.isLiteral(v)) {
            let className = isClassyObject(v) ? classname(v) : undefined;

            return {t: 'val', v: v, ty: className};
        }

        this.ensureWatch(v);
        return {t: 'ref', s: this.side, ref: this._mfrId(v)};
    }

    decodeValue(a)
    {
        switch(a.t) {
            case 'val':
                if(a.ty) a.v.__proto__ = findUonClassProto(a.ty);
                return a.v;

            case 'ref': return this.decodeRef(a);

            default: throw `Invalid value: ${str(a)}`;
        }
    }

    decodeRef(r)
    {
        if(r.s == this.side) return this._findObject(r.ref);

        let ref = this.idToRef.get(r.ref);
        if(!ref) {
            ref = new Ref({proto: this, side: r.s, id: r.ref})._proxy();
            this.idToRef.set(r.ref, ref);
        }

        return ref;
    }

    ret(v, id)
    {
        if(id === undefined) throw "SimpleProto.ret called without id";
        this.con.send({t: 'ret', v: this.encodeValue(v)}, id);
    }

    err(v, id)
    {
        if(id === undefined) throw "SimpleProto.err called without id";
        this.con.send({t: 'err', e: v}, id);
    }

    processRequest(instr, id)
    {
        if(instr === null) return null;
        if(typeof instr != 'object' || Array.isArray(instr)) return instr;

        switch(instr.t) {
            case 'call': {
                let ob = this.decodeValue(instr.v);

                if(!ob) {
                    this.err(`Bad ref: ${str(instr.v)}`, id);
                    break;
                }

                let f = ob[instr.m];
                if(!f || typeof f !== 'function')
                    return this.err(`${instr.m} is not a function on ${ob}`, id);

                try {
                    let args = instr.a.map(a => this.decodeValue(a));
                    let r    = ob[instr.m].call(ob, ...args);

                    Promise.resolve(r).then(o => this.ret(o, id));
                } catch(err) {
                    this.err(err.toString() + err.stack.toString(), id);
                }

                break;
            }

            case 'hello': {
                this.con.send({t: 'welcome', v: this.encodeValue(this.object)}, id);

                let ref = this.decodeRef(instr.v);
                this.con.handshakeComplete(ref);
                break;
            }

            case 'methods': {
                let object  = this.decodeValue(instr.v);
                let methods = this.validMethods(object);

                this.ret(methods, id);
                break;
            }

            case 'notify': {
                let object = this.decodeValue(instr.v);
                Notify.notify(object, instr.m, ...instr.a);
                break;
            }

            default:
                // console.log("invalid>", instr);
                throw `Invalid request: ${JSON.stringify(instr)}`;
        }
    }

    processResponse(instr)
    {
        if(instr === null) return null;
        if(typeof instr != 'object' || Array.isArray(instr)) return instr;

        switch(instr.t) {
            case 'welcome': {
                let ref = this.decodeValue(instr.v);
                this.con.handshakeComplete(ref);
                break;
            }
            case 'ret': return this.decodeValue(instr.v);
            case 'err': throw instr.e;

            default:
                // console.log("invalid>", instr);
                throw `Invalid response: ${JSON.stringify(instr)}`;
        }
    }

    validMethods(object)
    {
        return Object.getOwnPropertyNames(Object.getPrototypeOf(object))
            .filter(m => {return m != 'constructor' && m[0] != '_' && typeof object[m] === 'function'});
    }

    _makeFindRef(ob)
    {
        if(ob === this.object) return [0, this.object];

        let exId = this.objectToId.get(ob);
        if(exId > 0) return [exId, this.idToObject[exId]];

        let id = this.curId++;
        let wr = new WeakRef(ob);
        this.objectToId.set(ob, id);
        this.idToObject[id] = wr;

        return [id, wr];
    }

    _mfrId(ob)
    {
        let [id, wref] = this._makeFindRef(ob);
        return id;
    }

    _findObject(id)
    {
        if(id > 0) {
            let wref = this.idToObject[id];
            if(wref) return wref.deref();
            return;
        };

        if(id === 0) return this.object;
    }
}
