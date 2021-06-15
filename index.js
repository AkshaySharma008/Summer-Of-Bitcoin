// The following steps were used in the implementation of the code:

// 1. Create an empty transactions array for storing every parsed transaction from the csv. 
// 2. Parse mempool.csv using fast-csv and for every row
//    - Calculate the fee/weigh ratio
//    - Append a new row to the transactions matrix for this transaction having the format 
// 3. Sort the transactions array:
//    - reverse sort on the basis of fee/weight ratio
//    - if two have the same ratio, sort on the basis of the size of the parent transactions array.
// 4. Create a processed object to store transaction ids of all the processed transactions.
// 5. For every transaction in the transactions array, validate it if:
//    - processed weight + transaction weight is lesser than or equal to 4000000
//    - all of the parent transactions have been processed before i.e. their ids are present in the processed object.
// 6. If both the conditions are valid, process this transaction: 
//    - increase the values of the processed weight and the fee 
//    - add this transaction id to the processed object.
//    - append this transaction's id to the block.txt file.
//    - increase the count of processed transactions
// 7. Log the total processed weight, fee earned and the number of transactions processed.


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


