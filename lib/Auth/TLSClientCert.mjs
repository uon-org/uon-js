export class TLSClientCert {
    constructor(opt)
    {
        opt ||= {};

        this.ca             = opt.ca || [];
        this.earlyRejection = opt.earlyRejection;

        if(!Array.isArray(this.ca)) this.ca = [this.ca];
    }

    wsSetServerOptions(listener, opt)
    {
        this.listener = listener;

        opt ||= {};

        let ca = Array.isArray(opt.ca) ? opt.ca : [opt.ca];
        opt.ca = [...ca, ...this.ca];

        opt.requestCert        = true;
        opt.rejectUnauthorized = false;

        opt.verifyClient = (...a) => this.wsVerifyClient(...a);
    }

    wsVerifyClient(info)
    {
        const cert       = info.req.socket.getPeerCertificate();
        const authorized = !!info.req.client.authorized;

        if(authorized) this.listener.preAuthorizedBy(info.req, cert.subject.CN);

        // Useful if we _only_ want client cert auth
        if(this.earlyRejection) return authorized;

        return true;
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
