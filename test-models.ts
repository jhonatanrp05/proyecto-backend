import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const key = process.env.GEMINI_API_KEY;
  console.log('KEY length:', key?.length, 'Starts with:', key?.substring(0, 5));
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
main();
