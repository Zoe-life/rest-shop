const mammoth = require('mammoth');
const fs = require('fs');

async function readDocx(filePath) {
    try {
        const result = await mammoth.extractRawText({ path: filePath });
        console.log(result.value);
        if (result.messages.length > 0) {
            console.error('\n\n--- Conversion Messages ---');
            console.error(result.messages);
        }
    } catch (error) {
        console.error('Error reading DOCX:', error);
    }
}

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node read_docx.js <path-to-docx>');
    process.exit(1);
}

readDocx(filePath);
