import crypto from 'crypto';
import dbClient from '../utils/db';

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    let user = null;

    try {
      user = await dbClient.usersCollection.findOne({ email });
    } catch (error) {
      res.json({ error: error.message });
    }

    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }

    const hashedPassword = crypto
      .createHash('sha1')
      .update(password)
      .digest('hex');

    const newUser = await dbClient.usersCollection.insertOne({ email, password: hashedPassword });
    return res.status(201).json({ id: newUser.insertedId, email });
  }
}
