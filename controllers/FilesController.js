import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { writeFile, mkdir, existsSync } from 'fs';
import { promisify } from 'util';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const writeFileAsync = promisify(writeFile);
const mkdirAsync = promisify(mkdir);

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve user based on token
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.usersCollection.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Retrieve request parameters
    const {
      name, type, parentId, isPublic, data,
    } = req.body;

    // Validate request paramenters
    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }

    const acceptedTypes = ['folder', 'file', 'image'];

    if (!type || !acceptedTypes.includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (!data && type !== 'folder') {
      return res.status(400).json({ error: 'Missing type' });
    }

    if (parentId) {
      const existingParentIdFile = await dbClient.filesCollection.findOne(
        { _id: ObjectId(parentId) },
      );
      if (!existingParentIdFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (existingParentIdFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    // Create a new new folder object
    const newFolder = {
      name,
      type,
      parentId: ObjectId(parentId) || 0,
      isPublic: isPublic || false,
      userId: ObjectId(userId),
    };

    if (type === 'folder') {
      const result = await dbClient.filesCollection.insertOne(newFolder);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic: isPublic || false,
        parentId: parentId || 0,
      });
    }

    const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileDataBase64 = Buffer.from(data, 'base64');
    const fileName = uuidv4();
    const filePath = path.join(FOLDER_PATH, fileName);

    try {
      if (!existsSync(FOLDER_PATH)) {
        // The recursive option ensures that the directory and
      //   necessary parent directories are created recursively
        await mkdirAsync(FOLDER_PATH, { recursive: true });
      }
      await writeFileAsync(filePath, fileDataBase64);
    } catch (error) {
      console.log(error.message);
    }

    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: ObjectId(parentId) || 0,
      localPath: filePath,
    };

    const result = await dbClient.filesCollection.insertOne(newFile);
    const fileId = result.insertedId;
    return res.status(201).json({
      id: fileId,
      userId,
      name,
      isPublic: isPublic || false,
      parentId: parentId || 0,
    });
  }
}
