const fs = require('fs');
const csv = require('@fast-csv/parse');

let allTransactions = [];

csv.parseFile('mempool.csv', {headers: false, skipLines: 1})
    .on('data', row => {
        const parentTransactions = row[3].split(';');

        const feeToWeightRatio = Number(row[1] / row[2]);
        
        const currentTransaction = [feeToWeightRatio, row[0], Number(row[1]), Number(row[2]), parentTransactions];
        allTransactions.push(currentTransaction);  
    })
    .on('end', () => {
        allTransactions = allTransactions.sort(function (firstTransaction, secondTransaction) {
            if(firstTransaction[0] === secondTransaction[0]) {
                return firstTransaction[4].size - secondTransaction[4].size;
            }

            return secondTransaction[0] - firstTransaction[0];
        });
        
        let writeStream = fs.createWriteStream('block.txt');
        
        let currentWeight = 0, totalFees = 0, inputEntries = 0;

        let processCompleted = {};
        
        allTransactions.forEach((row) => {
            if(currentWeight + row[3] > 4e6) {
                return;
            }
            
            let allParentsDone = 1;

            if(row[4].size > 0) {
                row[4].forEach((txn_id) => {
                    if(!processCompleted.hasOwnProperty(txn_id)) {
                        allParentsDone = 0;
                        return;
                    }
                })
            }
            
            if(!allParentsDone) {
                return;
            }
            
            processCompleted[row[1]] = 1;

            currentWeight += row[3];
            totalFees += row[2];
            inputEntries += 1;
            
            writeStream.write(`${row[1]}\n`);
            
        });
        writeStream.end();
    });


