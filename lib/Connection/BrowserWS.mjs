import {ConnectionWSBase} from './WSBase.mjs';
import {proxify} from '../Connection.mjs';

export {proxify};

export class ConnectionBrowserWS extends ConnectionWSBase {
    constructor(opt)
    {
        opt ||= {};
        super(opt);

        let ws = new WebSocket(opt.url);
        this.establish(ws, {
            connectingSide: !opt.ws,
            object: opt.object,
            protoClass: opt.protoClass,
        });
    }
}
