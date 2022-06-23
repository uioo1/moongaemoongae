const { google } = require('googleapis'); //npm install googleapis@39 --save
import google from 'googleapis';
const path = require('path');

import google from 'googleapis';
const fs = require('fs');

import fs from 'googleapis';

const mime = require('node-mime-types');//npm install 했는지 기억이 안남
const { getMIMEType } = require('node-mime-types');
const { Readable } = require('stream');

const arrayBufferToBuffer = require('arraybuffer-to-buffer');//npm install arraybuffer-to-buffer
const readline = require('readline');

var oAuth2Client = null;
var drive = null
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Drive API.
    authorize(JSON.parse(content), testgoogle);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
    const { client_secret, client_id, redirect_uris } = credentials.web;
    oAuth2Client = new google.auth.OAuth2(
        client_id, client_secret, redirect_uris[1]);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        console.log.apply(oAuth2Client);
        callback(oAuth2Client);
    });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth, callback) {
    const authUrl = oAuth.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);
            oAuth.setCredentials(token);
            // Store the token to disk for later program executions
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth);
        });
    });
}

//function to upload the file in folder
async function uploadToFloderGD(path, buffer, filename) {
    //folder search 후 folderId 반환
    var folderID;
    const foldersearch = await drive.files.list({
        q: `name = "${path}" and mimeType = "application/vnd.google-apps.folder" and trashed = false`
    })

    if (foldersearch.data.files.length === 0) {
        const folder = drive.files.create({
            requestBody: {
                name: path,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        })
        folderID = (await folder).data.id;
    }
    else {
        var folderId
        foldersearch.data.files.forEach(function (file) {
            folderId = file.id;
        });
        folderID = folderId;
    }
    //arraybuffer -> buffer
    var buf = arrayBufferToBuffer(buffer);

    //파일 중복 검사
    const filesearch = await drive.files.list({
        q: `name = "${filename}" and trashed = false`
    });
    if (filesearch.data.files.length === 0) {
        try {
            const response = await drive.files.create({
                requestBody: {
                    name: filename, //file name
                    mimeType: getMIMEType(filename),
                    parents: [folderID],
                },
                media: {
                    mimeType: getMIMEType(filename),
                    //buffer -> stream
                    body: bufferToStream(buf)
                },
            });
            console.log(response.data);
        } catch (error) {
            console.log(error.message);
        }
    }
    else {
        var fileId
        filesearch.data.files.forEach(function (file) {
            fileId = file.id;
        });
        const updatefile = await drive.files.update({
            fileId: fileId,
            addParents: folderID,
            requestBody: {
                name: filename,
            },
            media: {
                mimeType: getMIMEType(filename),
                body: bufferToStream(buf)
            },
        })
    }
}

//upload file in my drive

async function uploadFileGD(buffer, filename) {
    //arraybuffer -> buffer
    var buf = arrayBufferToBuffer(buffer);

    //파일 중복 검사
    const filesearch = await drive.files.list({
        q: `name = "${filename}" and trashed = false`
    });
    if (filesearch.data.files.length === 0) {
        try {
            const response = await drive.files.create({
                requestBody: {
                    name: filename, //file name
                    mimeType: getMIMEType(filename),
                },
                media: {
                    mimeType: getMIMEType(filename),
                    //buffer -> stream
                    body: bufferToStream(buf)
                },
            });
            console.log(response.data);
        } catch (error) {
            console.log(error.message);
        }
    }
    else {
        var fileId
        filesearch.data.files.forEach(function (file) {
            fileId = file.id;
        });
        const updatefile = await drive.files.update({
            fileId: fileId,
            requestBody: {
                name: filename,
            },
            media: {
                mimeType: getMIMEType(filename),
                body: bufferToStream(buf)
            },
        })
    }
}

async function downloadFileGD(named, callback) {

    //get fileid
    const filename = await drive.files.list({
        q: `name = "${named}" and trashed = false`,
        fields: 'files(id, name)',
        spaces: 'drive',
    });
    const fileid = [];
    var fileId;
    Array.prototype.push.apply(fileid, filename.files);
    filename.data.files.forEach(function (file) {
        fileId = file.id;
    });

    //file buffer download
    drive.files.get(
        { fileId: fileId, alt: "media", },
        { responseType: "arraybuffer" },
        (err, { data }) => {
            if (err) {
                console.log(err);
                return;
            }
            let buf = [];
            console.log(data);
            callback(data);

        }
    );
};
function testgoogle() {
    drive = google.drive({
        version: 'v3',
        auth: oAuth2Client,
    });
    downloadFileGD('a.txt', function (str) {
        //uploadFileGD(str,'ccccc.txt'); //내 드라이브에 바로 업로드
        uploadToFloderGD('mgmg', str, 'abc.txt');//mgmg폴더에 업로드
    })
}

//buffer -> stream
function bufferToStream(binary) {

    const readableInstanceStream = new Readable({
        read() {
            this.push(binary);
            this.push(null);
        }
    });

    return readableInstanceStream;
}