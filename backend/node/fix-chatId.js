require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({ chatId: { $exists: false } }).toArray();
  for (let u of users) {
    const newId = crypto.randomBytes(4).toString('hex');
    await db.collection('users').updateOne({ _id: u._id }, { $set: { chatId: newId } });
    console.log(`Assigned chatId ${newId} to user ${u.email}`);
  }
  
  const nullUsers = await db.collection('users').find({ chatId: null }).toArray();
  for (let u of nullUsers) {
    const newId = crypto.randomBytes(4).toString('hex');
    await db.collection('users').updateOne({ _id: u._id }, { $set: { chatId: newId } });
    console.log(`Assigned chatId ${newId} to user ${u.email}`);
  }

  console.log('Done');
  mongoose.disconnect();
}
run();
