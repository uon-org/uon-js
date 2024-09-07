import crypto from 'node:crypto';

export function cryptPassword(opt)
{
    const iterations = opt.iterations || 1e5;
    const algo       = opt.algo || 'sha512';
    const size       = opt.size || 64;

    const text = opt.text;
    const salt = opt.salt || crypto.randomBytes(size);
    const hash = crypto.pbkdf2Sync(text, salt, iterations, size, algo);

    return {pw: hash, salt: salt, iter: iterations, algo: algo };
}

export function comparePassword(text, pwRec) {
    let pwBuf = Buffer.from(pwRec.pw);
    let input = cryptPassword({...pwRec, text});

    return crypto.timingSafeEqual(input.pw, pwBuf);
}
