/*
 * This file is a part of "NMIG" - the database migration tool.
 *
 * Copyright (C) 2016 - present, Anatoly Khaytovich <anatolyuss@gmail.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program (please see the "LICENSE.md" file).
 * If not, see <http://www.gnu.org/licenses/gpl.txt>.
 *
 * @author Anatoly Khaytovich <anatolyuss@gmail.com>
 */
import Conversion from './Conversion';
import DBAccess from './DBAccess';
import DBAccessQueryResult from './DBAccessQueryResult';
import DBVendors from './DBVendors';
import IDBAccessQueryParams from './IDBAccessQueryParams';
import { getStateLogsTableName } from './MigrationStateManager';

/**
 * Checks correctness of connection details of both MySQL and PostgreSQL.
 */
export async function checkConnection(conversion: Conversion): Promise<string> {
    let resultMessage: string = '';
    const params: IDBAccessQueryParams = {
        conversion: conversion,
        caller: 'BootProcessor::checkConnection',
        sql: 'SELECT 1;',
        vendor: DBVendors.MYSQL,
        processExitOnError: false,
        shouldReturnClient: false
    };

    const mySqlResult: DBAccessQueryResult = await DBAccess.query(params);
    resultMessage += mySqlResult.error ? `\tMySQL connection error: ${ JSON.stringify(mySqlResult.error) }\n` : '';

    params.vendor = DBVendors.PG;
    const pgResult: DBAccessQueryResult = await DBAccess.query(params);
    resultMessage += pgResult.error ? `\tPostgreSQL connection error: ${ JSON.stringify(pgResult.error) }` : '';
    return resultMessage;
}

/**
 * Returns Nmig's logo.
 */
export function getLogo(): string {
    return '\n\t/\\_  |\\  /\\/\\ /\\___'
        + '\n\t|  \\ | |\\ | | | __'
        + '\n\t| |\\\\| || | | | \\_ \\'
        + '\n\t| | \\| || | | |__/ |'
        + '\n\t\\|   \\/ /_|/______/'
        + '\n\n\tNMIG - the database migration tool'
        + '\n\tCopyright (C) 2016 - present, Anatoly Khaytovich <anatolyuss@gmail.com>\n\n'
        + '\t--[boot] Configuration has been just loaded.';
}

/**
 * Boots the migration.
 */
export function boot(conversion: Conversion): Promise<Conversion> {
    return new Promise<Conversion>(async resolve => {
        const connectionErrorMessage = await checkConnection(conversion);
        const logo: string = getLogo();

        if (connectionErrorMessage) {
            console.log(`${ logo } \n ${ connectionErrorMessage }`);
            process.exit(1);
        }

        const sql: string = `SELECT EXISTS(SELECT 1 FROM information_schema.tables`
            + ` WHERE table_schema = '${ conversion._schema }' AND table_name = '${ getStateLogsTableName(conversion, true) }');`;

        const params: IDBAccessQueryParams = {
            conversion: conversion,
            caller: 'BootProcessor::boot',
            sql: sql,
            vendor: DBVendors.PG,
            processExitOnError: true,
            shouldReturnClient: false
        };

        const result: DBAccessQueryResult = await DBAccess.query(params);
        const isExists: boolean = !!result.data.rows[0].exists;
        const message: string = `${ (isExists
            ? '\n\t--[boot] NMIG is ready to restart after some failure.\n\t--[boot] Consider checking log files at the end of migration.'
            : '\n\t--[boot] NMIG is ready to start.') } \n\t--[boot] Proceed? [Y/n]`;

        console.log(logo + message);

        process
            .stdin
            .resume()
            .setEncoding(conversion._encoding)
            .on('data', (stdin: string) => {
                const trimedStdin: string = stdin.trim();

                if (trimedStdin === 'n' || trimedStdin === 'N') {
                    console.log('\t--[boot] Migration aborted.\n');
                    process.exit(0);
                }

                if (trimedStdin === 'y' || trimedStdin === 'Y') {
                    return resolve(conversion);
                }

                const hint: string = `\t--[boot] Unexpected input ${ trimedStdin }\n\t--[boot] Expected input is upper case Y\n\t--[boot] or lower case n\n${ message }`;
                console.log(hint);
            });
    });
}
