class NotifyMgr {
    constructor() { this._obj = new Map; }

    watch(o, f)
    {
        let funs = this._obj.get(o);

        if(!funs) {
            funs = new Set;
            this._obj.set(o, funs);
        }

        funs.add(f);
    }

    unwatch(o, f) {
        let funs = this._obj.get(o)

        if(!funs) return;

        funs.delete(f);
        if(!funs.size) this._obj.delete(o);
    }

    notify(o, ...args)
    {
        let funs = this._obj.get(o);

        if(!funs) return;

        for(const f of funs) f(o, ...args);
    }
}

export default new NotifyMgr;
