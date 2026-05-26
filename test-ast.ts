import { Parser } from 'node-sql-parser';

const parser = new Parser();
const ast = parser.astify('SELECT * FROM users WHERE id IN (SELECT user_id FROM orders)', { database: 'postgresql' });
console.log(JSON.stringify(ast, null, 2));
