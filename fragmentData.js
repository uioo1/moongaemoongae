export class fragmentData{
    constructor(name, dataSize){
        this._name = name;
        this._dataSize = dataSize;
        this._fragments = [];
    }

    addFileInfo(name, path, drive, size, isEncrypted = false){
        this._fragments.push({
            name : name,
            path : path,
            drive : drive,
            size : size,
            isEncrypted : isEncrypted
        })
    }
}
