import { Crypto } from "./crypto.js";
import { fragmentData } from "./fragmentData.js";
import { MetaData } from "./metaData.js";

const CRYPTO_SIZE = 2048;
const KEY = "0123456789abcdef0123456789abcdef";
const IV = "0123456789abcdef";

const META_DATA_DRIVE = "DROPBOX";
const SLICE_RATIO = [0.1, 0.9];
const SLICE_DRIVE = ["DROPBOX", "DROPBOX"];
var meta = new MetaData("/Users/kygsm/meta.md");

var DBX_CLIENT_ID = 'yhfujf4ushejyu5';
var DBX_ACCESS_TOKEN = null;
if (JSON.parse(localStorage.getItem('dbx-token')) != null) {
    DBX_ACCESS_TOKEN = JSON.parse(localStorage.getItem('dbx-token')).dbx_token;
    console.log("get it!");
    console.log(DBX_ACCESS_TOKEN);
}
else {
    console.log("failed!");
    console.log(DBX_ACCESS_TOKEN);
}
// var DBX_ACCESS_TOKEN = "";
var dbx = new Dropbox.Dropbox({ clientId: DBX_CLIENT_ID, accessToken: DBX_ACCESS_TOKEN });

//document.getElementById("file-upload-btn").addEventListener("click", onFileBtnClicked);
//document.getElementById("file-download-btn").addEventListener("click", onFileBtnClicked2);
document.getElementById("logout-DBX").addEventListener("click", logoutDBX);


// 승모 함수 부분
function onFileBtnClicked(){
    var fileInput = document.getElementById("file-upload");
    console.log(fileInput)
    uploadFile(fileInput.files[0], false, SLICE_RATIO, SLICE_DRIVE);
}

//without encrypt
function onFileBtnClicked2(){
    var filePath = document.getElementById("file-download-path").value;
    console.log(filePath);
    downloadFile(SLICE_DRIVE[0], filePath);
    /*
    input.type = "file";
    input.accept = "*";
    input.click();
    input.onchange = function (event){
        uploadFile(event.target.files[0], false, SLICE_RATIO, SLICE_DRIVE);
    }
    */
}

function onGDLoginBtnClicked(){

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
            downloadFileDBX(path, function(str, fileName){ callback(str, fileName)});
            break;
        default:
            break;
    }
}

function readMetaData(){
    readFile(META_DATA_DRIVE, "/meta.md", function(str){
        console.log(meta);
        meta.readMetaData(str, function(){
            //console.log(meta._datas[0]._name);
            for(let i = 0; i < meta._datas.length; i++){
                var submitUI = document.createElement("button");
                var submitUItext = document.createTextNode( meta._datas[i]._name );
            
                submitUI.type = "submit";
                submitUI.type = ""
                submitUI.onclick = downloadFragmentFile.bind(meta._datas[i]);
                submitUI.appendChild( submitUItext );
                document.body.appendChild( submitUI );
            }
        })
    });
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
            return false;
        }
    }
    return callback();
}

function downloadFile(platform, path){
    readFile(platform, path, function(ss, name){
        var element = document.createElement('a');
        const blob = new Blob([ss], {type : 'application/octet-stream'});
        element.href = URL.createObjectURL(blob);
        element.setAttribute('download', name);
        document.body.appendChild(element);
        element.click();
    });
}

function downloadFragmentFile(){
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
                
                frag.addFileInfo(file.name + i, "/mgmg/", drives[i], fileSize, true);
            }
            else
                frag.addFileInfo(file.name + i, "/mgmg/", drives[i], fileSize, false);

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
                    if (files.length === 0){
                        var dbxFile = new File([dbxBlob], file.name);
                        uploadFileDBX('/', dbxFile);
                    }
                    else{
                        var dbxFile = new File([dbxBlob], file.name + i);
                        uploadFileDBX('/mgmg/', dbxFile);
                    }
                    
                    break;
                default: 
                    break;
            }
        }
        meta.pushData(frag);
        const blobMD = new Blob([meta.writeMetaData()], {type : 'application/octet-stream'});
        var fileMD = new File([blobMD], "meta.md");

        switch (META_DATA_DRIVE) {
            case "PC":
                var a = document.createElement("a");
                a.href = URL.createObjectURL(file);
                a.download = "meta.md";
                a.click();       
                break;
            
            case "GOOGLE" :
                break;
    
            case "DROPBOX":                
                uploadFileDBX('/', fileMD);                             
                break;
            default: 
                break;
        }
        readMetaData();
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

























/////////////// DBX CODE ///////////////////
// OAuth Script start
function getAccessTokenFromUrl() {
    return utils.parseQueryString(window.location.hash).access_token;
}

function isDBXAuthenticated() {
    if(DBX_ACCESS_TOKEN != null)
        return true;
    return !!getAccessTokenFromUrl();
}

function logoutDBX() {
    window.localStorage.removeItem('dbx-token');
    DBX_ACCESS_TOKEN = null;
    dbx.authTokenRevoke();
    window.location.href = window.location.origin;
}

function renderItems(items) {
    var filesContainer = document.getElementById('dbx-files');
    console.log(filesContainer);
    items.forEach(function (item) {
        var li = document.createElement('li');
        li.innerHTML = item.name;
        filesContainer.appendChild(li);
    });
}

function showPageSection(elementId) {
    document.getElementById(elementId).style.display = 'block';
}

function hidePageSection(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

function listFiles(dbx, path) {
    dbx.filesListFolder({ path: path })
        .then(function (response) {
            renderItems(response.result.entries);
        })
        .catch(function (error) {
            console.error(error);
        });
}

if (isDBXAuthenticated()) {
    if(DBX_ACCESS_TOKEN == null){
        DBX_ACCESS_TOKEN = getAccessTokenFromUrl()
        const obj = {
            dbx_token : DBX_ACCESS_TOKEN
        }
        localStorage.setItem('dbx-token', JSON.stringify(obj));
        console.log(obj);
        let token = JSON.parse(localStorage.getItem('dbx-token'));
        console.log(token.dbx_token);    
    }
    showPageSection('dbx-info-id');
    hidePageSection('dbx-authlogin');

    dbx = new Dropbox.Dropbox({ accessToken: DBX_ACCESS_TOKEN });
    listFiles(dbx, '')
    readMetaData();
} else {
    showPageSection('dbx-authlogin');
    hidePageSection('dbx-info-id');
    dbx = new Dropbox.Dropbox({ clientId: DBX_CLIENT_ID });
    var authUrl = dbx.auth.getAuthenticationUrl('http://localhost:8080/')
        .then((authUrl) => {
            document.getElementById('dbx-authlink').href = authUrl;
            console.log(document.getElementById('dbx-authlink').href);
        })
}
// OAuth Script end

function showFolder(dbx, path, folder) {
    var path = 'path' + 'folder';
    listFiles(dbx, path);
}

// Upload Script start
function uploadFileDBX(filePath, DBXfile, callback=null) {
    const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
    // var fileInput = document.getElementById('file-upload');
    var file = DBXfile;

    if (file.size < UPLOAD_FILE_SIZE_LIMIT) { // File is smaller than 150 Mb - use filesUpload API
        dbx.filesUpload({ path: filePath + file.name, contents: file, mode:'overwrite' })
            .then(function (response) {
                var results = document.getElementById('results');
                var br = document.createElement("br");
                results.appendChild(document.createTextNode('File uploaded!'));
                results.appendChild(br);
                console.log(response);
                if (callback)
                {   
                    callback();
                }
            })
            .catch(function (error) {
                console.error(error);
            });
    } else { // File is bigger than 150 Mb - use filesUploadSession* API
        const maxBlob = 8 * 1000 * 1000; // 8Mb - Dropbox JavaScript API suggested max file / chunk size
        var workItems = [];
        var offset = 0;

        while (offset < file.size) {
            var chunkSize = Math.min(maxBlob, file.size - offset);
            workItems.push(file.slice(offset, offset + chunkSize));
            offset += chunkSize;
        }

        const task = workItems.reduce((acc, blob, idx, items) => {
            if (idx == 0) {
                // Starting multipart upload of file
                return acc.then(function () {
                    return dbx.filesUploadSessionStart({ close: false, contents: blob })
                        .then(response => response.session_id)
                });
            } else if (idx < items.length - 1) {
                // Append part to the upload session
                return acc.then(function (sessionId) {
                    var cursor = { session_id: sessionId, offset: idx * maxBlob };
                    return dbx.filesUploadSessionAppendV2({ cursor: cursor, close: false, contents: blob }).then(() => sessionId);
                });
            } else {
                // Last chunk of data, close session
                return acc.then(function (sessionId) {
                    var cursor = { session_id: sessionId, offset: file.size - blob.size };
                    var commit = { path: '/' + file.name, mode: 'add', autorename: true, mute: false };
                    return dbx.filesUploadSessionFinish({ cursor: cursor, commit: commit, contents: blob });
                });
            }
        }, Promise.resolve());

        task.then(function (result) {
            var results = document.getElementById('results');
            results.appendChild(document.createTextNode('File uploaded!'));
            if (callback)
            {   
                callback();
            }
        }).catch(function (error) {
            console.error(error);
        });

    }
    return false;
}
// Upload Script end

function downloadFileDBX(filepath, callback) {
    // var FILE_PATH = document.getElementById('file-path').value;
    var content;
    dbx = new Dropbox.Dropbox({ accessToken: DBX_ACCESS_TOKEN });
    console.log(filepath);
    dbx.filesDownload({ path: filepath })
        .then(function (response) {
            // console.log(response)
            var blob = response.result.fileBlob;
            var reader = new FileReader();
            reader.addEventListener("loadend", function () {
                // console.log(reader.result); // will print out file content
                console.log(this.result.name);
                callback(reader.result, this.result.name);
            }.bind(response));
            content = reader.readAsArrayBuffer(blob);
        }).catch(function (error) { })
    return false;
}