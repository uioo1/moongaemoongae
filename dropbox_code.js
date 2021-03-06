import { Crypto } from "./crypto.js";
import { fragmentData } from "./fragmentData.js";
import { MetaData } from "./metaData.js";

const CRYPTO_SIZE = 2048;
var KEY = "0123456789abcdef0123456789abcdef";
const IV = "0123456789abcdef";

const META_DATA_DRIVE = "DROPBOX";
const SLICE_RATIO = [0.1, 0.9];
const SLICE_DRIVE = ["DROPBOX", "GOOGLE"];

const DBX_CLIENT_ID = 'yhfujf4ushejyu5';

const GOO_CLIENT_ID = '808379896395-pjo7v8bl56l5q9t3ddev1egr2d352luv.apps.googleusercontent.com';
const GOO_API_KEY = 'AIzaSyBUK4VZ1ZvZpFtALRZGWPdUHrHYS8-0LBg';

const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive';
let tokenClient;
let gapiInited = false;
let gisInited = false;

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

var meta = new MetaData("/Users/kygsm/meta.md");
var metaBtnGroup = null;

var dropboxPath = "/";
var googlePath = "/";

document.getElementById("dbxfile-upload-btn").addEventListener("click", onUploadFileClicked.bind(
    {platform : "DROPBOX", path : dropboxPath, fileInput : "dbxfile-upload", callback : listFiles}));
document.getElementById("gdfile-upload-btn").addEventListener("click", onUploadFileClicked.bind(
    {platform : "GOOGLE", path : googlePath, fileInput : "gdfile-upload", callback : renderItemsGD}));

document.getElementById("frgfile-upload-btn").addEventListener("click", onFrgFileBtnClicked);
document.getElementById("frgfile-encrypted-upload-btn").addEventListener("click", onEncryptedFrgFileBtnClicked);
//document.getElementById("file-download-btn").addEventListener("click", onFileBtnClicked2);

document.getElementById("logout-DBX").addEventListener("click", logoutDBX);
document.getElementById("logout-GD").addEventListener("click", handleSignoutClick);

// ?????? ?????? ??????
function onFrgFileBtnClicked() {
    var fileInput = document.getElementById("frgfile-upload");
    var ratio = document.getElementById("frg-ratio");
    var custom_ratio = [ratio.value/10, (10-ratio.value)/10];
    console.log(custom_ratio);
    console.log(fileInput.files[0])
    uploadFragementFile(fileInput.files[0], false, custom_ratio, SLICE_DRIVE);
}

function onEncryptedFrgFileBtnClicked() {
    var fileInput = document.getElementById("frgfile-upload");
    KEY = document.getElementById('encrypt-pwd').value;
    console.log(document.getElementById('encrypt-pwd').value);
    var ratio = document.getElementById("frg-ratio");
    var custom_ratio = [ratio.value/10, (10-ratio.value)/10];
    console.log(custom_ratio);
    console.log(fileInput.files[0])
    uploadFragementFile(fileInput.files[0], true, custom_ratio, SLICE_DRIVE);
}

function onUploadFileClicked(){
    var platform = this.platform;
    var fileInput = document.getElementById(this.fileInput);
    var path = this.path;
    var callback = this.callback;
    uploadFile(platform, path, fileInput.files[0], callback);
}

function onFileBtnClicked2() {
    var filePath = document.getElementById("file-download-path").value;
    console.log(filePath);
    downloadFile(SLICE_DRIVE[0], filePath);
    /*
    input.type = "file";
    input.accept = "*";
    input.click();
    input.onchange = function (event){
        uploadFragementFile(event.target.files[0], false, SLICE_RATIO, SLICE_DRIVE);
    }
    */
}

function onFileSmallBtnClicked(filepath) {
    downloadFile(SLICE_DRIVE[0], filePath);
}

function onGDLoginBtnClicked(){

}

function readFile(platform, path, callback) {
    switch (platform) {
        case "PC":
            var rawFile = new XMLHttpRequest();
            rawFile.open("GET", path, true);
            rawFile.responseType = "arraybuffer";

            rawFile.onreadystatechange = function () {
                if (rawFile.readyState === 4 && rawFile.status == "200") {
                    callback(rawFile.response);
                }
            }
            rawFile.send(null);
            break;

        case "GOOGLE":
            downloadFileGoo(path, function (str, fileName) { callback(str, fileName) });
            break;

        case "DROPBOX":
            downloadFileDBX(path, function (str, fileName) { callback(str, fileName) });
            break;
        default:
            break;
    }
}

function readMetaData() {
    readFile(META_DATA_DRIVE, "/meta.md", function (str) {
        console.log(meta);
        meta.readMetaData(str, function () {
            //console.log(meta._datas[0]._name);
            if (metaBtnGroup) {
                metaBtnGroup.remove();
                metaBtnGroup = null;
            }
            metaBtnGroup = document.createElement("btngroup");
            var frg_group = document.getElementById('frg-files')
            for (let i = 0; i < meta._datas.length; i++) {
                var li = document.createElement('li');
                li.setAttribute("id", "frg-file-li");
                li.innerHTML = meta._datas[i]._name;

                var submitUI = document.createElement("button");
                //var submitUItext = document.createTextNode(meta._datas[i]._name);
                var submitUItext = document.createTextNode('????????????');
                submitUI.setAttribute("class", 'frg-file-download');
                for (let j = 0; j<meta._datas[i]._fragments.length; j++) {
                    if(meta._datas[i]._fragments[j].isEncrypted) {
                        submitUI.setAttribute("class", 'encrypted-frg-file-download');
                        submitUItext = document.createTextNode('????????? ????????????');
                        break;
                    }
                }
                submitUI.type = "submit";
                submitUI.type = ""
                submitUI.onclick = downloadFragmentFile.bind(meta._datas[i]);
                submitUI.appendChild(submitUItext);
                li.appendChild(submitUI);

                metaBtnGroup.appendChild(li);
            }
            frg_group.appendChild(metaBtnGroup);
        })
    });
}

/**
 * ?????? ????????? ?????? ???????????? ??????
 * ?????? ???????????? Callback ?????? ??????
 * @param {*} files 
 * @param {*} fileNum 
 * @param {*} callback 
 * @returns 
 */
function checkFileLoad(files, fileNum, callback) {
    for (let i = 0; i < fileNum; i++) {
        if (files[i] === undefined) {
            return false;
        }
    }
    return callback();
}

function downloadFile(platform, path) {
    readFile(platform, path, function (ss, name) {
        var element = document.createElement('a');
        const blob = new Blob([ss], { type: 'application/octet-stream' });
        element.href = URL.createObjectURL(blob);
        element.setAttribute('download', name);
        document.body.appendChild(element);
        element.click();
    });
}

function uploadFile(platform, path, file, callback){
    switch (platform) {
        case "PC":
            element.href = URL.createObjectURL(file);
            element.setAttribute('download', file.name + i);

            document.body.appendChild(element);
            element.click();
            break;

        case "GOOGLE":
            uploadFileGoo(path, file, callback);
            break;

        case "DROPBOX":
            uploadFileDBX(path, file, callback);
            break;
        default:
            break;
    }
}

function downloadFragmentFile() {
    var fileName = this._name;
    var fragments = this._fragments;
    var fileSize = this._dataSize;
    var files = [];
    var ss = null;
    KEY = document.getElementById('encrypt-pwd').value;

    console.log(fragments)

    for (let i = 0; i < fragments.length; i++) {
        console.log(fragments)
        readFile(fragments[i].drive, fragments[i].path + fragments[i].name, function (str) {
            files[i] = str;

            // ????????? ??? ?????? ???????????? ??????
            checkFileLoad(files, fragments.length, function () {
                const cryptor = new Crypto(KEY, IV);

                for (let i = 0; i < fragments.length; i++) {
                    if (fragments[i].isEncrypted) {
                        files[i] = cryptor.decrypt(new TextDecoder().decode(files[i]));
                        files[i] = convertWordArrayToUint8Array(files[i]);
                        files[i] = files[i].slice(0, fragments[i].size);
                    }
                }

                console.log(files)

                ss = mergeFile(files);

                var element = document.createElement('a');
                const blob = new Blob([ss], { type: 'application/octet-stream' });
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
function uploadFragementFile(file, isCrypto, ratios, drives) {
    var reader = new FileReader();
    reader.readAsArrayBuffer(file);

    reader.onload = function () {
        let files = [];
        if (isCrypto) {
            drives.splice(0, 0, drives[0]);
            let tempfiles = splitFileWithRatio(reader.result, ratios);
            if (tempfiles[0].byteLength >= CRYPTO_SIZE) {
                let tempfiles2 = splitFileWithBytes(tempfiles[0], [CRYPTO_SIZE, reader.result.byteLength]);
                files.push.apply(files, tempfiles2);
                files.push.apply(files, tempfiles.splice(1));
            }
            else {
                files.push.apply(files, tempfiles);
            }
        }
        else {
            files = splitFileWithRatio(reader.result, ratios);
        }

        var frag = new fragmentData(file.name, reader.result.byteLength);

        for (let i = 0; i < files.length; i++) {
            let fileSize = files[i].byteLength;

            if (i == 0 && isCrypto) {
                const cryptor = new Crypto(KEY, IV);
                files[i] = cryptor.encrypt(CryptoJS.lib.WordArray.create(files[i]));

                frag.addFileInfo(file.name + i, "/mgmg/", drives[i], fileSize, true);
            }
            else
                frag.addFileInfo(file.name + i, "/mgmg/", drives[i], fileSize, false);

            const gooBlob = new Blob([files[i]], { type: 'application/octet-stream' });
            var gooFile = new File([gooBlob], file.name + i);

            uploadFile(drives[i], '/mgmg/', gooFile);
        }
        meta.pushData(frag);
        const blobMD = new Blob([meta.writeMetaData()], { type: 'application/octet-stream' });
        var fileMD = new File([blobMD], "meta.md");

        uploadFile(META_DATA_DRIVE, '/', fileMD, readMetaData);
    }
}

/**
 * ArrayBuffer ????????? ????????? ????????? ???????????? ????????? ?????? ????????? ??????
 * ???????????? ???????????? splitFileWithBytes??? call
 * @param {string | ArrayBuffer} file 
 * @param {*} num number of files to split
 * @param {Array} ratios 
 */
function splitFileWithRatio(file, ratios) {
    let splitSize = 0;
    let bytes = [];
    let num = ratios.length;

    for (let i = 0; i < num; i++) {
        let newSplitSize = 0;
        if (i === (num - 1)) {
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
 * ArrayBuffer ????????? ????????? ????????? ???????????? ???????????? ?????? ????????? ??????
 * @param {ArrayBuffer} file 
 * @param {*} num number of files to split
 * @param {Array} bytes 
 * @returns 
 */
function splitFileWithBytes(file, bytes) {
    let splitSize = 0;
    let files = [];
    let num = bytes.length;
    for (let i = 0; i < num; i++) {
        let newSplitSize = bytes[i];
        files.push(file.slice(splitSize, newSplitSize));
        splitSize = newSplitSize;
    }

    return files;
}

/**
 * ArrayBuffer ????????? ????????? ????????? ????????? ??????
 * @param {ArrayBuffer} files files to merge
 * @returns {ArrayBuffer} merged file
 */
function mergeFile(files) {
    var fileSize = 0;
    for (let i = 0; i < files.length; i++) {
        fileSize += files[i].byteLength;
    }

    var file = new Uint8Array(fileSize);
    var offset = 0;
    for (let i = 0; i < files.length; i++) {
        file.set(new Uint8Array(files[i]), offset);
        offset += files[i].byteLength;
    }

    return file;
}

/**
 * wordArray??? Crypto.js?????? ????????? ??? ??? ?????? ????????? Uint8Array??? ??????
 * @param {*} wordArray 
 * @returns Uint8Array type
 */
function convertWordArrayToUint8Array(wordArray) {
    var len = wordArray.words.length,
        u8_array = new Uint8Array(len << 2),
        offset = 0, word, i
        ;
    for (i = 0; i < len; i++) {
        word = wordArray.words[i];
        u8_array[offset++] = word >> 24;
        u8_array[offset++] = (word >> 16) & 0xff;
        u8_array[offset++] = (word >> 8) & 0xff;
        u8_array[offset++] = word & 0xff;
    }
    return u8_array;
}
$.getScript("https://apis.google.com/js/api.js", gapiLoaded);
$.getScript("https://accounts.google.com/gsi/client", gisLoaded);

/////////////// GOOGLE CODE ///////////////////
function gapiLoaded() {
    gapi.load('client', intializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function intializeGapiClient() {
    await gapi.client.init({
        apiKey: GOO_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    if (JSON.parse(localStorage.getItem('gd-token')) != null) {
        gapi.client.setToken(JSON.parse((localStorage.getItem('gd-token'))));
        console.log(gapi.client.getToken());
        showPageSection('gd-info-id');
        hidePageSection('gd-authlogin');
        renderItemsGD()
    }
    //maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOO_CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    //maybeEnableButtons();
    document.getElementById('gd-authlink').onclick = handleAuthClick;
}

function getGDToken() {
    if (gapi.client.getToken() != null) {
        console.log(gapi.client.getToken());
        return gapi.client.getToken();
    }
}

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        var toekn = getGDToken();
        localStorage.setItem('gd-token', JSON.stringify(toekn));
        renderItemsGD();
        showPageSection('gd-info-id');
        hidePageSection('gd-authlogin');

        if (resp.error !== undefined) {
            throw (resp);
        }
    };
    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        //google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        window.localStorage.removeItem('gd-token');
        showPageSection('gd-authlogin');
        hidePageSection('gd-info-id');
    }
}

/**
 * 
 * @param {string} path 
 * @returns 
 */
async function getFileInfo(path, createPath) {
    var parentID = 'root';
    var parent = null;

    var f = path.split("/");
    if (f[0] === "") {
        f.splice(0, 1);
    }
    if (f[f.length - 1] === "") {
        f.splice(f.length - 1, 1)
    }
    let response;
    for (let i = 0; i < f.length; i++) {
        try {
            response = await gapi.client.drive.files.list({
                'q': `name = '${f[i]}' and '${parentID}' in parents and trashed = false`,
                'pageSize': 300,
                'fields': 'files(id, name, parents)',
            });
        } catch (err) {
            console.log(err.message);
            return;
        }
        const files = response.result.files;
        if (!files || files.length == 0) {
            //document.getElementById('content').innerText = 'No files found.';
            if (!createPath) {
                console.log(parent);
                return;
            }
            else {
                console.log("wow")
                await createFolder(f[i]);
                i--;
                continue;
            }
        }
        parent = files[0];
        parentID = files[0].id;
    }
    return parent;
}

function getFileListatGD(path, callback) {
    getFileInfo(path).then((fileInfo) => {
        if(!fileInfo){
            fileInfo = {id : 'root'}
        }
        gapi.client.drive.files.list({
            'q': `'${fileInfo.id}' in parents and trashed = false`,
            'pageSize': 300,
            'fields': 'files(id, name, mimeType)',
        }).then((response) => {
            if(callback){
                callback(response.result.files);
            }
            console.log(response.result.files);
        });            
    })
}

function downloadFileGoo(filepath, callback) {
    getFileInfo(filepath).then((fileInfo) => {
        var fileID = fileInfo.id;
        //file buffer download
        gapi.client.drive.files.get({
            'fileId': fileID,
            'alt' : 'media'           
        }).then(
            (response) => {
                if (callback) {
                    const dataUrl = `data:${response.headers["Content-Type"]};base64,${btoa(response.body)}`;
                    
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', dataUrl, true);
                    xhr.responseType = "arraybuffer";
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState === 4 && xhr.status == "200") {
                            console.log(xhr.response);
                            callback(xhr.response, fileInfo.name);
                        }
                        
                    };
                    xhr.onerror = function() {
                        callback(null);
                    };
                    xhr.send();
                }
            }
        );
    });
};

function uploadFileGoo(filePath, fileData, callback) {
    var parentFileID = 'root';
    getFileInfo(filePath, true).then(
        (parentFile) => {
            parentFileID = (parentFile) ? parentFile.id : null;
            console.log(parentFile);
            const boundary = '-------314159265358979323846';
            const delimiter = "\r\n--" + boundary + "\r\n";
            const close_delim = "\r\n--" + boundary + "--";

            var reader = new FileReader();
            reader.readAsBinaryString(fileData);
            reader.onload = function(e) {
                var contentType = fileData.type || 'application/octet-stream';
                if(parentFileID){
                    var metadata = {
                        'title': fileData.name,
                        'mimeType': contentType,
                        'parents' : [{id : parentFileID}]
                    };
                }
                else{
                    var metadata = {
                        'title': fileData.name,
                        'mimeType': contentType,
                    };
                }

                var base64Data = btoa(reader.result);
                var multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: base64\r\n' +
                    '\r\n' +
                    base64Data +
                    close_delim;

                var request = gapi.client.request({
                    'path': '/upload/drive/v2/files',
                    'method': 'POST',
                    'params': {'uploadType': 'multipart'},
                    'headers': {
                    'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
                    },
                    'body': multipartRequestBody});
                if (!callback) {
                    callback = function(file) {
                        console.log(file)
                    };
                }
                request.execute(callback);
            }
        }
    );
}

async function createFolder(folderName) {
    await gapi.client.request({
        'path': '/drive/v2/files',
        'method': 'POST',
        'body': {
            "title": folderName,
            "mimeType": "application/vnd.google-apps.folder",
            "description": "Some"
        }
    });
}

function renderItemsGD() {
    var filesContainer = document.getElementById('gd-files');
    filesContainer.replaceChildren();

    getFileListatGD(googlePath, function(items){
        items.sort(function (a, b){
            if(a.mimeType === b.mimeType){
                var nameA = a.name.toUpperCase();
                var nameB = b.name.toUpperCase();
                return nameA < nameB;
            }
            if(a.mimeType === "application/vnd.google-apps.folder"){
                return -1;
            }
            if(b.mimeType === "application/vnd.google-apps.folder"){
                return 1;
            }
            var nameA = a.name.toUpperCase();
            var nameB = b.name.toUpperCase();
            return nameA < nameB;
        })
        var li = document.createElement('li');
        var submitUI = document.createElement("button");
        submitUI.style.visibility = 'visible';
        li.setAttribute("id", "gd-file-li");
        li.innerHTML = "..";
        filesContainer.appendChild(li);
        submitUI.setAttribute("class", 'gd-file-download');
        submitUI.type = "submit";
        var submitUItext = document.createTextNode("??????");
        submitUI.onclick = tempChangeFile.bind(null);
        submitUI.appendChild(submitUItext);
        li.appendChild(submitUI);

        items.forEach(function (item) {
            var li = document.createElement('li');
            var submitUI = document.createElement("button");
            submitUI.style.visibility = 'visible';
            li.setAttribute("id", "gd-file-li");
            li.innerHTML = item.name;
            filesContainer.appendChild(li);
            var parameter = {drive:'GOOGLE', path: '/' + item.name}; 
            submitUI.setAttribute("class", 'gd-file-download');
            var submitUItext = document.createTextNode("????????????");
            submitUI.type = "submit";

            submitUI.onclick = tempDownFile.bind(parameter);
            if(item.mimeType === "application/vnd.google-apps.folder"){
                var submitUItext = document.createTextNode("??????");
                submitUI.onclick = tempChangeFile.bind(item);
            }
        
            submitUI.appendChild(submitUItext);
            li.appendChild(submitUI);
        });
    })
}

function str2ab(text) {
    return new TextEncoder().encode(text).buffer;
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

function tempDownFile() {
    downloadFile(this.drive, this.path);
}

function tempChangeFile(){
    if(!this){
        var paths = googlePath.split("/");
        googlePath = "";
        for(let i = 0; i < paths.length - 2; i++){
            googlePath += paths[i] += "/";
        }
    }
    else{
        googlePath +=this.name + "/";
    }
    console.log(googlePath)
    renderItemsGD();
}

function renderItems(items) {
    var filesContainer = document.getElementById('dbx-files');
    filesContainer.replaceChildren();
    
    items.forEach(function (item) {
        var li = document.createElement('li');
        var submitUI = document.createElement("button");
        submitUI.style.visibility = 'hidden';
        li.setAttribute("id", "dbx-file-li");
        li.innerHTML = item.name;
        //var btn = downloadJustFileDBX('/' + item.name);
        filesContainer.appendChild(li);
        downloadFileDBX('/' + item.name, function(){
            submitUI.style.visibility = 'visible';
        })
        var parameter = {drive:'DROPBOX', path: '/' + item.name}; 
        submitUI.setAttribute("class", 'dbx-file-download');
        var submitUItext = document.createTextNode("????????????");
        submitUI.type = "submit";
    
        submitUI.onclick = tempDownFile.bind(parameter);
        submitUI.appendChild(submitUItext);
        li.appendChild(submitUI);
        

        // var btn = document.createElement('a');
        // btn.href = downloadJustFileDBX('/' + item.name);
        
        
    });
}

function showPageSection(elementId) {
    document.getElementById(elementId).style.display = 'block';
}

function hidePageSection(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

function listFiles() {
    dbx.filesListFolder({ path: (dropboxPath === "/") ? "" : dropboxPath })
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
}
else {
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
    var path = path + folder;
    listFiles(dbx, path);
}

// Upload Script start
function uploadFileDBX(filePath, DBXfile, callback = null) {
    const UPLOAD_FILE_SIZE_LIMIT = 150 * 1024 * 1024;
    // var fileInput = document.getElementById('file-upload');
    var file = DBXfile;

    if (file.size < UPLOAD_FILE_SIZE_LIMIT) { // File is smaller than 150 Mb - use filesUpload API
        dbx.filesUpload({ path: filePath + file.name, contents: file, mode: 'overwrite' })
            .then(function (response) {
                console.log(response);
                if (callback) {
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
            // var results = document.getElementById('results');
            // results.appendChild(document.createTextNode('File uploaded!'));
            if (callback) {
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

function downloadJustFileDBX(filepath, callback) {
    // var FILE_PATH = document.getElementById('file-path').value;
    var content;
    var element = document.createElement('a');
    dbx = new Dropbox.Dropbox({ accessToken: DBX_ACCESS_TOKEN });
    var isFolder = true;
    console.log(filepath);

    dbx.filesDownload({ path: filepath })
        .then(function (response) {
            isFolder = false;
            console.log(response);
            callback(isFolder);

        }).catch(function (error) { })
    return element;
}