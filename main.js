/* 
 * This file is a part of "NMIG" - the database migration tool.
 * 
 * Copyright 2015 Anatoly Khaytovich <anatolyuss@gmail.com>
 * 
 * @author Anatoly Khaytovich <anatolyuss@gmail.com>  
 */
'use strict';
var fs   = require('fs');
var fmtp = require('./migration/fmtp/FromMySQL2PostgreSQL');
var nmig = new fmtp.FromMySQL2PostgreSQL();

fs.readFile(__dirname + '/config.json', function(error, data) {
    if (error) {
        console.log('\n\t--Cannot run migration\nCannot read configuration info from ' + __dirname + '/config.json');
    } else {
        try {
            var config              = JSON.parse(data.toString());
            config.tempDirPath      = __dirname + '/temporary_directory';
            config.logsDirPath      = __dirname + '/logs_directory';
			config.dataTypesMapAddr = __dirname + '/DataTypesMap.json'; 
            nmig.run(config);
        } catch (err) {
            console.log('\n\t--Cannot parse JSON from' + __dirname + '/config.json');
        }
    }
});
