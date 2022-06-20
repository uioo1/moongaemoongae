import {fragmentData} from "./fragmentData.js"

function readTextFile(file, callback) {
    var rawFile = new XMLHttpRequest();
    rawFile.overrideMimeType("application/json");
    rawFile.open("GET", file, true);
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4 && rawFile.status == "200") {
            callback(rawFile.responseText);
        }
    }
    rawFile.send(null);
}

export class MetaData{
    constructor(path){
        this._dataPath = null;
        this._datas = [];

        this.setPath(path);
    }

    setPath(path){
        this._dataPath = path;
    }

    pushData(fragData){
        this._datas.push(fragData);
    }

    spliceData(name){
        this._datas.splice(this._datas.findIndex(i => i.name === name), 1);
    }

    readMetaData(path = null, callback){
        if(path){
            this.setPath(path)
        }

        if(!this._dataPath){
            //console.log("No path");
            return;
        }

        readTextFile("/data/meta.md", function(text){
            var data = JSON.parse(text);
            this._datas = data;
            //console.log(this._datas);
            callback();
        }.bind(this));

    }

    writeMetaData(path){
        if(!this._dataPath){
            //console.log("No path");
            return;
        }

        var content = JSON.stringify(this._datas);
        //console.log(content);        
        // var a = document.createElement("a");

        var file = new Blob([content], {type: "text/plain"});
        return file;

        /*
        a.href = URL.createObjectURL(file);        
        a.download = "meta.md";
        a.click();
        */
    }
}