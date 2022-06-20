export class Crypto{
    constructor(key = "0123456789abcdef0123456789abcdef", iv = "0123456789abcdef"){
        this._key = null;
        this._iv = null;

        this.changeKey(key);
        this.changeIV(iv);
    }

    encryptLargeSizeData(data, chunk, key = null, iv = null){
        
        if(data.length < chunk){
            return this.encrypt(data, key, iv);
        }

        else{

        }
    }
        
    encrypt(data, key = null, iv = null) {
        if(key){
            this.changeKey(key);
        }
        if(iv){
            this.changeIV(iv);
        }
        
        console.log(data);

        const cipher = CryptoJS.AES.encrypt(data, this._key, {
            iv: this._iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return cipher.toString();
    }

    decrypt(data, key = null, iv = null){
        if(key){
            this.changeKey(key);
        }
        if(iv){
            this.changeIV(iv);
        }
        
        const cipher = CryptoJS.AES.decrypt(data, this._key, {
            iv: this._iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return cipher;
    }

    changeKey(key){
        this._key = CryptoJS.enc.Utf8.parse(key);
    }

    changeIV(iv){
        this._iv = CryptoJS.enc.Utf8.parse(iv);
    }
}