export class TLSClientCert {
    constructor(opt)
    {
        opt ||= {};

        this.ca             = opt.ca || [];
        this.earlyRejection = opt.earlyRejection;

        if(!Array.isArray(this.ca)) this.ca = [this.ca];
    }

    wsSetServerOptions(opt)
    {
        opt ||= {};

        let ca = Array.isArray(opt.ca) ? opt.ca : [opt.ca];
        opt.ca = [...ca, ...this.ca];

        opt.requestCert        = true;
        opt.rejectUnauthorized = false;

        // Useful if we _only_ want client cert auth
        if(this.earlyRejection) opt.verifyClient = (...a) => this.wsVerifyClient(...a);
    }

    wsVerifyClient(info)
    {
        const cert = info.req.socket.getPeerCertificate();
        return !!info.req.client.authorized;
    }

    // Pre-authenticated
    authenticate() { return false; }

    type() { return 'tls-client-cert'; }
}

export class TLSClientCertID {
    constructor(opt)
    {
        opt ||= {};

        this.cert    = opt.cert;
        this.key     = opt.key;
        this.preSend = true;
    }

    wsSetClientOptions(opt)
    {
        opt.cert = this.cert;
        opt.key  = this.key;
    }

    type() { return 'tls-client-cert'; }
}
