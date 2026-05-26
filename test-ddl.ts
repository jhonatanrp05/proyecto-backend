import { Parser } from 'node-sql-parser';

const parser = new Parser();
const ddl = `
CREATE TABLE customers (id INT PRIMARY KEY, name VARCHAR(100), registration_date DATE); 
CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT, total DECIMAL, order_date DATE);
CREATE INDEX idx_name ON customers(name);
`;

try {
  const ast = parser.astify(ddl, { database: 'postgresql' });
  console.log(JSON.stringify(ast, null, 2));
} catch (e: any) {
  console.log('Error parsing DDL:', e.message);
}
