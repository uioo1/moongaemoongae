import { Crypto } from "./crypto.js";
import { fragmentData } from "./fragmentData.js";
import { MetaData } from "./metaData.js";

/**
 * INITIALIZE
 */
const CRYPTO_SIZE = 2048;
const KEY = "0123456789abcdef0123456789abcdef";
const IV = "0123456789abcdef";

const SLICE_RATIO = [0.1, 0.9];
const SLICE_DRIVE = ["PC", "PC"];

var submitUI = document.createElement("button");
var submitUItext = document.createTextNode( 'upload With Crypto' );

submitUI.type = "submit";
submitUI.onclick = onFileBtnClicked;
submitUI.appendChild( submitUItext );
document.body.appendChild( submitUI );

var submitUI = document.createElement("button");
var submitUItext = document.createTextNode( 'upload Without Crypto' );

submitUI.type = "submit";
submitUI.onclick = onFileBtnClicked2;
submitUI.appendChild( submitUItext );
document.body.appendChild( submitUI );

var meta = new MetaData("/Users/kygsm/meta.md");

meta.readMetaData(null, function(){
    //console.log(meta._datas[0]._name);
    for(let i = 0; i < meta._datas.length; i++){
        var submitUI = document.createElement("button");
        var submitUItext = document.createTextNode( meta._datas[i]._name );
    
        submitUI.type = "submit";
        submitUI.type = ""
        submitUI.onclick = downloadFile.bind(meta._datas[i]);
        submitUI.appendChild( submitUItext );
        document.body.appendChild( submitUI );
    }
});

/**
 * FUNCTIONS
 */

//with encrypt
function onFileBtnClicked(){
    var input = document.createElement("input");

    input.type = "file";
    input.accept = "*";
    input.click();
    input.onchange = function (event){
        uploadFile(event.target.files[0], true, SLICE_RATIO, SLICE_DRIVE);
    }
}

//without encrypt
function onFileBtnClicked2(){
    var input = document.createElement("input");

    input.type = "file";
    input.accept = "*";
    input.click();
    input.onchange = function (event){
        uploadFile(event.target.files[0], false, SLICE_RATIO, SLICE_DRIVE);
    }
}

function readFile(platform, path, callback) {
    switch (platform) {
        case "PC":
            var rawFile = new XMLHttpRequest();
            rawFile.open("GET", path, true);
            rawFile.responseType = "arraybuffer";
            
            rawFile.onreadystatechange = function() {
                if (rawFile.readyState === 4 && rawFile.status == "200") {
                    callback(rawFile.response);
                }
            }
            rawFile.send(null);
            break;
        
        case "GOOGLE" :
            break;
        
        case "DROPBOX":
            break;
        default:
            break;
    }
}

/**
 * 모든 파일이 로드 되었는지 확인
 * 로드 되었다면 Callback 함수 호출
 * @param {*} files 
 * @param {*} fileNum 
 * @param {*} callback 
 * @returns 
 */
 function checkFileLoad(files, fileNum, callback){
    for(let i = 0; i < fileNum; i++){
        if(files[i] === undefined){
            //console.log("aa");
            return false;
        }
    }
    return callback();
}

function downloadFile(){
    var fileName = this._name;
    var fragments = this._fragments;
    var fileSize = this._dataSize;
    var files = [];
    var ss = null;

    console.log(fragments)
    
    for(let i = 0; i < fragments.length; i++){
        console.log(fragments)
        readFile(fragments[i].drive, fragments[i].path + fragments[i].name, function(str){
            files[i] = str;
            
            // 파일이 다 로드 되었는지 확인
            checkFileLoad(files, fragments.length, function(){
                const cryptor = new Crypto(KEY, IV);
                
                for(let i = 0; i < fragments.length; i++){
                    if(fragments[i].isEncrypted){
                        files[i] = cryptor.decrypt(new TextDecoder().decode(files[i]));
                        files[i] = convertWordArrayToUint8Array(files[i]);
                        files[i] = files[i].slice(0, fragments[i].size);
                    }
                }

                console.log(files)

                ss = mergeFile(files);

                var element = document.createElement('a');
                const blob = new Blob([ss], {type : 'application/octet-stream'});
                element.href = URL.createObjectURL(blob);
                element.setAttribute('download', fileName);
                document.body.appendChild(element);
                element.click();
            });
        });
    }
}


/**
 * 
 * @param {*} file 
 * @param {*} isCrypto 
 * @param {*} ratios 
 * @param {Array} drives 
 */
function uploadFile(file, isCrypto, ratios, drives){
    var reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = function(){
        let files = [];
        if(isCrypto){
            drives.splice(0, 0, drives[0]);
            let tempfiles = splitFileWithRatio(reader.result, ratios);
            if(tempfiles[0].byteLength >= CRYPTO_SIZE){
                let tempfiles2 = splitFileWithBytes(tempfiles[0], [CRYPTO_SIZE, reader.result.byteLength]);
                files.push.apply(files, tempfiles2);
                files.push.apply(files, tempfiles.splice(1));
            }
            else{
                files.push.apply(files, tempfiles);
            }
        }
        else{
            files = splitFileWithRatio(reader.result, ratios);
        }

        var frag = new fragmentData(file.name, reader.result.byteLength);

        for(let i = 0; i < files.length; i++){
            let fileSize = files[i].byteLength;

            if(i == 0 && isCrypto){
                const cryptor = new Crypto(KEY, IV);
                files[i] = cryptor.encrypt(CryptoJS.lib.WordArray.create(files[i]));
                
                frag.addFileInfo(file.name + i, "/data/", drives[i], fileSize, true);
            }
            else
                frag.addFileInfo(file.name + i, "/data/", drives[i], fileSize, false);

            switch (drives[i]) {
                case "PC":
                    var element = document.createElement('a');
                    const blob = new Blob([files[i]], {type : 'application/octet-stream'});
                    element.href = URL.createObjectURL(blob);
                    element.setAttribute('download', file.name + i);

                    document.body.appendChild(element);
                    element.click();
                    break;
                
                case "GOOGLE" :
                    break;
        
                case "DROPBOX":
                    const dbxBlob = new Blob([files[i]], {type : 'application/octet-stream'});
                    var dbxFile = new File([dbxBlob], "name");
                    break;

                default:
                    break;
            }
        }

        meta.pushData(frag);
        meta.writeMetaData();
    }
}

/**
 * ArrayBuffer 타입의 파일들 받아서 주어지는 비율에 따라 파일을 분리
 * 분리하는 과정에서 splitFileWithBytes를 call
 * @param {string | ArrayBuffer} file 
 * @param {*} num number of files to split
 * @param {Array} ratios 
 */
function splitFileWithRatio(file, ratios){
    let splitSize = 0;
    let bytes = [];
    let num = ratios.length;

    for(let i = 0; i < num; i++){
        let newSplitSize = 0;
        if(i === (num - 1)){
            newSplitSize = file.byteLength;
        }
        else
            newSplitSize = splitSize + Math.floor(file.byteLength * ratios[i]);

        console.log(newSplitSize);

        bytes.push(newSplitSize);
        splitSize = newSplitSize;
    }

    return splitFileWithBytes(file, bytes);
}

/**
 * ArrayBuffer 타입의 파일들 받아서 주어지는 바이트에 따라 파일을 분리
 * @param {ArrayBuffer} file 
 * @param {*} num number of files to split
 * @param {Array} bytes 
 * @returns 
 */
function splitFileWithBytes(file, bytes){
    let splitSize = 0;
    let files = [];
    let num = bytes.length;
    for(let i = 0; i < num; i++){
        let newSplitSize = bytes[i];
        files.push(file.slice(splitSize, newSplitSize));
        splitSize = newSplitSize;
    }

    return files;
}

/**
 * ArrayBuffer 타입의 파일들 받아서 하나로 합침
 * @param {ArrayBuffer} files files to merge
 * @returns {ArrayBuffer} merged file
 */
function mergeFile(files){
    //console.log(files);
    var fileSize = 0;
    for(let i = 0; i < files.length; i++){
        fileSize += files[i].byteLength;
    }

    var file = new Uint8Array(fileSize);
    var offset = 0;
    for(let i = 0; i< files.length; i++){
        file.set(new Uint8Array(files[i]), offset);
        offset += files[i].byteLength;
    }

    return file;
}

/**
 * wordArray를 Crypto.js에서 암호화 할 수 있는 타입인 Uint8Array로 바꿈
 * @param {*} wordArray 
 * @returns Uint8Array type
 */
function convertWordArrayToUint8Array(wordArray) {
	var len = wordArray.words.length,
		u8_array = new Uint8Array(len << 2),
		offset = 0, word, i
	;
	for (i=0; i<len; i++) {
		word = wordArray.words[i];
		u8_array[offset++] = word >> 24;
    	u8_array[offset++] = (word >> 16) & 0xff;
		u8_array[offset++] = (word >> 8) & 0xff;
		u8_array[offset++] = word & 0xff;
	}
	return u8_array;
}