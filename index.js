// Importing required Libraries
const fs = require('fs');
const csv = require('@fast-csv/parse');

// Array Holding parsed data from mempool.csv in the form of array
let allTransactions = [];

// parsing function
csv.parseFile('mempool.csv', {headers: false, skipLines: 1})
    .on('data', row => {
        // Add all parent tranactions inside the array
        const parentTransactions = row[3].split(';');
        //ratio for sorting 
        const feeToWeightRatio = Number(row[1] / row[2]);
        //pushing the parsed transaction into parsed array 
        const currentTransaction = [feeToWeightRatio, row[0], Number(row[1]), Number(row[2]), parentTransactions];
        allTransactions.push(currentTransaction);  
    })
    .on('end', () => {
        //sorting on the basis of ratio
        allTransactions = allTransactions.sort(function (firstTransaction, secondTransaction) {
             // if the ratio is same, the one having smaller parent_txn size should come before
            // as the chance of encountering a pending transaction there is less
            if(firstTransaction[0] === secondTransaction[0]) {
                return firstTransaction[4].size - secondTransaction[4].size;
            }

            return secondTransaction[0] - firstTransaction[0];
        });
        
        //writting into file
        let writeStream = fs.createWriteStream('block.txt');
        
        //to track the current weight so that it won't exceed
        let currentWeight = 0, totalFees = 0, inputEntries = 0;

        //store all processed transactions
        let processCompleted = {};
        
        //checking the transaction to be valid or not
        allTransactions.forEach((row) => {
            // skip if this txn weight exceeds the limit
            if(currentWeight + row[3] > 4e6) {
                return;
            }
            
            // bool to check if all parents have been validated
            let allParentsDone = 1;

            // if parent_txn present
            if(row[4].size > 0) {
                row[4].forEach((txn_id) => {
                    // if a parent is not validated, mark the bool as false
                    if(!processCompleted.hasOwnProperty(txn_id)) {
                        allParentsDone = 0;
                        return;
                    }
                })
            }
            // if any one of the parent txn is incomplete, skip it
            if(!allParentsDone) {
                return;
            }
            
            // store this txn as processed
            processCompleted[row[1]] = 1;

            // tracking overall sum of transactions
            currentWeight += row[3];
            totalFees += row[2];
            inputEntries += 1;
            
            // output the processed txn_id to block file
            writeStream.write(`${row[1]}\n`);
            
        });
        //Close stream
        writeStream.end();
    });


