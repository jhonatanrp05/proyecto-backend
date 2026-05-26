import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const data = await res.json();
  const models = data.models.map((m: any) => m.name);
  console.log(models);
}
main();
